import { getDB, invalidateAndRecoverDbAfterCorruption } from "./db.js";

// ─── Analytics Configuration ──────────────────────────────────────────
const SNAPSHOT_INTERVAL_MS = 30000;   // Save vital snapshots every 30s
const SUMMARY_INTERVAL_MS = 300000;  // Compute rolling summaries every 5 min
const PATTERN_INTERVAL_MS = 600000;  // Analyze patterns every 10 min

let analyticsTimers = [];

// ─── Schema Initialization ────────────────────────────────────────────
export async function initAnalyticsTables() {
  const db = await getDB();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vital_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occupant_id TEXT,
      heart_rate INTEGER,
      breathing_rate INTEGER,
      hrv INTEGER,
      temp REAL,
      spo2 INTEGER,
      sleep_stage TEXT,
      activity_status TEXT,
      motion_energy REAL,
      x REAL,
      y REAL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS daily_health_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occupant_id TEXT,
      date TEXT,
      avg_heart_rate REAL,
      min_heart_rate INTEGER,
      max_heart_rate INTEGER,
      avg_breathing_rate REAL,
      avg_hrv REAL,
      avg_temp REAL,
      avg_spo2 REAL,
      total_active_min INTEGER DEFAULT 0,
      total_resting_min INTEGER DEFAULT 0,
      total_sleeping_min INTEGER DEFAULT 0,
      anomaly_count INTEGER DEFAULT 0,
      health_score INTEGER DEFAULT 0,
      pattern_summary TEXT,
      timestamp INTEGER,
      UNIQUE(occupant_id, date)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occupant_id TEXT,
      activity TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      duration_sec INTEGER,
      avg_x REAL,
      avg_y REAL
    );

    CREATE TABLE IF NOT EXISTS health_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occupant_id TEXT,
      alert_type TEXT,
      severity TEXT,
      message TEXT,
      vital_name TEXT,
      vital_value REAL,
      threshold REAL,
      acknowledged INTEGER DEFAULT 0,
      timestamp INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_occupant ON vital_snapshots(occupant_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_daily_occupant ON daily_health_summary(occupant_id, date);
    CREATE INDEX IF NOT EXISTS idx_alerts_occupant ON health_alerts(occupant_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_occupant ON activity_log(occupant_id, started_at);
  `);

  console.log("📊 [Analytics] Tables initialized.");
}

// ─── Vital Snapshot Writer ────────────────────────────────────────────
let analyticsWriteLock = false;

function withAnalyticsWriteLock(fn) {
  return (async () => {
    // Prevent overlapping analytics ticks causing concurrent writes.
    if (analyticsWriteLock) return;
    analyticsWriteLock = true;
    try {
      return await fn();
    } finally {
      analyticsWriteLock = false;
    }
  })();
}

async function runSerializedWrites(db, fn) {
  // Keep transactions short to reduce WAL growth and contention.
  await db.exec('BEGIN IMMEDIATE;');
  try {
    await fn();
    await db.exec('COMMIT;');
  } catch (e) {
    try {
      await db.exec('ROLLBACK;');
    } catch { }
    throw e;
  }
}

export async function saveVitalSnapshots(entities) {
  if (!entities || entities.length === 0) return;

  return withAnalyticsWriteLock(async () => {
    const db = await getDB();
    const now = Date.now();

    const rows = [];
    for (const e of entities) {
      if (!e?.vitals) continue;
      rows.push({
        occupant_id: e.id,
        heart_rate: e.vitals.heartRate,
        breathing_rate: e.vitals.breathingRate,
        hrv: e.vitals.hrv,
        temp: e.vitals.temp,
        spo2: e.vitals.spo2,
        sleep_stage: e.vitals.sleepStage || null,
        activity_status: e.status,
        motion_energy: 0,
        x: e.x,
        y: e.y,
        timestamp: now,
      });
    }
    if (rows.length === 0) return;

    await runSerializedWrites(db, async () => {
      // Batch insert all snapshots in one statement.
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const params = [];
      for (const r of rows) {
        params.push(
          r.occupant_id,
          r.heart_rate,
          r.breathing_rate,
          r.hrv,
          r.temp,
          r.spo2,
          r.sleep_stage,
          r.activity_status,
          r.motion_energy,
          r.x,
          r.y,
          r.timestamp
        );
      }

      await db.run(
        `INSERT INTO vital_snapshots (occupant_id, heart_rate, breathing_rate, hrv, temp, spo2, sleep_stage, activity_status, motion_energy, x, y, timestamp)
         VALUES ${placeholders};`,
        params
      );
    });
  }).catch(async (err) => {
    console.error("❌ [Analytics] Snapshot save error:", err?.message || String(err));
    await invalidateAndRecoverDbAfterCorruption(err);
  });
}


// ─── Activity Tracking ────────────────────────────────────────────────
const lastActivity = {};

export async function trackActivity(entities) {
  if (!entities || entities.length === 0) return;
  const now = Date.now();

  return withAnalyticsWriteLock(async () => {
    const db = await getDB();
    await runSerializedWrites(db, async () => {
      for (const e of entities) {
        const prev = lastActivity[e.id];
        if (prev && prev.activity !== e.status) {
          const duration = Math.round((now - prev.startedAt) / 1000);
          if (duration > 5) {
            await db.run(
              `INSERT INTO activity_log (occupant_id, activity, started_at, ended_at, duration_sec, avg_x, avg_y)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [e.id, prev.activity, prev.startedAt, now, duration, e.x, e.y]
            );
          }
        }
        if (!prev || prev.activity !== e.status) {
          lastActivity[e.id] = { activity: e.status, startedAt: now };
        }
      }
    });
  }).catch(async (err) => {
    console.error("❌ [Analytics] Activity tracking error:", err?.message || String(err));
    await invalidateAndRecoverDbAfterCorruption(err);
  });
}


// ─── Health Anomaly Detection ─────────────────────────────────────────
const THRESHOLDS = {
  heart_rate: { low: 45, high: 130, name: "Heart Rate" },
  breathing_rate: { low: 6, high: 30, name: "Breathing Rate" },
  hrv: { low: 15, high: 120, name: "HRV" },
  temp: { low: 35.0, high: 38.5, name: "Temperature" },
  spo2: { low: 90, high: 101, name: "SpO2" }
};

export async function detectAnomalies(entities) {
  if (!entities || entities.length === 0) return;

  return withAnalyticsWriteLock(async () => {
    const db = await getDB();
    const now = Date.now();

    await runSerializedWrites(db, async () => {
      for (const e of entities) {
        if (!e?.vitals) continue;
        const checks = [
          { key: "heart_rate", val: e.vitals.heartRate },
          { key: "breathing_rate", val: e.vitals.breathingRate },
          { key: "hrv", val: e.vitals.hrv },
          { key: "temp", val: e.vitals.temp },
          { key: "spo2", val: e.vitals.spo2 }
        ];
        for (const c of checks) {
          const th = THRESHOLDS[c.key];
          if (!th) continue;

          if (c.val < th.low || c.val > th.high) {
            const severity = c.key === "heart_rate" || c.key === "spo2" ? "critical" : "warning";
            const dir = c.val < th.low ? "below" : "above";

            const recent = await db.get(
              `SELECT id FROM health_alerts WHERE occupant_id = ? AND vital_name = ? AND timestamp > ?`,
              [e.id, c.key, now - 120000]
            );

            if (!recent) {
              await db.run(
                `INSERT INTO health_alerts (occupant_id, alert_type, severity, message, vital_name, vital_value, threshold, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  e.id,
                  "threshold_breach",
                  severity,
                  `${e.name}: ${th.name} ${dir} safe range (${c.val})`,
                  c.key,
                  c.val,
                  dir === "below" ? th.low : th.high,
                  now
                ]
              );
            }
          }
        }
      }
    });
  }).catch(async (err) => {
    console.error("❌ [Analytics] Anomaly detection error:", err?.message || String(err));
    await invalidateAndRecoverDbAfterCorruption(err);
  });
}


// ─── Daily Summary Computation ────────────────────────────────────────
export async function computeDailySummaries() {
  return withAnalyticsWriteLock(async () => {
    try {
      const db = await getDB();
      const today = new Date().toISOString().slice(0, 10);
      const dayStart = new Date(today).getTime();
      const now = Date.now();

      const occupants = await db.all(
        `SELECT DISTINCT occupant_id FROM vital_snapshots WHERE timestamp >= ?`,
        [dayStart]
      );

      await runSerializedWrites(db, async () => {
        for (const occ of occupants) {
          const id = occ.occupant_id;
          const stats = await db.get(
            `SELECT
              AVG(heart_rate) as avg_hr, MIN(heart_rate) as min_hr, MAX(heart_rate) as max_hr,
              AVG(breathing_rate) as avg_br, AVG(hrv) as avg_hrv,
              AVG(temp) as avg_temp, AVG(spo2) as avg_spo2
            FROM vital_snapshots WHERE occupant_id = ? AND timestamp >= ?`,
            [id, dayStart]
          );

          const activityStats = await db.get(
            `SELECT
              COALESCE(SUM(CASE WHEN activity = 'active' THEN duration_sec ELSE 0 END), 0) as active_sec,
              COALESCE(SUM(CASE WHEN activity = 'resting' THEN duration_sec ELSE 0 END), 0) as resting_sec,
              COALESCE(SUM(CASE WHEN activity = 'sleeping' THEN duration_sec ELSE 0 END), 0) as sleeping_sec
            FROM activity_log WHERE occupant_id = ? AND started_at >= ?`,
            [id, dayStart]
          );

          const alertCount = await db.get(
            `SELECT COUNT(*) as cnt FROM health_alerts WHERE occupant_id = ? AND timestamp >= ?`,
            [id, dayStart]
          );

          let score = 100;
          if (stats.avg_hr) {
            if (stats.avg_hr < 55 || stats.avg_hr > 100) score -= 10;
            if (stats.avg_spo2 && stats.avg_spo2 < 95) score -= 15;
            if (alertCount.cnt > 0) score -= Math.min(30, alertCount.cnt * 5);
          }
          score = Math.max(0, Math.min(100, score));

          const summary = `HR:${Math.round(stats.avg_hr || 0)} BR:${Math.round(stats.avg_br || 0)} HRV:${Math.round(stats.avg_hrv || 0)} Active:${Math.round((activityStats?.active_sec || 0) / 60)}min`;

          await db.run(
            `INSERT OR REPLACE INTO daily_health_summary
             (occupant_id, date, avg_heart_rate, min_heart_rate, max_heart_rate,
              avg_breathing_rate, avg_hrv, avg_temp, avg_spo2,
              total_active_min, total_resting_min, total_sleeping_min,
              anomaly_count, health_score, pattern_summary, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              today,
              Math.round((stats.avg_hr || 0) * 10) / 10,
              stats.min_hr || 0,
              stats.max_hr || 0,
              Math.round((stats.avg_br || 0) * 10) / 10,
              Math.round((stats.avg_hrv || 0) * 10) / 10,
              Math.round((stats.avg_temp || 0) * 10) / 10,
              Math.round((stats.avg_spo2 || 0) * 10) / 10,
              Math.round((activityStats?.active_sec || 0) / 60),
              Math.round((activityStats?.resting_sec || 0) / 60),
              Math.round((activityStats?.sleeping_sec || 0) / 60),
              alertCount.cnt,
              score,
              summary,
              now
            ]
          );
        }
      });

      console.log("📊 [Analytics] Daily summaries computed for", occupants.length, "occupants.");
    } catch (err) {
      console.error("❌ [Analytics] Daily summary error:", err?.message || String(err));
      await invalidateAndRecoverDbAfterCorruption(err);
    }
  });
}


// ─── Query Functions (for WebSocket / API) ────────────────────────────
export async function getAnalyticsData(occupantId) {
  try {
    const db = await getDB();
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const snapshots = await db.all(
      `SELECT * FROM vital_snapshots WHERE occupant_id = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 120`,
      [occupantId, now - 3600000]
    );

    const dailySummaries = await db.all(
      `SELECT * FROM daily_health_summary WHERE occupant_id = ? ORDER BY date DESC LIMIT 7`,
      [occupantId]
    );

    const recentAlerts = await db.all(
      `SELECT * FROM health_alerts WHERE occupant_id = ? ORDER BY timestamp DESC LIMIT 20`,
      [occupantId]
    );

    const activityBreakdown = await db.all(
      `SELECT activity, SUM(duration_sec) as total_sec, COUNT(*) as transitions
       FROM activity_log WHERE occupant_id = ? AND started_at > ? GROUP BY activity`,
      [occupantId, now - 86400000]
    );

    return { snapshots, dailySummaries, recentAlerts, activityBreakdown };
  } catch (err) {
    console.error("❌ [Analytics] Query error:", err.message);
    return { snapshots: [], dailySummaries: [], recentAlerts: [], activityBreakdown: [] };
  }
}

export async function getAllHealthSummaries() {
  try {
    const db = await getDB();
    const today = new Date().toISOString().slice(0, 10);
    return await db.all(
      `SELECT * FROM daily_health_summary WHERE date = ? ORDER BY health_score ASC`, [today]
    );
  } catch (err) {
    console.error("❌ [Analytics] getAllHealthSummaries error:", err.message);
    return [];
  }
}

export async function getRecentAlerts(limit = 50) {
  try {
    const db = await getDB();
    return await db.all(`SELECT * FROM health_alerts ORDER BY timestamp DESC LIMIT ?`, [limit]);
  } catch (err) {
    return [];
  }
}

// ─── Analytics Loop Starter ───────────────────────────────────────────
export function startAnalyticsLoop(getEntities) {
  // Snapshots every 30s
  const snapTimer = setInterval(async () => {
    const entities = getEntities();
    await saveVitalSnapshots(entities);
    await trackActivity(entities);
    await detectAnomalies(entities);
  }, SNAPSHOT_INTERVAL_MS);

  // Daily summaries every 5 min
  const summaryTimer = setInterval(() => computeDailySummaries(), SUMMARY_INTERVAL_MS);

  analyticsTimers = [snapTimer, summaryTimer];

  console.log("📊 [Analytics] Pattern tracking loops started (snapshots: 30s, summaries: 5min).");
  return analyticsTimers;
}

export function stopAnalyticsLoop() {
  analyticsTimers.forEach(t => clearInterval(t));
  analyticsTimers = [];
  console.log("📊 [Analytics] Loops stopped.");
}
