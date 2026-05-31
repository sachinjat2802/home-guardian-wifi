import os
import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, DateTime, ForeignKey, text

# Database Environment Configurations
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/home_guardian")

# Create Async Engine & Session maker
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class UserModel(Base):
    """
    Represents enrolled household family members and authorized occupants.
    """
    __tablename__ = "users"
    
    user_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    enrollment_date: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    baseline_status: Mapped[str] = mapped_column(String(50), default="pending")  # 'pending', 'complete', 'retraining'

    # Relationships
    telemetry: Mapped[list["TelemetryModel"]] = relationship("TelemetryModel", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["SessionModel"]] = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")

class TelemetryModel(Base):
    """
    High-frequency TimescaleDB Hypertable mapping occupancy states and model predictions.
    In TimescaleDB, the partitioning time column must be part of the primary key.
    """
    __tablename__ = "telemetry"
    
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, primary_key=True, default=datetime.datetime.utcnow)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # 'present', 'absent', 'unknown'

    # Relationship
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="telemetry")

class SessionModel(Base):
    """
    Aggregated dwell time sessions representing duration tracking inside covered rooms.
    """
    __tablename__ = "sessions"
    
    session_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    room_entered_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    room_exited_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    dwell_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # in seconds

    # Relationship
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="sessions")

# Raw TimescaleDB PostgreSQL Initialization Script
DB_INIT_SQL = """
-- 1. Ensure TimescaleDB Extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Create Users Metadata Table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    enrollment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    baseline_status VARCHAR(50) DEFAULT 'pending'
);

-- 3. Create Telemetry Timescale Table
CREATE TABLE IF NOT EXISTS telemetry (
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL,
    PRIMARY KEY (timestamp, user_id),
    CONSTRAINT fk_telemetry_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Convert Telemetry table to TimescaleDB Hypertable (idempotent helper)
SELECT create_hypertable('telemetry', 'timestamp', if_not_exists => TRUE);

-- 5. Create Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    room_entered_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    room_exited_at TIMESTAMP WITHOUT TIME ZONE,
    dwell_time DOUBLE PRECISION,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6. Add spatial indexing for blazing fast Timescale queries
CREATE INDEX IF NOT EXISTS idx_telemetry_user_time ON telemetry (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_entry ON sessions (user_id, room_entered_at DESC);
"""

async def init_database():
    """
    Initializes PostgreSQL tables and registers TimescaleDB Hypertables.
    """
    async with engine.begin() as conn:
        # Execute Timescale schema statements
        await conn.execute(text(DB_INIT_SQL))
    print("💾 PostgreSQL & TimescaleDB hypertable initialization complete!")
