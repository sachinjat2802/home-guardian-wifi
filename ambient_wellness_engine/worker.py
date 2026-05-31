import asyncio
import datetime
import logging
import httpx
from uuid import UUID
from typing import Dict, Any, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

# Import models & diagnostics
from ambient_wellness_engine.models import VitalTelemetry, DailyAggregates, WellnessLog
from ambient_wellness_engine.diagnostics import WisdomDiagnosticEngine

logger = logging.getLogger("WellnessEngine.Worker")
logging.basicConfig(level=logging.INFO)

OLLAMA_API_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3"  # Standard Ollama model

class PanchangBackgroundWorker:
    def __init__(self, async_session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = async_session_factory
        self.diagnostic_engine = WisdomDiagnosticEngine()

    async def execute_daily_rollup_for_user(self, user_id: UUID, date: datetime.date) -> Optional[WellnessLog]:
        """Fetches the previous 24 hours of data, evaluates metrics, queries Ollama, and persists WellnessLog."""
        logger.info(f"🌅 [Panchang Worker] Running daily wellness rollup for user {user_id} on {date}...")
        
        async with self.session_factory() as session:
            try:
                # 1. Fetch DailyAggregates for the requested date
                query_aggregates = select(DailyAggregates).where(
                    DailyAggregates.user_id == user_id,
                    DailyAggregates.date == date
                )
                res_aggregates = await session.execute(query_aggregates)
                daily_agg = res_aggregates.scalar_one_or_none()
                
                if not daily_agg:
                    logger.warning(f"⚠️ [Panchang Worker] No DailyAggregates found for user {user_id} on date {date}. Skipping.")
                    return None

                # 2. Fetch High-frequency Telemetry (Calculate average respiration rate over previous 24 hours)
                start_time = datetime.datetime.combine(date, datetime.time.min)
                end_time = datetime.datetime.combine(date, datetime.time.max)
                
                query_telemetry = select(func.avg(VitalTelemetry.respiration_rate)).where(
                    VitalTelemetry.user_id == user_id,
                    VitalTelemetry.timestamp.between(start_time, end_time)
                )
                res_telemetry = await session.execute(query_telemetry)
                avg_resp = res_telemetry.scalar() or 14.5  # Fallback to normal respiration if empty

                # 3. Process metrics through the Diagnostic Engine
                metrics_dict = {
                    "sleep_onset": daily_agg.sleep_onset,
                    "wake_time": daily_agg.wake_time,
                    "tossing_turning_events": daily_agg.tossing_turning_events,
                    "sedentary_duration": daily_agg.sedentary_duration,
                    "kitchen_dwell_time": daily_agg.kitchen_dwell_time,
                    "avg_gait_speed": daily_agg.avg_gait_speed
                }
                
                diagnosis = self.diagnostic_engine.diagnose(str(user_id), metrics_dict, avg_resp)
                logger.info(f"⚖️ [Panchang Worker] Diagnostic Outcome: Dominant Imbalance = {diagnosis.primary_dosha}")

                # 4. Construct High-Context Mythological LLM Prompt
                system_prompt = (
                    "You are a compassionate Ayurvedic sage, yogic scholar, and classical mythologist. "
                    "Your task is to write a highly personalized, deep daily wellness morning prescription (a 'Panchang') "
                    "for a modern practitioner based on their raw biometric telemetry and Ayurvedic diagnostics. "
                    "Avoid generic summaries. Combine hard data points with poetic, ancient mythological wisdom."
                )

                user_prompt = f"""
                Write the morning Panchang wellness guide for user {user_id}.

                === BIOMETRIC TELEMETRY & PHYSICAL DATA ===
                - Respiration Frequency (Avg): {avg_resp:.2f} breaths/min
                - Sleep Onset: {daily_agg.sleep_onset.strftime('%I:%M %p') if daily_agg.sleep_onset else 'N/A'}
                - Wake Time: {daily_agg.wake_time.strftime('%I:%M %p') if daily_agg.wake_time else 'N/A'}
                - Sleep Tossing & Turning: {daily_agg.tossing_turning_events} restless episodes
                - Sedentary Duration: {daily_agg.sedentary_duration:.1f} minutes of inactivity
                - Kitchen Dwell Time: {daily_agg.kitchen_dwell_time:.1f} minutes
                - Gait Movement Speed: {daily_agg.avg_gait_speed:.2f} m/s

                === DIAGNOSTIC HARMONY METRICS ===
                - Primary Imbalance Identified: {diagnosis.primary_dosha}
                - Sattva (Harmony): {diagnosis.sattva_ratio * 100:.1f}%
                - Rajas (Agitation/Heat): {diagnosis.rajas_ratio * 100:.1f}%
                - Tamas (Inertia/Sluggish): {diagnosis.tamas_ratio * 100:.1f}%
                
                === PRESCRIPTIONS ===
                - Recommended Yogic Practice: {diagnosis.prescribed_practice}
                - Sacred Mantra Meditation: {diagnosis.prescribed_mantra}
                - Diagnostic Rationale: {diagnosis.imbalance_details}

                Please structure your response into three short, beautiful Sanskrit-rooted sections:
                1. 🌅 [Suryodaya - The Awakening]: Acknowledge their physical state poetically, calling out respiration/sleep anomalies. Refer to mythological entities or elements (like Agni, Prana, Vayu, or Shiva's stillness).
                2. ⚖️ [Dharma of Balance]: Deeply explain how their metrics triggered their {diagnosis.primary_dosha} imbalance, utilizing Ayurvedic principles.
                3. 🧘 [Sadhana]: Provide an actionable guide on how to perform '{diagnosis.prescribed_practice}' while chanting '{diagnosis.prescribed_mantra}'.
                """

                # 5. Connect to local Ollama API
                logger.info("🤖 [Panchang Worker] Sending payload to Ollama LLM endpoint...")
                llm_insight = "The cosmic alignment indicates steady prana, maintain alternate nostril breathing."
                try:
                    payload = {
                        "model": OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": False
                    }
                    async with httpx.AsyncClient(timeout=90.0) as client:
                        response = await client.post(OLLAMA_API_URL, json=payload)
                        if response.status_code == 200:
                            result = response.json()
                            llm_insight = result["message"]["content"]
                        else:
                            logger.error(f"❌ Ollama returned status code {response.status_code}: {response.text}")
                except Exception as ollama_err:
                    logger.error(f"⚠️ Failed calling local Ollama service. Using fallback baseline guidance: {ollama_err}")

                # 6. Save or Update the WellnessLog
                query_log = select(WellnessLog).where(
                    WellnessLog.user_id == user_id,
                    WellnessLog.date == date
                )
                res_log = await session.execute(query_log)
                wellness_log = res_log.scalar_one_or_none()
                
                if not wellness_log:
                    wellness_log = WellnessLog(
                        date=date,
                        user_id=user_id,
                        sattva_ratio=diagnosis.sattva_ratio,
                        rajas_ratio=diagnosis.rajas_ratio,
                        tamas_ratio=diagnosis.tamas_ratio,
                        primary_dosha_imbalance=diagnosis.primary_dosha,
                        prescribed_practice=diagnosis.prescribed_practice,
                        prescribed_mantra=diagnosis.prescribed_mantra,
                        llm_insight=llm_insight
                    )
                    session.add(wellness_log)
                else:
                    # Update existing record
                    wellness_log.sattva_ratio = diagnosis.sattva_ratio
                    wellness_log.rajas_ratio = diagnosis.rajas_ratio
                    wellness_log.tamas_ratio = diagnosis.tamas_ratio
                    wellness_log.primary_dosha_imbalance = diagnosis.primary_dosha
                    wellness_log.prescribed_practice = diagnosis.prescribed_practice
                    wellness_log.prescribed_mantra = diagnosis.prescribed_mantra
                    wellness_log.llm_insight = llm_insight
                
                await session.commit()
                logger.info(f"💾 [Panchang Worker] Daily WellnessLog successfully persisted for user {user_id}.")
                return wellness_log
                
            except Exception as e:
                logger.error(f"❌ Error compiling daily rollup for user {user_id}: {e}", exc_info=True)
                await session.rollback()
                return None

    async def schedule_daily_worker_loop(self, active_users: Optional[list[UUID]] = None):
        """Runs the background task precisely at 4:00 AM daily, dynamically querying active occupants."""
        logger.info("⏰ [Panchang Worker] Starting background scheduling worker loop...")
        while True:
            now = datetime.datetime.now()
            # Calculate next 4:00 AM run time
            target_time = now.replace(hour=4, minute=0, second=0, microsecond=0)
            if now >= target_time:
                target_time += datetime.timedelta(days=1)
                
            sleep_seconds = (target_time - now).total_seconds()
            logger.info(f"⏰ [Panchang Worker] Next run scheduled for {target_time} (Sleeping {sleep_seconds:.1f} seconds)")
            await asyncio.sleep(sleep_seconds)
            
            # Execute daily rollups for the previous day (yesterday)
            yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).date()
            
            # Dynamically fetch enrolled users from historical aggregates to avoid static list stale issues
            users_to_process = active_users
            if not users_to_process:
                try:
                    async with self.session_factory() as session:
                        query_users = select(DailyAggregates.user_id).distinct()
                        res_users = await session.execute(query_users)
                        users_to_process = list(res_users.scalars().all())
                except Exception as db_err:
                    logger.error(f"❌ [Panchang Worker] Failed dynamically querying users: {db_err}")
                    users_to_process = []
            
            for user_id in users_to_process:
                await self.execute_daily_rollup_for_user(user_id, yesterday)
