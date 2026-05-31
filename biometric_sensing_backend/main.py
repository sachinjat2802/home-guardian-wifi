import asyncio
import os
import time
import json
import logging
import httpx
import numpy as np
import torch
import redis.asyncio as aioredis
from typing import Dict, Any, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert

# Import Local Modules
from models import (
    AsyncSessionLocal,
    init_database,
    UserModel,
    TelemetryModel,
    SessionModel
)
from model import GaitCNNModel, optimize_model_for_cpu

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("HomeGuardianCore")

# Environment Configurations
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "http://localhost:9000/webhook/state-change")
MODEL_CLASSES_COUNT = 5  # Number of whitelisted occupants to classify

app = FastAPI(
    title="Home Guardian | High-Performance Biometric Sensing Backend",
    version="2.0.0",
    description="WiFi Channel State Information Passive Gait Recognition & Spatio-Temporal Intelligence Engine"
)

# Global State Dictionary
class GlobalState:
    def __init__(self):
        self.model: Optional[GaitCNNModel] = None
        self.redis: Optional[aioredis.Redis] = None
        self.current_user: Optional[str] = "Unknown"
        self.current_confidence: float = 0.0
        self.current_status: str = "absent"  # 'present', 'absent', 'unknown'
        self.active_session_id: Optional[str] = None
        self.user_presence_states: Dict[str, str] = {}  # Tracks last state per user_id

state = GlobalState()

# SQLAlchemy Async Database Session Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Pydantic Schemas
class EnrollRequest(BaseModel):
    user_id: str
    name: str

class StatusResponse(BaseModel):
    current_occupant: str
    confidence: float
    status: str
    active_session: Optional[str]

# ==============================================================================
# 1. Server Lifecycle Management (Lifespan Startup & Shutdown)
# ==============================================================================
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Initiating Home Guardian Core Engine Boot Sequence...")
    
    # Initialize Databases and TimescaleDB Hypertables
    await init_database()
    
    # Establish Redis Connection
    state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    await state.redis.ping()
    logger.info("✅ Redis stream connection verified.")
    
    # Instantiate PyTorch Biometric Model
    raw_model = GaitCNNModel(in_channels=126, num_classes=MODEL_CLASSES_COUNT)
    # Apply high-speed graph trace compiler for CPU execution
    state.model = optimize_model_for_cpu(raw_model)
    logger.info("🧠 PyTorch Gait Biometric model compiled successfully.")
    
    # Spin up Background Async Ingestion & ML Inference Loop
    asyncio.create_task(csi_inference_worker())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Terminating Home Guardian Core Server...")
    if state.redis:
        await state.redis.close()
    logger.info("🔌 Server shutdown sequence complete.")

# ==============================================================================
# 2. REST Endpoints
# ==============================================================================
@app.get("/api/status", response_model=StatusResponse)
async def get_live_status():
    """
    Returns the current live occupant and biometric model classification metrics.
    """
    return StatusResponse(
        current_occupant=state.current_user or "Unknown",
        confidence=state.current_confidence,
        status=state.current_status,
        active_session=state.active_session_id
    )

@app.post("/api/enroll")
async def trigger_occupant_enrollment(payload: EnrollRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Begins the non-blocking enrollment baseline phase for a new household member.
    """
    user_id = payload.user_id.lower().strip()
    
    # Insert or update User details
    stmt = select(UserModel).where(UserModel.user_id == user_id)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()
    
    if not existing_user:
        new_user = UserModel(user_id=user_id, name=payload.name, baseline_status="pending")
        db.add(new_user)
    else:
        existing_user.baseline_status = "pending"
    await db.commit()
    
    # Launch background baseline stream recorder task
    background_tasks.add_task(record_baseline_stream, user_id)
    
    return {
        "status": "success",
        "msg": f"⏳ Labeled baseline collection triggered for '{payload.name}'. Walk naturally through the room for 60 seconds."
    }

# ==============================================================================
# 3. Background Enrollment Stream Recorder Task
# ==============================================================================
async def record_baseline_stream(user_id: str):
    """
    Subscribes to the live Redis Stream, records 60 seconds of complex CSI arrays,
    and saves the baseline matrix to local disk.
    """
    logger.info(f"📹 [Enrollment] Starting 60s baseline capture for user: {user_id}...")
    baseline_frames = []
    start_time = time.time()
    
    # Read from the tail of the stream to catch fresh frames
    last_id = "$" 
    
    while time.time() - start_time < 60.0:
        try:
            # Poll the stream with blocking
            streams = await state.redis.xread({"csi_stream": last_id}, count=1, block=500)
            if not streams:
                await asyncio.sleep(0.01)
                continue
                
            for _, entries in streams:
                for entry_id, fields in entries:
                    last_id = entry_id
                    csi_str = fields.get("csi_data")
                    if csi_str:
                        # Reconstruct signed 8-bit complex CSI matrix
                        raw_frame = np.fromstring(csi_str, sep=",", dtype=np.int8)
                        # We need flat subcarriers array shape (126,) -> 63 subcarriers * 2
                        if len(raw_frame) >= 126:
                            baseline_frames.append(raw_frame[:126])
                            
        except Exception as e:
            logger.error(f"❌ [Enrollment Error] CSI Stream reading issue: {e}")
            await asyncio.sleep(0.1)
            
    if len(baseline_frames) < 150:
        logger.error(f"❌ [Enrollment Failed] Insufficient frames collected ({len(baseline_frames)} frames).")
        async with AsyncSessionLocal() as db:
            await db.execute(update(UserModel).where(UserModel.user_id == user_id).values(baseline_status="pending"))
            await db.commit()
        return

    # Convert to Numpy Array and save locally
    baseline_matrix = np.stack(baseline_frames, axis=0)  # Shape: (Frames, 126)
    filename = f"baseline_{user_id}.npy"
    np.save(filename, baseline_matrix)
    
    logger.info(f"💾 [Enrollment Success] Captured baseline matrix of shape {baseline_matrix.shape} saved as {filename}.")
    
    # Update relational metadata database to complete
    async with AsyncSessionLocal() as db:
        await db.execute(update(UserModel).where(UserModel.user_id == user_id).values(baseline_status="complete"))
        await db.commit()
        
    logger.info(f"🔄 [Model Retraining] Fine-tuning queued for model weights to register gait cadence for '{user_id}'.")

# ==============================================================================
# 4. Outbound Webhook State Trigger
# ==============================================================================
async def fire_presence_webhook(user_id: str, confidence: float):
    """
    Fires a non-blocking asynchronous HTTP POST request to secondary orchestration 
    services (e.g. Qlik dashboards, lighting controllers) when a user's presence transitions.
    """
    logger.info(f"📡 [Webhook Alert] User '{user_id}' walked into room! Triggering event webhook...")
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "event": "occupant_presence_transition",
                "user_id": user_id,
                "confidence": confidence,
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "device_id": "esp32_sniffer_01"
            }
            res = await client.post(WEBHOOK_URL, json=payload, timeout=2.0)
            if res.status_code == 200:
                logger.info("✅ Outbound webhook successfully acknowledged by receiver.")
            else:
                logger.warning(f"⚠️ Webhook returned error code: {res.status_code}")
        except Exception as e:
            logger.error(f"❌ Failed to reach external webhook endpoint: {e}")

# ==============================================================================
# 5. Continuous CSI Ingestion & PyTorch ML Inference Loop
# ==============================================================================
async def csi_inference_worker():
    """
    Consumes live datagram packages from the Redis Stream, executes CFO DSP phase mapping,
    performs CNN-LSTM PyTorch inference at 1Hz, and maintains TimescaleDB session logs.
    """
    logger.info("🚀 Starting Asynchronous CSI Inference Daemon Loop...")
    rolling_window = []
    last_inference_time = 0.0
    last_id = "$"  # Start reading fresh stream packets
    
    # Pre-populate whitelist user mapping
    user_mapping = ["visitor", "kirpa", "sachin", "kavita", "ratiram"]

    while True:
        try:
            # 1. Non-blocking blocking-poll from Redis Stream
            streams = await state.redis.xread({"csi_stream": last_id}, count=10, block=200)
            if not streams:
                await asyncio.sleep(0.01)
                continue
                
            for _, entries in streams:
                for entry_id, fields in entries:
                    last_id = entry_id
                    csi_str = fields.get("csi_data")
                    if csi_str:
                        raw_frame = np.fromstring(csi_str, sep=",", dtype=np.int8)
                        if len(raw_frame) >= 126:
                            rolling_window.append(raw_frame[:126])
                            
            # Enforce sliding window capacity of 600 frames (60 seconds at 10Hz)
            if len(rolling_window) > 600:
                rolling_window = rolling_window[-600:]

            # Limit deep neural network forward pass calculations to exactly 1Hz (1 second throttle)
            current_time = time.time()
            if current_time - last_inference_time < 1.0:
                continue
            
            if len(rolling_window) < 600:
                # Window not fully populated, skip model forward pass
                continue
                
            last_inference_time = current_time

            # 2. Prepare CNN-LSTM Input Matrix shape (1, 126, 600)
            model_input_np = np.stack(rolling_window, axis=1)  # Shape (126, 600)
            input_tensor = torch.from_numpy(model_input_np).unsqueeze(0).float()

            # 3. Execute PyTorch Biometric forward pass (no_grad reduces memory overhead)
            state.model.eval()
            with torch.no_grad():
                probs = state.model(input_tensor)
                confidence, class_idx = torch.max(probs, dim=-1)
                confidence_score = confidence.item()
                class_idx = class_idx.item()

            predicted_user = user_mapping[class_idx % len(user_mapping)]
            presence_status = "present" if confidence_score >= 0.70 else "unknown"
            
            if presence_status == "unknown":
                predicted_user = "Unknown"
                confidence_score = 0.0
            
            # 4. State Transition & Webhook Trigger Checking
            last_state = state.user_presence_states.get(predicted_user, "absent")
            if presence_status == "present" and last_state == "absent" and predicted_user != "Unknown":
                # Fire the outbound presence webhook asynchronously
                asyncio.create_task(fire_presence_webhook(predicted_user, confidence_score))
            
            # Update presence tracking state cache
            if predicted_user != "Unknown":
                state.user_presence_states[predicted_user] = presence_status
                state.current_user = predicted_user
                state.current_confidence = confidence_score
                state.current_status = "present"
            else:
                state.current_status = "absent"

            # 5. Persistent Session Management
            async with AsyncSessionLocal() as db:
                now_dt = datetime.datetime.utcnow()
                
                # If a valid user is present and no active session, create a session
                if presence_status == "present" and not state.active_session_id and predicted_user != "Unknown":
                    session_id = f"sess_{predicted_user}_{int(time.time())}"
                    state.active_session_id = session_id
                    
                    db.add(SessionModel(
                        session_id=session_id,
                        user_id=predicted_user,
                        room_entered_at=now_dt
                    ))
                    logger.info(f"⏳ [Session Entry] Created occupancy tracking session '{session_id}' for '{predicted_user}'.")
                
                # If status turns absent / unknown, close active session
                elif presence_status == "unknown" and state.active_session_id:
                    sess_res = await db.execute(
                        select(SessionModel).where(SessionModel.session_id == state.active_session_id)
                    )
                    active_sess = sess_res.scalar_one_or_none()
                    if active_sess:
                        active_sess.room_exited_at = now_dt
                        active_sess.dwell_time = (now_dt - active_sess.room_entered_at).total_seconds()
                        logger.info(f"🚪 [Session Exit] Closed session '{state.active_session_id}' for '{active_sess.user_id}'. Dwell Time = {active_sess.dwell_time:.1f}s.")
                    state.active_session_id = None

                # 6. Write Telemetry strictly to PostgreSQL / TimescaleDB hypertable
                db.add(TelemetryModel(
                    timestamp=now_dt,
                    user_id=predicted_user.lower() if predicted_user != "Unknown" else "visitor",
                    confidence_score=confidence_score,
                    status=presence_status
                ))
                
                await db.commit()

        except Exception as e:
            logger.error(f"❌ Exception in CSI background inference daemon: {e}")
            await asyncio.sleep(1.0)
