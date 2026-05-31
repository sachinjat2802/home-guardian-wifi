import asyncio
import datetime
import logging
from typing import Dict, Any, List, Optional
import aiosqlite

logger = logging.getLogger("AnalyticsEngine")

# Thresholds for various biometrics
THRESHOLDS = {
    "heart_rate": {"low": 45, "high": 130, "name": "Heart Rate"},
    "breathing_rate": {"low": 6, "high": 30, "name": "Breathing Rate"},
    "hrv": {"low": 15, "high": 120, "name": "HRV"},
    "temp": {"low": 35.0, "high": 38.5, "name": "Temperature"},
    "spo2": {"low": 90, "high": 101, "name": "SpO2"}
}

async def init_analytics_tables(db: aiosqlite.Connection):
    """
    Creates necessary SQLite tables for medical anomalies and rollups.
    """
    await db.execute("""
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
    """)

    await db.execute("""
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
    """)

    await db.execute("""
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
    """)

    await db.execute("""
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
    """)

    # Indices for performance
    await db.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_occupant ON vital_snapshots(occupant_id, timestamp);")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_daily_occupant ON daily_health_summary(occupant_id, date);")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_alerts_occupant ON health_alerts(occupant_id, timestamp);")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_activity_occupant ON activity_log(occupant_id, started_at);")
    await db.commit()
    logger.info("📊 [Analytics] SQLite Tables and Indices verified.")

async def save_vital_snapshots(db: aiosqlite.Connection, entities: List[Dict[str, Any]], timestamp: int):
    """
    Saves a 30-second snapshot of active biometrics for all entities.
    """
    rows = []
    for e in entities:
        if e.get("type") != "person" or "vitals" not in e:
            continue
        v = e["vitals"]
        rows.append((
            e["id"],
            v.get("heartRate", 0),
            v.get("breathingRate", 0),
            v.get("hrv", 0),
            v.get("temp", 0.0),
            v.get("spo2", 0),
            v.get("sleepStage"),
            e.get("status", "resting"),
            0.0,
            e.get("x", 50.0),
            e.get("y", 50.0),
            timestamp
        ))
    
    if not rows:
        return

    placeholders = ",".join(["(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"] * len(rows))
    flat_params = []
    for r in rows:
        flat_params.extend(r)

    await db.execute(f"""
        INSERT INTO vital_snapshots 
        (occupant_id, heart_rate, breathing_rate, hrv, temp, spo2, sleep_stage, activity_status, motion_energy, x, y, timestamp)
        VALUES {placeholders}
    """, flat_params)
    await db.commit()

# In-memory store to track activity spans
last_activity_states = {}  # occupant_id -> {"activity": str, "started_at": int}

async def track_activity(db: aiosqlite.Connection, entities: List[Dict[str, Any]], timestamp: int):
    """
    Saves transitions in status (active, resting, sleeping) to the activity log.
    """
    for e in entities:
        if e.get("type") != "person":
            continue
        occ_id = e["id"]
        status = e.get("status", "resting")
        prev = last_activity_states.get(occ_id)

        if prev and prev["activity"] != status:
            duration = int((timestamp - prev["started_at"]) / 1000)
            if duration > 5:
                await db.execute("""
                    INSERT INTO activity_log (occupant_id, activity, started_at, ended_at, duration_sec, avg_x, avg_y)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (occ_id, prev["activity"], prev["started_at"], timestamp, duration, e.get("x", 50.0), e.get("y", 50.0)))
                await db.commit()
            last_activity_states[occ_id] = {"activity": status, "started_at": timestamp}
        elif not prev:
            last_activity_states[occ_id] = {"activity": status, "started_at": timestamp}

async def detect_anomalies(db: aiosqlite.Connection, entities: List[Dict[str, Any]], timestamp: int):
    """
    Scans entities biometrics and alerts if thresholds are breached.
    """
    for e in entities:
        if e.get("type") != "person" or "vitals" not in e:
            continue
        v = e["vitals"]
        checks = [
            ("heart_rate", v.get("heartRate", 72)),
            ("breathing_rate", v.get("breathingRate", 14)),
            ("hrv", v.get("hrv", 55)),
            ("temp", v.get("temp", 36.6)),
            ("spo2", v.get("spo2", 98))
        ]

        for key, val in checks:
            th = THRESHOLDS[key]
            if val < th["low"] or val > th["high"]:
                severity = "critical" if key in ["heart_rate", "spo2"] else "warning"
                direction = "below" if val < th["low"] else "above"
                threshold_val = th["low"] if val < th["low"] else th["high"]

                # Rate limit alerts: check if logged within last 2 minutes
                async with db.execute("""
                    SELECT id FROM health_alerts 
                    WHERE occupant_id = ? AND vital_name = ? AND timestamp > ?
                """, (e["id"], key, timestamp - 120000)) as cursor:
                    recent = await cursor.fetchone()

                if not recent:
                    message = f"{e['name']}: {th['name']} {direction} safe range ({val})"
                    await db.execute("""
                        INSERT INTO health_alerts (occupant_id, alert_type, severity, message, vital_name, vital_value, threshold, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (e["id"], "threshold_breach", severity, message, key, val, threshold_val, timestamp))
                    await db.commit()
                    logger.warning(f"🚨 [Anomaly Alert] {message}")

async def compute_daily_summaries(db: aiosqlite.Connection):
    """
    Aggregates snapshots, logs, and alerts to calculate health scores.
    """
    today = datetime.date.today().isoformat()
    now_ms = int(datetime.datetime.utcnow().timestamp() * 1000)
    day_start_ms = int(datetime.datetime.combine(datetime.date.today(), datetime.time.min).timestamp() * 1000)

    # 1. Find occupants active today
    async with db.execute("""
        SELECT DISTINCT occupant_id FROM vital_snapshots WHERE timestamp >= ?
    """, (day_start_ms,)) as cursor:
        occupants = await cursor.fetchall()

    for row in occupants:
        occ_id = row[0]
        
        # 2. Get averages & min/max
        async with db.execute("""
            SELECT 
                AVG(heart_rate) as avg_hr, MIN(heart_rate) as min_hr, MAX(heart_rate) as max_hr,
                AVG(breathing_rate) as avg_br, AVG(hrv) as avg_hrv,
                AVG(temp) as avg_temp, AVG(spo2) as avg_spo2
            FROM vital_snapshots WHERE occupant_id = ? AND timestamp >= ?
        """, (occ_id, day_start_ms)) as cursor:
            stats = await cursor.fetchone()

        if not stats or stats[0] is None:
            continue

        avg_hr, min_hr, max_hr, avg_br, avg_hrv, avg_temp, avg_spo2 = stats

        # 3. Get total activity logs durational sums
        async with db.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN activity = 'active' THEN duration_sec ELSE 0 END), 0) as active_sec,
                COALESCE(SUM(CASE WHEN activity = 'resting' THEN duration_sec ELSE 0 END), 0) as resting_sec,
                COALESCE(SUM(CASE WHEN activity = 'sleeping' THEN duration_sec ELSE 0 END), 0) as sleeping_sec
            FROM activity_log WHERE occupant_id = ? AND started_at >= ?
        """, (occ_id, day_start_ms)) as cursor:
            act = await cursor.fetchone()

        active_sec, resting_sec, sleeping_sec = act or (0, 0, 0)

        # 4. Get anomalies count
        async with db.execute("""
            SELECT COUNT(*) FROM health_alerts WHERE occupant_id = ? AND timestamp >= ?
        """, (occ_id, day_start_ms)) as cursor:
            alert_row = await cursor.fetchone()
            alert_cnt = alert_row[0] if alert_row else 0

        # Calculate a robust health score out of 100
        score = 100
        if avg_hr < 55 or avg_hr > 100:
            score -= 10
        if avg_spo2 < 95:
            score -= 15
        score -= min(30, alert_cnt * 5)
        score = max(0, min(100, score))

        summary = f"HR:{round(avg_hr)} BR:{round(avg_br)} HRV:{round(avg_hrv)} Active:{round(active_sec / 60)}min"

        await db.execute("""
            INSERT OR REPLACE INTO daily_health_summary
            (occupant_id, date, avg_heart_rate, min_heart_rate, max_heart_rate,
             avg_breathing_rate, avg_hrv, avg_temp, avg_spo2,
             total_active_min, total_resting_min, total_sleeping_min,
             anomaly_count, health_score, pattern_summary, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            occ_id,
            today,
            round(avg_hr, 1),
            min_hr,
            max_hr,
            round(avg_br, 1),
            round(avg_hrv, 1),
            round(avg_temp, 1),
            round(avg_spo2, 1),
            round(active_sec / 60),
            round(resting_sec / 60),
            round(sleeping_sec / 60),
            alert_cnt,
            score,
            summary,
            now_ms
        ))
        await db.commit()
    logger.info(f"📊 [Analytics] Daily summaries rollups compiled successfully.")


# ==============================================================================
# Database Query Accessors (WebSocket Relaying Helpers)
# ==============================================================================
async def get_analytics_data(db: aiosqlite.Connection, occupant_id: str) -> Dict[str, Any]:
    """
    Retrieves full medical summaries, snapshots, and logs for a target occupant.
    """
    now = int(datetime.datetime.utcnow().timestamp() * 1000)

    # 1. Snapshots (last 120 points)
    snapshots = []
    async with db.execute("""
        SELECT occupant_id, heart_rate, breathing_rate, hrv, temp, spo2, sleep_stage, activity_status, motion_energy, x, y, timestamp
        FROM vital_snapshots WHERE occupant_id = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 120
    """, (occupant_id, now - 3600000)) as cursor:
        async for row in cursor:
            snapshots.append({
                "occupant_id": row[0],
                "heartRate": row[1],
                "breathingRate": row[2],
                "hrv": row[3],
                "temp": row[4],
                "spo2": row[5],
                "sleepStage": row[6],
                "status": row[7],
                "motionEnergy": row[8],
                "x": row[9],
                "y": row[10],
                "timestamp": row[11]
            })

    # 2. Daily summaries (last 7 days)
    daily_summaries = []
    async with db.execute("""
        SELECT occupant_id, date, avg_heart_rate, min_heart_rate, max_heart_rate, avg_breathing_rate, avg_hrv, avg_temp, avg_spo2,
               total_active_min, total_resting_min, total_sleeping_min, anomaly_count, health_score, pattern_summary
        FROM daily_health_summary WHERE occupant_id = ? ORDER BY date DESC LIMIT 7
    """, (occupant_id,)) as cursor:
        async for row in cursor:
            daily_summaries.append({
                "occupant_id": row[0],
                "date": row[1],
                "avg_heart_rate": row[2],
                "min_heart_rate": row[3],
                "max_heart_rate": row[4],
                "avg_breathing_rate": row[5],
                "avg_hrv": row[6],
                "avg_temp": row[7],
                "avg_spo2": row[8],
                "total_active_min": row[9],
                "total_resting_min": row[10],
                "total_sleeping_min": row[11],
                "anomaly_count": row[12],
                "health_score": row[13],
                "pattern_summary": row[14]
            })

    # 3. Recent Alerts (last 20 alerts)
    recent_alerts = []
    async with db.execute("""
        SELECT id, occupant_id, alert_type, severity, message, vital_name, vital_value, threshold, acknowledged, timestamp
        FROM health_alerts WHERE occupant_id = ? ORDER BY timestamp DESC LIMIT 20
    """, (occupant_id,)) as cursor:
        async for row in cursor:
            recent_alerts.append({
                "id": row[0],
                "occupant_id": row[1],
                "alert_type": row[2],
                "severity": row[3],
                "message": row[4],
                "vital_name": row[5],
                "vital_value": row[6],
                "threshold": row[7],
                "acknowledged": row[8],
                "timestamp": row[9]
            })

    # 4. Activity breakdown (last 24 hours)
    activity_breakdown = []
    async with db.execute("""
        SELECT activity, SUM(duration_sec) as total_sec, COUNT(*) as transitions
        FROM activity_log WHERE occupant_id = ? AND started_at > ? GROUP BY activity
    """, (occupant_id, now - 86400000)) as cursor:
        async for row in cursor:
            activity_breakdown.append({
                "activity": row[0],
                "total_sec": row[1],
                "transitions": row[2]
            })

    return {
        "snapshots": snapshots,
        "dailySummaries": daily_summaries,
        "recentAlerts": recent_alerts,
        "activityBreakdown": activity_breakdown
    }

async def get_all_health_summaries(db: aiosqlite.Connection) -> List[Dict[str, Any]]:
    """
    Returns today's rollups for all occupants.
    """
    today = datetime.date.today().isoformat()
    summaries = []
    async with db.execute("""
        SELECT h.occupant_id, o.name, h.pattern_summary, h.health_score 
        FROM daily_health_summary h
        JOIN occupants o ON h.occupant_id = o.id
        WHERE h.date = ? ORDER BY h.health_score ASC
    """, (today,)) as cursor:
        async for row in cursor:
            summaries.append({
                "occupant_id": row[0],
                "occupant_name": row[1],
                "summary": row[2],
                "score": row[3]
            })
    return summaries

async def get_recent_alerts(db: aiosqlite.Connection, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns global health warning alert snapshots from the DB.
    """
    alerts = []
    async with db.execute("""
        SELECT a.id, o.name, a.message, a.timestamp, a.severity 
        FROM health_alerts a
        JOIN occupants o ON a.occupant_id = o.id
        ORDER BY a.timestamp DESC LIMIT ?
    """, (limit,)) as cursor:
        async for row in cursor:
            alerts.append({
                "id": row[0],
                "occupant_name": row[1],
                "msg": row[2],
                "time": datetime.datetime.fromtimestamp(row[3]/1000).strftime('%I:%M %p'),
                "type": "alert" if row[4] == "critical" else "info"
            })
    return alerts
