import os
import datetime
from uuid import UUID, uuid4
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Import models & diagnostics
from ambient_wellness_engine.models import Base, VitalTelemetry, DailyAggregates, WellnessLog, TIMESCALEDB_DDL
from ambient_wellness_engine.diagnostics import WisdomDiagnosticEngine

from sqlalchemy import event

# Create Async Engine targeting SQLite (or Postgres in production)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///wellness_guardian.db")
engine = create_async_engine(DATABASE_URL, echo=False)

if "sqlite" in DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

app = FastAPI(
    title="Ambient Wellness Engine",
    description="Holistic WiFi Sensing & Daily Ayurvedic Panchang API Gateway",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to yield AsyncSession
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ==============================================================================
# API Models & Responses
# ==============================================================================
class MandalaSegment(BaseModel):
    time_range: str
    cycle_name: str
    governing_dosha: str
    element: str
    user_state: str
    sattva_score: float
    color_hex: str

class MandalaResponse(BaseModel):
    user_id: UUID
    date: datetime.date
    segments: List[MandalaSegment]
    telemetry_samples_count: int

class HeatmapItem(BaseModel):
    date: str
    sattva_score: float
    rajas_score: float
    tamas_score: float
    color_zone: str  # "Balanced" (Green), "Rajas/Stressed" (Red), "Tamas/Lethargic" (Gray)
    dominant_dosha: str

class DailyInsightResponse(BaseModel):
    user_id: UUID
    date: datetime.date
    sattva: float
    rajas: float
    tamas: float
    primary_imbalance: str
    prescribed_practice: str
    prescribed_mantra: str
    morning_panchang_insight: str


# ==============================================================================
# Endpoints
# ==============================================================================

@app.get("/api/dashboard/mandala/{user_id}", response_model=MandalaResponse)
async def get_mandala_view(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns data structured for a 24-hour circular UI view (Mandala),
    breaking the day into Ayurvedic Dosha cycles and overlaying activity state.
    """
    today = datetime.date.today()
    
    # 1. Fetch latest daily aggregates to understand sleep bounds
    query_agg = select(DailyAggregates).where(
        DailyAggregates.user_id == user_id
    ).order_by(desc(DailyAggregates.date)).limit(1)
    res_agg = await db.execute(query_agg)
    agg = res_agg.scalar_one_or_none()
    
    sleep_start = 22.0 # 10 PM fallback
    sleep_end = 6.0    # 6 AM fallback
    
    if agg and agg.sleep_onset and agg.wake_time:
        sleep_start = agg.sleep_onset.hour + (agg.sleep_onset.minute / 60.0)
        sleep_end = agg.wake_time.hour + (agg.wake_time.minute / 60.0)

    # 2. Map the 6 Diurnal Ayurvedic Cycles
    cycles = [
        {"start": 2.0, "end": 6.0, "dosha": "Vata", "name": "Brahma Muhurta (Ascension)", "element": "Ether/Air", "color": "#8A2BE2"},
        {"start": 6.0, "end": 10.0, "dosha": "Kapha", "name": "Pratah (Inertia/Stabilizing)", "element": "Water/Earth", "color": "#4682B4"},
        {"start": 10.0, "end": 14.0, "dosha": "Pitta", "name": "Madhyanha (Metabolic Peak)", "element": "Fire/Water", "color": "#FF4500"},
        {"start": 14.0, "end": 18.0, "dosha": "Vata", "name": "Aparanha (Mental Acuity)", "element": "Ether/Air", "color": "#9370DB"},
        {"start": 18.0, "end": 22.0, "dosha": "Kapha", "name": "Sayam (Grounding/Slowing)", "element": "Water/Earth", "color": "#5F9EA0"},
        {"start": 22.0, "end": 2.0, "dosha": "Pitta", "name": "Nisha (Cellular Repair)", "element": "Fire/Water", "color": "#D2691E"},
    ]

    segments = []
    for cyc in cycles:
        start = cyc["start"]
        end = cyc["end"]
        
        # Check overlay states based on sleep thresholds
        user_state = "Active Movement"
        sattva = 0.70
        
        # Simple circular time range matching logic
        is_sleeping = False
        if start >= sleep_start or end <= sleep_end or (sleep_start > sleep_end and (start >= sleep_start or end <= sleep_end)):
            is_sleeping = True
            
        if is_sleeping:
            user_state = "Deep Sleep Rejuvenation"
            sattva = 0.85
        elif cyc["dosha"] == "Pitta" and start >= 10.0 and start < 14.0:
            user_state = "High Cognitive Execution"
            sattva = 0.75
        elif cyc["dosha"] == "Vata" and start >= 14.0 and start < 18.0:
            user_state = "Intellectual Activity"
            sattva = 0.65
        elif cyc["dosha"] == "Kapha" and start >= 6.0 and start < 10.0:
            user_state = "Sustained Physical Strength"
            sattva = 0.80

        # Formulate range string
        range_str = f"{int(start):02d}:00 - {int(end):02d}:00"
        if start == 22.0:
            range_str = "22:00 - 02:00"
            
        segments.append(MandalaSegment(
            time_range=range_str,
            cycle_name=cyc["name"],
            governing_dosha=cyc["dosha"],
            element=cyc["element"],
            user_state=user_state,
            sattva_score=sattva,
            color_hex=cyc["color"]
        ))

    # Get sample count
    query_samples = select(VitalTelemetry).where(VitalTelemetry.user_id == user_id).limit(50)
    res_samples = await db.execute(query_samples)
    samples = res_samples.scalars().all()

    return MandalaResponse(
        user_id=user_id,
        date=today,
        segments=segments,
        telemetry_samples_count=len(samples)
    )


@app.get("/api/dashboard/harmony-heatmap/{user_id}", response_model=List[HeatmapItem])
async def get_harmony_heatmap(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns a GitHub-style yearly calendar matrix. Instead of commit counts,
    the values represent the daily 'Sattva' (harmony) score for color coding.
    """
    # Fetch previous 30 wellness logs (simulating up to a full year for visual display)
    query_logs = select(WellnessLog).where(
        WellnessLog.user_id == user_id
    ).order_by(desc(WellnessLog.date)).limit(100)
    
    res_logs = await db.execute(query_logs)
    logs = res_logs.scalars().all()
    
    heatmap = []
    for log in logs:
        # Resolve Guna color zones
        if log.sattva_ratio >= 0.50:
            color_zone = "Balanced" # Green (Sattva dominant)
        elif log.rajas_ratio > log.tamas_ratio:
            color_zone = "Rajas/Stressed" # Red (Rajas dominant - high stress/activity)
        else:
            color_zone = "Tamas/Lethargic" # Gray (Tamas dominant - high sedentary)
            
        heatmap.append(HeatmapItem(
            date=log.date.isoformat(),
            sattva_score=log.sattva_ratio,
            rajas_score=log.rajas_ratio,
            tamas_score=log.tamas_ratio,
            color_zone=color_zone,
            dominant_dosha=log.primary_dosha_imbalance
        ))
        
    return heatmap[::-1]  # Return in chronological order


@app.get("/api/dashboard/daily-insight/{user_id}", response_model=DailyInsightResponse)
async def get_daily_insight(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Serves the LLM-generated morning prescription and recommended Yoga/Mantra practices."""
    query_log = select(WellnessLog).where(
        WellnessLog.user_id == user_id
    ).order_by(desc(WellnessLog.date)).limit(1)
    
    res_log = await db.execute(query_log)
    log = res_log.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="No wellness logs compiled yet. Complete baseline gather.")
        
    return DailyInsightResponse(
        user_id=user_id,
        date=log.date,
        sattva=log.sattva_ratio,
        rajas=log.rajas_ratio,
        tamas=log.tamas_ratio,
        primary_imbalance=log.primary_dosha_imbalance,
        prescribed_practice=log.prescribed_practice,
        prescribed_mantra=log.prescribed_mantra,
        morning_panchang_insight=log.llm_insight or "No insight generated yet. Awaiting 4:00 AM worker."
    )


# ==============================================================================
# Automated Database Seeder & App Startup Lifecycle
# ==============================================================================
@app.on_event("startup")
async def startup_event():
    """Initializes schemas and seeds rich mock telemetry to visualize immediately."""
    async with engine.begin() as conn:
        # Create schemas in SQLite
        await conn.run_sync(Base.metadata.create_all)
        
    # Seed mock data
    async with AsyncSessionLocal() as session:
        # Check if users/logs exist
        test_user = UUID("00000000-0000-0000-0000-000000000001")
        check_q = select(WellnessLog).where(WellnessLog.user_id == test_user).limit(1)
        res = await session.execute(check_q)
        if not res.scalar():
            print("💾 Seeding rich Ayurvedic mock datasets to visualize harmony charts...")
            
            # 1. Seed 30 days of historical WellnessLogs and DailyAggregates
            today = datetime.date.today()
            for i in range(40):
                target_date = today - datetime.timedelta(days=i)
                
                # Alternate imbalances to show gorgeous variations in colors on the heatmap
                if i % 3 == 0:
                    dosha = "Vata"
                    s, r, t = 0.35, 0.45, 0.20
                    practice = "Balasana (Child's Pose)"
                    mantra = "Bija Mantra 'VAM'"
                    insight = (
                        "🌅 [Suryodaya - The Awakening]: The winds of Vata are gusting, manifest in your high nocturnal respiration "
                        "rate of 17.8 breaths/min. Agni, the digestive fire, flickers in the draft.\n\n"
                        "⚖️ [Dharma of Balance]: Respiration spike and sleep latency past 11:30 PM signal an anxious spirit. "
                        "Ground your prana immediately.\n\n"
                        "🧘 [Sadhana]: Practice 10 minutes of Balasana on a warm wool mat. Draw your awareness to the base chakra "
                        "and sound the mantra 'VAM' as a low resonant hum."
                    )
                elif i % 3 == 1:
                    dosha = "Pitta"
                    s, r, t = 0.40, 0.45, 0.15
                    practice = "Vajrasana (Thunderbolt Pose)"
                    mantra = "Cooling Mantra 'RAM'"
                    insight = (
                        "🌅 [Suryodaya - The Awakening]: Deep nocturnal activity registered in the kitchen at 12:45 AM. The "
                        "metabolic flames of Pitta burn out of season, irritating your sleep rhythms.\n\n"
                        "⚖️ [Dharma of Balance]: Tossing and turning rose to 18 occurrences as metabolic heat disrupted cell repair. "
                        "Stoke your morning with absolute cooling peace.\n\n"
                        "🧘 [Sadhana]: Sit in Vajrasana for 5 minutes after meals. Chant the cooling sound 'RAM' to soothe the liver."
                    )
                else:
                    dosha = "Balanced"
                    s, r, t = 0.75, 0.15, 0.10
                    practice = "Nadi Shodhana Pranayama"
                    mantra = "Universal 'OM'"
                    insight = (
                        "🌅 [Suryodaya - The Awakening]: Your breathing is steady, aligned with the early morning birds. The stillness "
                        "of Shiva rests upon your heart.\n\n"
                        "⚖️ [Dharma of Balance]: Consistent early sleep onset (10:15 PM) has allowed your nervous system to achieve "
                        "a beautiful 75% Sattva alignment.\n\n"
                        "🧘 [Sadhana]: Sit upright. Practice 12 rounds of alternate nostril breathing. Chant 'OM' with deep exhales."
                    )
                    
                session.add(WellnessLog(
                    date=target_date,
                    user_id=test_user,
                    sattva_ratio=s,
                    rajas_ratio=r,
                    tamas_ratio=t,
                    primary_dosha_imbalance=dosha,
                    prescribed_practice=practice,
                    prescribed_mantra=mantra,
                    llm_insight=insight
                ))
                
                session.add(DailyAggregates(
                    date=target_date,
                    user_id=test_user,
                    sleep_onset=datetime.datetime.combine(target_date - datetime.timedelta(days=1), datetime.time(hour=22, minute=30)),
                    wake_time=datetime.datetime.combine(target_date, datetime.time(hour=6, minute=15)),
                    tossing_turning_events=8 if dosha == "Balanced" else (22 if dosha == "Pitta" else 15),
                    sedentary_duration=360.0 if dosha == "Balanced" else 520.0,
                    kitchen_dwell_time=5.0 if dosha != "Pitta" else 35.0,
                    avg_gait_speed=1.1 if dosha == "Balanced" else 0.75
                ))
                
            # 2. Seed some telemetry
            for minute in range(60):
                time_sample = datetime.datetime.now() - datetime.timedelta(minutes=minute)
                session.add(VitalTelemetry(
                    timestamp=time_sample,
                    user_id=test_user,
                    respiration_rate=14.8,
                    movement_variance=0.04,
                    location_zone="Living Room"
                ))

            await session.commit()
            print("💾 Seeding complete. Ambient Wellness Engine is active!")

if __name__ == "__main__":
    import uvicorn
    # Start the server locally
    uvicorn.run("ambient_wellness_engine.main:app", host="0.0.0.0", port=8082, reload=False)
