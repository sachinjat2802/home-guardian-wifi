import { NextResponse } from "next/server";
import { getDb as getRuviewDb } from "@/app/sensing/db";
import { getDB as getWifiGuardianDb } from "@/src/lib/db";

function normalizeScope(scope) {
    const s = (scope || "").toLowerCase();
    if (s === "ruview" || s === "local" || s === "local-ruview") return "ruview";
    if (s === "wifi" || s === "wifi-guardian" || s === "wifi_guardian") return "wifi";
    return "all";
}

async function clearRuview(ruviewDb) {
    await ruviewDb.exec(`
    DELETE FROM telemetry;
    DELETE FROM vitals;
    DELETE FROM entities;
    DELETE FROM security_events;
    DELETE FROM mqtt_logs;
  `);
}

async function clearWifiGuardian(wifiDb) {
    await wifiDb.exec(`
    DELETE FROM telemetry;
    DELETE FROM entities;
    DELETE FROM events;
    DELETE FROM occupants;
  `);

    // Analytics tables (safe if they don't exist yet; ignore failures)
    await wifiDb.exec(`
    BEGIN;
    DELETE FROM vital_snapshots;
    DELETE FROM daily_health_summary;
    DELETE FROM health_alerts;
    DELETE FROM activity_log;
    COMMIT;
  `).catch(() => { });
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const scope = normalizeScope(body?.scope);

        const ruviewDb = scope === "ruview" || scope === "all" ? await getRuviewDb() : null;
        const wifiDb = scope === "wifi" || scope === "all" ? await getWifiGuardianDb() : null;

        if (scope === "ruview" || scope === "all") {
            await clearRuview(ruviewDb);
        }
        if (scope === "wifi" || scope === "all") {
            await clearWifiGuardian(wifiDb);
        }

        return NextResponse.json({
            success: true,
            message: `Cleared database scope: ${scope}`,
            scope,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error?.message || String(error) },
            { status: 500 }
        );
    }
}
