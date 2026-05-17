import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), "wifi_guardian.db");

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Initialize DB schemas
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      frame INTEGER,
      signal INTEGER,
      baseline REAL,
      motion INTEGER,
      severity TEXT,
      rssi INTEGER,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      confidence REAL,
      status TEXT,
      x REAL,
      y REAL,
      heartRate INTEGER,
      breathingRate INTEGER,
      hrv INTEGER,
      temp REAL,
      spo2 INTEGER,
      sleepStage TEXT,
      age INTEGER,
      gaitSpeed REAL,
      bodyDensity REAL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      time TEXT,
      msg TEXT,
      type TEXT,
      timestamp INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS occupants (
      id TEXT PRIMARY KEY,
      name TEXT,
      relationship TEXT,
      contactInfo TEXT,
      gender TEXT,
      healthStatus TEXT,
      age INTEGER,
      targetBpm INTEGER,
      notes TEXT,
      lastDetected INTEGER
    );
  `);

  // Seed default occupants if table is empty
  const count = await dbInstance.get("SELECT COUNT(*) as count FROM occupants");
  if (count.count === 0) {
    await dbInstance.run(
      `INSERT INTO occupants (id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes, lastDetected) VALUES
       ('target-1', 'User 123 (Sachin)', 'Family', 'sachin@wifi.guardian', 'Male', 'Excellent Vitals', 28, 72, 'Primary Admin & System Owner', 0),
       ('target-2', 'User 124 (Jane)', 'Family', 'jane@wifi.guardian', 'Female', 'Normal Vitals', 26, 68, 'Monitored for deep sleep analysis', 0),
       ('target-3', 'User 125 (Alice)', 'Relative', 'alice@hospital.net', 'Female', 'Heart Monitored', 64, 75, 'Elderly Care Routine - high HRV tracking', 0),
       ('target-4', 'User 126 (Bob)', 'Friend', 'bob@contractor.com', 'Male', 'Normal Vitals', 35, 70, 'IT technician, local mesh trusted node', 0),
       ('target-5', 'User 127 (Unknown)', 'Visitor', 'N/A', 'Unspecified', 'Suspicious Doppler', 0, 80, 'Temporary Visitor - alert on perimeter breach', 0)`
    );
    console.log("💾 [Database] Occupants reference table seeded with systematic Users, Gender, and Vitals.");
  }

  console.log("💾 [Database] SQLite DB initialized successfully at", dbPath);
  return dbInstance;
}

export async function saveTelemetry(telemetry) {
  try {
    const db = await getDB();
    await db.run(
      `INSERT INTO telemetry (frame, signal, baseline, motion, severity, rssi, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        telemetry.frame,
        telemetry.signal,
        telemetry.baseline,
        telemetry.motion ? 1 : 0,
        telemetry.severity,
        telemetry.rssi,
        telemetry.timestamp || Date.now(),
      ]
    );
  } catch (error) {
    console.error("❌ [Database] Failed to save telemetry:", error);
  }
}

export async function saveEntities(entities) {
  try {
    const db = await getDB();
    const timestamp = Date.now();
    for (const entity of entities) {
      await db.run(
        `INSERT OR REPLACE INTO entities 
        (id, name, type, confidence, status, x, y, heartRate, breathingRate, hrv, temp, spo2, sleepStage, age, gaitSpeed, bodyDensity, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entity.id,
          entity.name,
          entity.type,
          entity.confidence,
          entity.status,
          entity.x,
          entity.y,
          entity.vitals?.heartRate || 0,
          entity.vitals?.breathingRate || 0,
          entity.vitals?.hrv || 0,
          entity.vitals?.temp || 0,
          entity.vitals?.spo2 || 0,
          entity.vitals?.sleepStage || null,
          entity.biometrics?.age || 0,
          entity.biometrics?.gaitSpeed || 0,
          entity.biometrics?.bodyDensity || 0,
          timestamp
        ]
      );
    }
  } catch (error) {
    console.error("❌ [Database] Failed to save entities:", error);
  }
}

export async function saveEvent(event) {
  try {
    const db = await getDB();
    await db.run(
      `INSERT OR REPLACE INTO events (id, time, msg, type, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [
        event.id || String(Date.now() + Math.random()),
        event.time,
        event.msg,
        event.type,
        Date.now()
      ]
    );
  } catch (error) {
    console.error("❌ [Database] Failed to save event:", error);
  }
}

export async function getHistoricalTelemetry(limit = 100) {
  try {
    const db = await getDB();
    return await db.all("SELECT * FROM telemetry ORDER BY id DESC LIMIT ?", [limit]);
  } catch (error) {
    console.error("❌ [Database] Failed to query historical telemetry:", error);
    return [];
  }
}

export async function getHistoricalEntities(type = null) {
  try {
    const db = await getDB();
    if (type) {
      return await db.all("SELECT * FROM entities WHERE type = ? ORDER BY timestamp DESC", [type]);
    }
    return await db.all("SELECT * FROM entities ORDER BY timestamp DESC");
  } catch (error) {
    console.error("❌ [Database] Failed to query historical entities:", error);
    return [];
  }
}

export async function getOccupants() {
  try {
    const db = await getDB();
    return await db.all("SELECT * FROM occupants ORDER BY relationship ASC, name ASC");
  } catch (error) {
    console.error("❌ [Database] Failed to get occupants:", error);
    return [];
  }
}

export async function updateOccupant(id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes) {
  try {
    const db = await getDB();
    await db.run(
      `INSERT OR REPLACE INTO occupants (id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes, lastDetected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT lastDetected FROM occupants WHERE id = ?), 0))`,
      [id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes, id]
    );
    console.log(`💾 [Database] Occupant ${id} updated: ${name} (${relationship}) - Gender: ${gender}`);
    return true;
  } catch (error) {
    console.error("❌ [Database] Failed to update occupant:", error);
    return false;
  }
}
