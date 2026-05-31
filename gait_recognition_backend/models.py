import datetime
import uuid
from typing import Optional
from enum import Enum
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class DeclarativeBaseModel(DeclarativeBase):
    pass

class BaselineStatus(str, Enum):
    PENDING = "pending"
    ENROLLED = "enrolled"
    RETRAINING = "retraining"

class User(DeclarativeBaseModel):
    """
    Users Table - Stores enrolled family members and their baseline statuses.
    """
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    enrollment_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        default=datetime.datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP")
    )
    baseline_status: Mapped[BaselineStatus] = mapped_column(
        String(20), 
        default=BaselineStatus.PENDING,
        server_default=text("'pending'")
    )

class Telemetry(DeclarativeBaseModel):
    """
    Telemetry Table - Stores high-frequency, raw inference state at 1Hz.
    In a TimescaleDB environment, this is configured as a Hypertable.
    """
    __tablename__ = "telemetry"

    # In TimescaleDB, the timestamp must be part of the primary key
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        primary_key=True, 
        default=datetime.datetime.utcnow
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'present', 'absent'

class Session(DeclarativeBaseModel):
    """
    Sessions Table - Aggregated entry/exit records with dwell times.
    """
    __tablename__ = "sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.user_id", ondelete="CASCADE"), 
        nullable=False
    )
    room_entered_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False
    )
    room_exited_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    dwell_time: Mapped[Optional[float]] = mapped_column(
        Float, 
        nullable=True, 
        comment="Dwell time in seconds, calculated upon exit"
    )

# ==============================================================================
# TimescaleDB & PostgreSQL Native DDL Creation Scripts
# ==============================================================================
POSTGRESQL_DDL = """
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Baseline Status Enum-equivalent check constraint
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    baseline_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    CONSTRAINT chk_baseline_status CHECK (baseline_status IN ('pending', 'enrolled', 'retraining'))
);

-- 2. Create Telemetry Time-Series Table
CREATE TABLE telemetry (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    confidence_score REAL NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    PRIMARY KEY (timestamp, user_id)
);

-- 3. Create Sessions Aggregation Table
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_entered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    room_exited_at TIMESTAMP WITH TIME ZONE,
    dwell_time REAL, -- in seconds
    CONSTRAINT chk_timestamps CHECK (room_exited_at IS NULL OR room_exited_at >= room_entered_at)
);

-- 4. Enable TimescaleDB Hypertables (if Timescale extension is available)
-- SELECT create_hypertable('telemetry', 'timestamp', chunk_time_interval => INTERVAL '1 day');
-- SELECT create_hypertable('sessions', 'room_entered_at', chunk_time_interval => INTERVAL '7 days');

-- 5. Set up Hypertable compression policy to save disk space on historical telemetry
-- ALTER TABLE telemetry SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'user_id'
-- );
-- SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- 6. High-Performance Indices for Relational Queries
CREATE INDEX IF NOT EXISTS idx_telemetry_user_time ON telemetry (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON sessions (user_id, room_entered_at DESC);
"""
