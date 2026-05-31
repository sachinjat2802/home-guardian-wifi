import { NextResponse } from "next/server";
import crypto from "crypto";
import WebSocket from "ws";
import { getDB, saveEntities } from "@/src/lib/db";

// SHA-256 HMAC Secret Key for signature validation (Must match python backend configuration)
const WEBHOOK_SECRET = process.env.WEBHOOK_SIGNING_SECRET || "super-secret-hmac-key";
const WS_URL = "ws://localhost:8080";

export async function POST(request) {
  try {
    // 1. Capture and parse the raw body to maintain exact signature validation
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature-256");

    if (!signatureHeader) {
      console.warn("⚠️ [Gait Callback] Rejected webhook request: Missing x-hub-signature-256 header.");
      return NextResponse.json({ error: "Missing signature header" }, { status: 401 });
    }

    // 2. Validate cryptographic signature
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
      console.warn("❌ [Gait Callback] Webhook validation failed: Cryptographic signature mismatch.");
      return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 401 });
    }

    // 3. Process the payload
    const payload = JSON.parse(rawBody);
    console.log(`📦 [Gait Callback] Authenticated Webhook Payload:`, payload);

    if (payload.event === "presence_transition") {
      const { user_id, name, confidence, current_state } = payload.data;

      // 4. Update the SQLite DB (wifi_guardian.db) to ensure state persistence
      const db = await getDB();
      const now = Date.now();

      // Log occupant presence status persistent inside database
      await db.run(
        `UPDATE occupants SET lastDetected = ? WHERE id = ?`,
        [now, user_id]
      );

      // Save entity state
      const entity = {
        id: user_id,
        name: name,
        type: "person",
        confidence: confidence,
        status: current_state === "present" ? "active" : "absent",
        x: 50,
        y: 50,
        vitals: { heartRate: 72, breathingRate: 14, hrv: 55, temp: 36.6, spo2: 98, sleepStage: null },
        biometrics: { age: 28, gaitSpeed: 1.1, bodyDensity: 1.05, classification: "Biometric Gait Enrolled" }
      };
      
      await saveEntities([entity]);

      // 5. Establish WebSocket relay connection to Next.js background sensing engine
      // This forces the dashboard to reflect biometrics immediately
      await relayToSensingServer({
        type: "gait_presence_update",
        user_id,
        name,
        confidence,
        status: current_state
      });

      console.log(`🎉 [Gait Callback] Successfully integrated user presence trigger for: ${name} (${user_id})`);
    }

    return NextResponse.json({ success: true, message: "Webhook processed and relayed successfully" });
  } catch (err) {
    console.error("❌ [Gait Callback] Error processing callback trigger:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Connects briefly to the sensing engine's WebSocket server and dispatches
 * the gait recognition trigger.
 */
function relayToSensingServer(message) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        ws.close();
        resolve();
      }
    };

    ws.on("open", () => {
      ws.send(JSON.stringify(message));
      // Give a tiny window to ensure the socket buffer flushes before closing
      setTimeout(finish, 100);
    });

    ws.on("error", (err) => {
      console.warn("⚠️ [Gait Callback] Sensing WebSocket server is offline; could not relay live update:", err.message);
      finish();
    });

    // Timeout fallback protection
    setTimeout(finish, 1500);
  });
}
