import { NextResponse } from "next/server";
import { getDb as getRuviewDb } from "@/app/sensing/db";
import { getDB as getWifiGuardianDb } from "@/src/lib/db";

async function safeCount(db, table, column = "*") {
    try {
        const row = await db.get(`SELECT COUNT(${column}) as count FROM ${table}`);
        return typeof row?.count === "number" ? row.count : 0;
    } catch {
        return 0;
    }
}

export async function GET() {
    const result = {
        success: true,
        timestamp: Date.now(),
        ruview: {
            telemetry: 0,
            vitals: 0,
            entities: 0,
            security_events: 0,
            mqtt_logs: 0,
        },
        wifiGuardian: {
            telemetry: 0,
            entities: 0,
            events: 0,
            occupants: 0,
            vital_snapshots: 0,
            daily_health_summary: 0,
            health_alerts: 0,
            activity_log: 0,
        },
        errors: {},
    };

    try {
        const ruviewDb = await getRuviewDb();
        result.ruview.telemetry = await safeCount(ruviewDb, "telemetry");
        result.ruview.vitals = await safeCount(ruviewDb, "vitals");
        result.ruview.entities = await safeCount(ruviewDb, "entities");
        result.ruview.security_events = await safeCount(ruviewDb, "security_events");
        result.ruview.mqtt_logs = await safeCount(ruviewDb, "mqtt_logs");
    } catch (error) {
        result.success = false;
        result.errors.ruview = error?.message || String(error);
    }

    try {
        const wifiDb = await getWifiGuardianDb();
        result.wifiGuardian.telemetry = await safeCount(wifiDb, "telemetry");
        result.wifiGuardian.entities = await safeCount(wifiDb, "entities");
        result.wifiGuardian.events = await safeCount(wifiDb, "events");
        result.wifiGuardian.occupants = await safeCount(wifiDb, "occupants");
        result.wifiGuardian.vital_snapshots = await safeCount(wifiDb, "vital_snapshots");
        result.wifiGuardian.daily_health_summary = await safeCount(wifiDb, "daily_health_summary");
        result.wifiGuardian.health_alerts = await safeCount(wifiDb, "health_alerts");
        result.wifiGuardian.activity_log = await safeCount(wifiDb, "activity_log");
    } catch (error) {
        result.success = false;
        result.errors.wifiGuardian = error?.message || String(error);
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

