import datetime
from uuid import UUID, uuid4
from typing import Optional
from sqlalchemy import Column, String, Float, Integer, DateTime, Date, ForeignKey, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker, AsyncSession

class Base(AsyncAttrs, DeclarativeBase):
    """Base Declarative class for all Wellness Engine models."""
    pass

# ==============================================================================
# 1. VitalTelemetry (High-Frequency TimescaleDB Time-Series Model)
# ==============================================================================
class VitalTelemetry(Base):
    __tablename__ = "vital_telemetry"
    
    # TimescaleDB requires composite keys including the timestamp for hypertables
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), primary_key=True, server_default=text("NOW()"))
    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    respiration_rate: Mapped[float] = mapped_column(Float, nullable=False)
    movement_variance: Mapped[float] = mapped_column(Float, nullable=False)
    location_zone: Mapped[str] = mapped_column(String(50), nullable=False)

    __table_args__ = (
        UniqueConstraint("timestamp", "user_id", name="uq_telemetry_timestamp_user"),
    )

    def __repr__(self) -> str:
        return f"<VitalTelemetry {self.user_id} @ {self.timestamp}: Resp={self.respiration_rate}>"


# ==============================================================================
# 2. DailyAggregates (Physical Telemetry Daily Rolling Rollups)
# ==============================================================================
class DailyAggregates(Base):
    __tablename__ = "daily_aggregates"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    user_id: Mapped[UUID] = mapped_column(nullable=False)
    
    # Sleep telemetry rollups
    sleep_onset: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    wake_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tossing_turning_events: Mapped[int] = mapped_column(Integer, default=0)
    
    # Activity & spatial logs
    sedentary_duration: Mapped[float] = mapped_column(Float, default=0.0)  # In minutes
    kitchen_dwell_time: Mapped[float] = mapped_column(Float, default=0.0)  # In minutes
    avg_gait_speed: Mapped[float] = mapped_column(Float, default=1.0)      # In m/s

    __table_args__ = (
        UniqueConstraint("date", "user_id", name="uq_daily_date_user"),
    )

    def __repr__(self) -> str:
        return f"<DailyAggregates {self.user_id} on {self.date}: Sleep={self.sleep_onset} Sedentary={self.sedentary_duration}min>"


# ==============================================================================
# 3. WellnessLog (Holistic Wisdom & Ayurvedic Harmony Scores)
# ==============================================================================
class WellnessLog(Base):
    __tablename__ = "wellness_logs"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    user_id: Mapped[UUID] = mapped_column(nullable=False)
    
    # Guna Ratios (Should ideally sum to 1.0)
    sattva_ratio: Mapped[float] = mapped_column(Float, default=0.6)  # Harmony / Purity
    rajas_ratio: Mapped[float] = mapped_column(Float, default=0.2)   # Energy / Activity / Agitation
    tamas_ratio: Mapped[float] = mapped_column(Float, default=0.2)   # Inertia / Rest / Lethargy
    
    # Diagnostic outcomes
    primary_dosha_imbalance: Mapped[str] = mapped_column(String(50), nullable=False) # "Vata", "Pitta", "Kapha", "Balanced"
    prescribed_practice: Mapped[str] = mapped_column(String(255), nullable=False)
    prescribed_mantra: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # LLM daily generated insight
    llm_insight: Mapped[Optional[str]] = mapped_column(String(4096), nullable=True)

    __table_args__ = (
        UniqueConstraint("date", "user_id", name="uq_wellness_date_user"),
    )

    def __repr__(self) -> str:
        return f"<WellnessLog {self.user_id} on {self.date}: Sattva={self.sattva_ratio} Dosha={self.primary_dosha_imbalance}>"


# ==============================================================================
# TimescaleDB Hypertables & PostgreSQL Schema Setup DDL
# ==============================================================================
TIMESCALEDB_DDL = """
-- 1. Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Create VitalTelemetry hypertable partitioned on 1-day chunks
SELECT create_hypertable('vital_telemetry', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- 3. Create indices for time-series acceleration
CREATE INDEX IF NOT EXISTS idx_telemetry_user_time ON vital_telemetry (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_aggregates (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_user_date ON wellness_logs (user_id, date DESC);
"""
