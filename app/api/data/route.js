import { NextResponse } from 'next/server';
import { getDb } from '@/app/sensing/db';
import { getDB as getWifiGuardianDb } from '@/src/lib/db';

export async function DELETE() {
  try {
    // 1) Clear RuView/local ruview.db (used by app/sensing/db.js)
    const ruviewDb = await getDb();
    await ruviewDb.exec(`
      DELETE FROM telemetry;
      DELETE FROM vitals;
      DELETE FROM entities;
      DELETE FROM security_events;
      DELETE FROM mqtt_logs;
    `);

    // 2) Clear wifi_guardian.db (used by src/lib/db.js + src/lib/analytics.js)
    const wifiDb = await getWifiGuardianDb();

    // Core tables
    await wifiDb.exec(`
      DELETE FROM telemetry;
      DELETE FROM entities;
      DELETE FROM events;
      DELETE FROM occupants;
    `);

    // Analytics tables (safe even if they don't exist)
    await wifiDb.exec(`
      BEGIN;

      -- vital_snapshots
      DELETE FROM vital_snapshots;

      -- daily health rollups
      DELETE FROM daily_health_summary;

      -- health alerts
      DELETE FROM health_alerts;

      -- activity log
      DELETE FROM activity_log;

      COMMIT;
    `).catch(() => {
      // Some tables might not exist yet; ignore to keep clear operation resilient.
    });

    return NextResponse.json({ success: true, message: 'Databases cleared (ruview.db + wifi_guardian.db)' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

