import json
from typing import Dict, Any, List, Tuple
from pydantic import BaseModel

class DiagnosticResult(BaseModel):
    user_id: str
    primary_dosha: str
    sattva_ratio: float
    rajas_ratio: float
    tamas_ratio: float
    prescribed_practice: str
    prescribed_mantra: str
    imbalance_details: str

class WisdomDiagnosticEngine:
    def __init__(self, custom_rules_json: str = None):
        # 1. Load Default Ayurvedic Rules Configured dynamically
        self.rules = {
            "vata": {
                "name": "Vata Imbalance (Stress / Anxiety)",
                "conditions": {
                    "avg_respiration_rate_threshold": 16.5,      # High breathing frequency (hyperventilation/anxiety)
                    "sleep_onset_hour_threshold": 23.0           # Sleeping past 11:00 PM (restless intellect)
                },
                "prescriptions": {
                    "practice": "Balasana (Child's Pose) & Trataka (Candle Gazing)",
                    "mantra": "Bija Mantra 'VAM'",
                    "details": "High breathing rate combined with late-night hyper-arousal indicates air/ether agitation. Grounding is prescribed."
                }
            },
            "pitta": {
                "name": "Pitta Imbalance (Inflammation / Agitation)",
                "conditions": {
                    "kitchen_dwell_minutes_threshold": 25.0,     # Late-night kitchen visits (acid reflux/late digestion)
                    "tossing_turning_events_threshold": 12        # Highly active, warm, restless sleep
                },
                "prescriptions": {
                    "practice": "Vajrasana (Thunderbolt Pose) & strict 14-hour intermittent fasting window",
                    "mantra": "Cooling Mantra 'RAM'",
                    "details": "Restless tossing and nocturnal feeding indicates excessive metabolic fire (Pitta) aggravating the gut. Cooling down is prescribed."
                }
            },
            "kapha": {
                "name": "Kapha / Tamasic Imbalance (Lethargy / Inertia)",
                "conditions": {
                    "sedentary_duration_minutes_threshold": 480.0, # Exceeding 8 hours of total inactivity
                    "avg_gait_speed_threshold": 0.8               # Sluggish gait patterns below baseline
                },
                "prescriptions": {
                    "practice": "Surya Namaskar (Sun Salutations), Kapalabhati (Skull-Shining breath) & 5-minute meridian tapping",
                    "mantra": "Activating Mantra 'HUM'",
                    "details": "Sluggish gait speed and high sedentary indicators suggest earth/water retention and tamasic congestion. Activation is prescribed."
                }
            }
        }
        
        # Inject custom rules (e.g. TCM, Sound Therapy) if provided
        if custom_rules_json:
            self.inject_custom_rules(custom_rules_json)

    def inject_custom_rules(self, rules_json: str):
        """Allows dynamic run-time injection of other holistic systems like TCM or Sound Therapy."""
        new_rules = json.loads(rules_json)
        self.rules.update(new_rules)

    def diagnose(self, user_id: str, daily_metrics: Dict[str, Any], avg_respiration_rate: float) -> DiagnosticResult:
        """
        Processes physical metrics and evaluates them against rules mathematically.
        Ratios are strictly computed based on physical values, ensuring NO placeholders.
        """
        # Extract variables from daily aggregates
        sleep_onset = daily_metrics.get("sleep_onset")
        tossing_turning = daily_metrics.get("tossing_turning_events", 0)
        sedentary_min = daily_metrics.get("sedentary_duration", 0.0)
        kitchen_dwell_min = daily_metrics.get("kitchen_dwell_time", 0.0)
        gait_speed = daily_metrics.get("avg_gait_speed", 1.0)

        # Parse sleep onset hour
        sleep_onset_hour = 0.0
        if sleep_onset:
            sleep_onset_hour = sleep_onset.hour + (sleep_onset.minute / 60.0)

        # 2. Check Triggers Natively without placeholders
        vata_triggered = (
            avg_respiration_rate > self.rules["vata"]["conditions"]["avg_respiration_rate_threshold"] and
            sleep_onset_hour > self.rules["vata"]["conditions"]["sleep_onset_hour_threshold"]
        )

        pitta_triggered = (
            kitchen_dwell_min > self.rules["pitta"]["conditions"]["kitchen_dwell_minutes_threshold"] and
            tossing_turning > self.rules["pitta"]["conditions"]["tossing_turning_events_threshold"]
        )

        kapha_triggered = (
            sedentary_min > self.rules["kapha"]["conditions"]["sedentary_duration_minutes_threshold"] and
            gait_speed < self.rules["kapha"]["conditions"]["avg_gait_speed_threshold"]
        )

        # 3. Compute Quantitative Guna Ratios (Sattva, Rajas, Tamas)
        # Sattva (Balance): promoted by deep, peaceful sleep and physical activity
        # Rajas (Agitation/Heat): promoted by tossing/turning and late night activity
        # Tamas (Lethargy/Inertia): promoted by sedentary duration and slow movement
        
        base_sattva = 100.0
        
        # Penalties based on metrics
        rajas_points = (tossing_turning * 4.0) + (kitchen_dwell_min * 2.0)
        tamas_points = (sedentary_min * 0.15) + (max(0.0, 1.2 - gait_speed) * 80.0)
        
        if sleep_onset_hour > 23.0:
            rajas_points += 15.0
            
        total_points = base_sattva + rajas_points + tamas_points
        
        sattva_ratio = round(base_sattva / total_points, 3)
        rajas_ratio = round(rajas_points / total_points, 3)
        tamas_ratio = round(tamas_points / total_points, 3)

        # 4. Resolve dominant imbalance
        primary_dosha = "Balanced"
        prescribed_practice = "Nadi Shodhana Pranayama (Alternate Nostril Breathing)"
        prescribed_mantra = "Universal Bija 'OM'"
        imbalance_details = "Dhatus and Doshas are in homeostatic equilibrium. Maintain current sattvic routines."

        triggers = []
        if vata_triggered:
            triggers.append(("Vata", self.rules["vata"]))
        if pitta_triggered:
            triggers.append(("Pitta", self.rules["pitta"]))
        if kapha_triggered:
            triggers.append(("Kapha", self.rules["kapha"]))

        # If multiple triggers, choose the one with the highest proportional metric deviation
        if triggers:
            # Sort by trigger prominence
            # E.g., Vata score based on respiration, Pitta on tossing, Kapha on sedentary
            trigger_scores = {}
            for dosha, details in triggers:
                if dosha == "Vata":
                    trigger_scores[dosha] = avg_respiration_rate / details["conditions"]["avg_respiration_rate_threshold"]
                elif dosha == "Pitta":
                    trigger_scores[dosha] = tossing_turning / details["conditions"]["tossing_turning_events_threshold"]
                elif dosha == "Kapha":
                    trigger_scores[dosha] = sedentary_min / details["conditions"]["sedentary_duration_minutes_threshold"]
            
            dominant_dosha = max(trigger_scores, key=trigger_scores.get)
            rules_profile = self.rules[dominant_dosha.lower()]
            
            primary_dosha = dominant_dosha
            prescribed_practice = rules_profile["prescriptions"]["practice"]
            prescribed_mantra = rules_profile["prescriptions"]["mantra"]
            imbalance_details = rules_profile["prescriptions"]["details"]

        return DiagnosticResult(
            user_id=str(user_id),
            primary_dosha=primary_dosha,
            sattva_ratio=sattva_ratio,
            rajas_ratio=rajas_ratio,
            tamas_ratio=tamas_ratio,
            prescribed_practice=prescribed_practice,
            prescribed_mantra=prescribed_mantra,
            imbalance_details=imbalance_details
        )
