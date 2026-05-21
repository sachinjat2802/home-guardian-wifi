import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

let dbInstance = global.dbInstance || null;

// Cross-module write lock to avoid concurrent writes causing DB corruption.
let dbWriteLockPromise = Promise.resolve();

function looksLikeSqliteCorruption(err) {
  const msg = err?.message ? String(err.message) : String(err);
  return /SQLITE_CORRUPT|malformed|database disk image is malformed/i.test(msg);
}

function safeRenameCorruptFile(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const corruptPath = `${dbPath}.corrupt-${ts}`;
    try {
      fs.renameSync(dbPath, corruptPath);
      console.warn(`⚠️ [Database] Renamed corrupted DB: ${dbPath} -> ${corruptPath}`);
    } catch (renameErr) {
      // Truncate the file to zero bytes if standard renameSync fails due to active file locks.
      fs.writeFileSync(dbPath, "");
      console.warn(`⚠️ [Database] Rename failed; truncated corrupted DB file to 0 bytes instead: ${dbPath}`);
    }

    // ALWAYS clean up associated WAL and SHM log files to prevent old logs from corrupting the new db
    try {
      if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
      if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
      console.warn(`⚠️ [Database] Cleaned up associated WAL/SHM locks.`);
    } catch (e) {}
  } catch (e) {
    console.warn("⚠️ [Database] Failed to recover/rename corrupted DB file:", e?.message || String(e));
  }
}

async function openDbWithRecovery(dbPath) {
  // Serialize open recovery as well; if another write already corrupted/renamed,
  // we want this caller to observe the same resulting state.
  return withDbWriteLock(async () => {
    try {
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Proactive integrity checks to flush out malformed page tables
      await db.get("SELECT COUNT(*) FROM sqlite_master;");
      try {
        await db.get("SELECT * FROM telemetry LIMIT 1;");
        await db.get("SELECT * FROM occupants LIMIT 1;");
      } catch (checkErr) {
        if (looksLikeSqliteCorruption(checkErr)) {
          console.warn("⚠️ [Database] Proactive query check detected page level corruption!");
          throw checkErr;
        }
      }

      console.log(`\u001b[36m\u001b[1m[Database] Opened DB:\u001b[0m ${dbPath}`);
      return db;
    } catch (err) {
      if (!looksLikeSqliteCorruption(err)) throw err;

      console.warn(
        `\u001b[33m\u001b[1m[Database] Detected corruption on open/query check:\u001b[0m ${dbPath} - ${err?.message || String(err)}`
      );
      
      safeRenameCorruptFile(dbPath);

      // Clean up auxiliary WAL/SHM locks to avoid locks
      try {
        if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
        if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
      } catch (e) {}

      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      console.log(`\u001b[36m\u001b[1m[Database] Re-opened DB after recovery:\u001b[0m ${dbPath}`);
      return db;
    }
  });
}


export async function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), "wifi_guardian.db");

  // Important: set dbInstance only after successful open.
  const openedDb = await openDbWithRecovery(dbPath);
  dbInstance = openedDb;

  // Enable WAL journal mode and configure a busy timeout.
  try {
    await dbInstance.exec("PRAGMA journal_mode = WAL;");
    await dbInstance.exec("PRAGMA busy_timeout = 5000;");
    await dbInstance.exec("PRAGMA synchronous = NORMAL;");
    await dbInstance.exec("PRAGMA temp_store = MEMORY;");
    await dbInstance.exec("PRAGMA wal_autocheckpoint = 1000;");
  } catch (err) {
    console.warn("⚠️ [Database] Failed to set SQLite pragmas:", err?.message || String(err));
  }

  global.dbInstance = dbInstance;

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

  // Migration: Add missing columns to entities table if they don't exist
  try {
    const columns = await dbInstance.all("PRAGMA table_info(entities)");
    const columnNames = columns.map((c) => c.name);

    const requiredColumns = [
      { name: "sleepStage", type: "TEXT" },
      { name: "age", type: "INTEGER" },
      { name: "gaitSpeed", type: "REAL" },
      { name: "bodyDensity", type: "REAL" },
    ];

    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`💾 [Database] Migrating entities schema: Adding column ${col.name}`);
        await dbInstance.exec(`ALTER TABLE entities ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (migrationError) {
    console.error("❌ [Database] Migration failed for entities table:", migrationError);
  }

  // Migration: Add missing columns to occupants table if they don't exist
  try {
    const occColumns = await dbInstance.all("PRAGMA table_info(occupants)");
    const occColumnNames = occColumns.map((c) => c.name);

    const requiredOccColumns = [
      { name: "gender", type: "TEXT" },
      { name: "healthStatus", type: "TEXT" },
      { name: "age", type: "INTEGER" },
      { name: "targetBpm", type: "INTEGER" },
      { name: "notes", type: "TEXT" },
      { name: "lastDetected", type: "INTEGER" },
      { name: "contactInfo", type: "TEXT" },
    ];

    for (const col of requiredOccColumns) {
      if (!occColumnNames.includes(col.name)) {
        console.log(`💾 [Database] Migrating occupants schema: Adding column ${col.name}`);
        await dbInstance.exec(`ALTER TABLE occupants ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (migrationError) {
    console.error("❌ [Database] Migration failed for occupants table:", migrationError);
  }

  // Seed default occupants if table is empty
  try {
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
  } catch (e) {
    console.error("❌ [Database] Failed seeding occupants:", e);
  }

  console.log("💾 [Database] SQLite DB initialized successfully at", dbPath);
  return dbInstance;
}

function withDbWriteLock(fn) {
  dbWriteLockPromise = dbWriteLockPromise.then(() => fn());
  return dbWriteLockPromise;
}

export async function invalidateAndRecoverDbAfterCorruption(error) {
  if (!looksLikeSqliteCorruption(error)) return false;

  const dbPath = path.resolve(process.cwd(), "wifi_guardian.db");

  try {
    // Drop cached handle so subsequent calls reopen a recovered DB.
    dbInstance = null;
    global.dbInstance = null;

    safeRenameCorruptFile(dbPath);
    console.warn(`\u001b[33m\u001b[1m[Database] Invalidated DB after corruption:\u001b[0m ${dbPath}`);
    return true;
  } catch {
    return true;
  }
}

export async function saveTelemetry(telemetry) {
  return withDbWriteLock(async () => {
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
      if (await invalidateAndRecoverDbAfterCorruption(error)) {
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
        return;
      }
      console.error("❌ [Database] Failed to save telemetry:", error);
    }
  });
}

export async function saveEntities(entities) {
  return withDbWriteLock(async () => {
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
            timestamp,
          ]
        );
      }
    } catch (error) {
      if (await invalidateAndRecoverDbAfterCorruption(error)) {
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
              timestamp,
            ]
          );
        }
        return;
      }
      console.error("❌ [Database] Failed to save entities:", error);
    }
  });
}

export async function saveEvent(event) {
  return withDbWriteLock(async () => {
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
          Date.now(),
        ]
      );
    } catch (error) {
      if (await invalidateAndRecoverDbAfterCorruption(error)) {
        const db = await getDB();
        await db.run(
          `INSERT OR REPLACE INTO events (id, time, msg, type, timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [
            event.id || String(Date.now() + Math.random()),
            event.time,
            event.msg,
            event.type,
            Date.now(),
          ]
        );
        return;
      }
      console.error("❌ [Database] Failed to save event:", error);
    }
  });
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

export async function updateOccupant(
  id,
  name,
  relationship,
  contactInfo,
  gender,
  healthStatus,
  age,
  targetBpm,
  notes
) {
  return withDbWriteLock(async () => {
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
      if (await invalidateAndRecoverDbAfterCorruption(error)) {
        const db = await getDB();
        await db.run(
          `INSERT OR REPLACE INTO occupants (id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes, lastDetected)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT lastDetected FROM occupants WHERE id = ?), 0))`,
          [id, name, relationship, contactInfo, gender, healthStatus, age, targetBpm, notes, id]
        );
        console.log(`💾 [Database] Occupant ${id} updated after recovery: ${name} (${relationship}) - Gender: ${gender}`);
        return true;
      }

      console.error("❌ [Database] Failed to update occupant:", error);
      return false;
    }
  });
}

