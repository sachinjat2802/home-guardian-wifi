import { NextResponse } from 'next/server';
import { getDb } from '@/app/sensing/db';

export async function DELETE() {
  try {
    const db = await getDb();
    await db.exec(`
      DELETE FROM telemetry;
      DELETE FROM vitals;
      DELETE FROM entities;
      DELETE FROM security_events;
      DELETE FROM mqtt_logs;
    `);
    return NextResponse.json({ success: true, message: 'Database cleared' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
