import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance = null;

function looksLikeSqliteCorruption(err) {
  const msg = err?.message ? String(err.message) : String(err);
  return /SQLITE_CORRUPT|malformed|database disk image is malformed/i.test(msg);
}

function safeRenameCorruptFile(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const corruptPath = `${dbPath}.corrupt-${ts}`;
    fs.renameSync(dbPath, corruptPath);
    console.warn(`⚠️ [Database] Renamed corrupted DB: ${dbPath} -> ${corruptPath}`);
  } catch (e) {
    console.warn('⚠️ [Database] Failed to rename corrupted DB file:', e?.message || String(e));
  }
}

async function openDbWithRecovery(dbPath) {
  try {
    return await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (err) {
    if (looksLikeSqliteCorruption(err)) {
      safeRenameCorruptFile(dbPath);
      return await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
    }
    throw err;
  }
}

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(process.cwd(), 'ruview.db');

  dbInstance = await openDbWithRecovery(dbPath);


  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      frame INTEGER,
      signal REAL,
      baseline REAL,
      motion BOOLEAN,
      severity TEXT,
      mode TEXT,
      rssi REAL
    );

    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      entity_id TEXT,
      name TEXT,
      type TEXT,
      confidence REAL,
      heart_rate REAL,
      breathing_rate REAL,
      hrv REAL,
      temp REAL,
      spo2 REAL,
      sleep_stage TEXT,
      age INTEGER,
      gait_speed REAL,
      body_density REAL,
      status TEXT,
      x REAL,
      y REAL
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      presence BOOLEAN,
      presence_score REAL,
      motion_energy REAL,
      breathing_rate REAL,
      heart_rate REAL,
      hrv REAL,
      temp REAL,
      spo2 REAL,
      n_persons INTEGER,
      fall BOOLEAN
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      armed BOOLEAN,
      triggered BOOLEAN,
      reason TEXT,
      preset TEXT
    );

    CREATE TABLE IF NOT EXISTS mqtt_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      topic TEXT,
      payload TEXT
    );
  `);

  return dbInstance;
}

export async function insertTelemetry(data) {
  const db = await getDb();
  await db.run(
    `INSERT INTO telemetry (timestamp, frame, signal, baseline, motion, severity, mode, rssi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.timestamp, data.frame, data.signal, data.baseline, data.motion ? 1 : 0, data.severity, data.mode, data.rssi]
  );
}

export async function insertEntities(timestamp, entities) {
  const db = await getDb();
  const stmt = await db.prepare(
    `INSERT INTO entities (timestamp, entity_id, name, type, confidence, heart_rate, breathing_rate, hrv, temp, spo2, sleep_stage, age, gait_speed, body_density, status, x, y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const entity of entities) {
    await stmt.run([
      timestamp,
      entity.id,
      entity.name,
      entity.type,
      entity.confidence,
      entity.vitals?.heartRate || 0,
      entity.vitals?.breathingRate || 0,
      entity.vitals?.hrv || 0,
      entity.vitals?.temp || 0,
      entity.vitals?.spo2 || 0,
      entity.vitals?.sleepStage || null,
      entity.biometrics?.age || 0,
      entity.biometrics?.gaitSpeed || 0,
      entity.biometrics?.bodyDensity || 0,
      entity.status,
      entity.x || 0,
      entity.y || 0
    ]);
  }
  await stmt.finalize();
}

export async function insertVitals(timestamp, vitals) {
  const db = await getDb();
  await db.run(
    `INSERT INTO vitals (timestamp, presence, presence_score, motion_energy, breathing_rate, heart_rate, hrv, temp, spo2, n_persons, fall) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      timestamp,
      vitals.presence ? 1 : 0,
      vitals.presenceScore,
      vitals.motionEnergy,
      vitals.breathingRate,
      vitals.heartRate,
      vitals.hrv,
      vitals.temp,
      vitals.spo2,
      vitals.nPersons,
      vitals.fall ? 1 : 0
    ]
  );
}

export async function insertSecurityEvent(timestamp, security) {
  const db = await getDb();
  await db.run(
    `INSERT INTO security_events (timestamp, armed, triggered, reason, preset) VALUES (?, ?, ?, ?, ?)`,
    [timestamp, security.armed ? 1 : 0, security.triggered ? 1 : 0, security.reason || '', security.preset || '']
  );
}

export async function insertMqttLog(timestamp, topic, payload) {
  const db = await getDb();
  await db.run(
    `INSERT INTO mqtt_logs (timestamp, topic, payload) VALUES (?, ?, ?)`,
    [timestamp, topic, payload]
  );
}
