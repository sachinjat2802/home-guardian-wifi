import logging
import httpx
import os
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger("WellnessEngine.IoTOrchestrator")
logging.basicConfig(level=logging.INFO)

# Smart Home / Home Assistant Configurations
HOME_ASSISTANT_URL = os.environ.get("HOME_ASSISTANT_URL", "http://homeassistant.local:8123/api")
HOME_ASSISTANT_TOKEN = os.environ.get("HOME_ASSISTANT_TOKEN", "")

class AyurvedicIotOrchestrator:
    """
    Translates Ayurvedic Dosha and Guna diagnostic telemetry into dynamic, 
    physical smart-home Vastu alignments (lights, acoustics, and HVAC).
    """
    def __init__(self):
        # 1. Extensible Vastu Environmental State Configuration
        self.vastu_states = {
            "Vata": {
                "name": "Vata Grounding (Vayu/Akasha Pacification)",
                "description": "Grounding airy agitation using warm amber light, quiet acoustics, and stable climate.",
                "hvac": {
                    "fan_mode": "low",
                    "target_temp_c": 24.5,
                    "humidifier": "on"
                },
                "lighting": {
                    "color_temp_kelvin": 2000,
                    "brightness_percent": 25,
                    "rgb_color": [245, 158, 11]  # Deep Warm Amber
                },
                "acoustics": {
                    "playlist": "432Hz Grounding Ambient Drone & VAM Mantra",
                    "volume_percent": 15
                }
            },
            "Pitta": {
                "name": "Pitta Cooling (Tejas Pacification)",
                "description": "Cooling fire and metabolic restlessness using dim, cool-teal tones and cool air circulation.",
                "hvac": {
                    "fan_mode": "high",
                    "target_temp_c": 20.0,
                    "humidifier": "off"
                },
                "lighting": {
                    "color_temp_kelvin": 6500,
                    "brightness_percent": 15,
                    "rgb_color": [13, 148, 136]  # Cool Teal/Water tone
                },
                "acoustics": {
                    "playlist": "Soothing Forest Streams, Wind Chimes & RAM Chants",
                    "volume_percent": 12
                }
            },
            "Kapha": {
                "name": "Kapha Activating (Prithvi/Jala Stimulation)",
                "description": "Stimulating stagnant inertia (Tamas) using bright solar lighting and high-frequency music.",
                "hvac": {
                    "fan_mode": "auto",
                    "target_temp_c": 22.0,
                    "humidifier": "off"
                },
                "lighting": {
                    "color_temp_kelvin": 5000,
                    "brightness_percent": 90,
                    "rgb_color": [253, 224, 71]  # Vibrant Solar Yellow
                },
                "acoustics": {
                    "playlist": "Dynamic Surya Namaskar Vedic Chants & Activating Binaural Beats",
                    "volume_percent": 35
                }
            },
            "Balanced": {
                "name": "Sattvic Harmony (Homeostasis)",
                "description": "Sustaining natural daylight rhythms and balanced baseline environment.",
                "hvac": {
                    "fan_mode": "auto",
                    "target_temp_c": 22.5,
                    "humidifier": "auto"
                },
                "lighting": {
                    "color_temp_kelvin": 3500,
                    "brightness_percent": 60,
                    "rgb_color": [255, 255, 255]  # Natural White
                },
                "acoustics": {
                    "playlist": "Deep Silence or Gentle Sitar improvisations",
                    "volume_percent": 10
                }
            }
        }

    async def align_environment(self, user_name: str, primary_dosha: str, confidence: float) -> Dict[str, Any]:
        """
        Executes outbound API requests to smart-home switches to implement physical changes.
        """
        if primary_dosha not in self.vastu_states:
            logger.warning(f"⚠️ Unknown Dosha profile '{primary_dosha}'. Reverting to Balanced.")
            primary_dosha = "Balanced"

        profile = self.vastu_states[primary_dosha]
        logger.info(f"✨ [Vastu Alignment] 🏠 Dynamic adjustment for '{user_name}' -> Triggering {profile['name']}...")
        logger.info(f"👉 Rationale: {profile['description']}")

        # Simulate the physical integration steps
        actions_taken = {
            "hvac_commands": f"Set temperature to {profile['hvac']['target_temp_c']}°C, fan to {profile['hvac']['fan_mode']}.",
            "lighting_commands": f"Fade lights to {profile['lighting']['brightness_percent']}% brightness, RGB {profile['lighting']['rgb_color']}.",
            "acoustics_commands": f"Streaming '{profile['acoustics']['playlist']}' at {profile['acoustics']['volume_percent']}% volume."
        }

        # If Home Assistant API credentials are provided, fire actual non-blocking triggers
        if HOME_ASSISTANT_TOKEN:
            asyncio.create_task(self._fire_home_assistant_triggers(primary_dosha, profile))
        else:
            # Fallback outputting dynamic HA YAML templates directly in server log for easy copy-pasting
            self._print_home_assistant_yaml(user_name, primary_dosha, profile)

        return {
            "status": "success",
            "target_dosha": primary_dosha,
            "actions_executed": actions_taken
        }

    async def _fire_home_assistant_triggers(self, dosha: str, profile: Dict[str, Any]):
        """Fires asynchronous HTTP requests to Home Assistant REST service endpoints."""
        headers = {
            "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                # 1. Update Lighting state
                light_payload = {
                    "entity_id": "light.living_room_mesh",
                    "brightness_pct": profile["lighting"]["brightness_percent"],
                    "rgb_color": profile["lighting"]["rgb_color"]
                }
                await client.post(f"{HOME_ASSISTANT_URL}/services/light/turn_on", json=light_payload, headers=headers, timeout=2.0)
                
                # 2. Update Climate state
                climate_payload = {
                    "entity_id": "climate.main_thermostat",
                    "temperature": profile["hvac"]["target_temp_c"],
                    "fan_mode": profile["hvac"]["fan_mode"]
                }
                await client.post(f"{HOME_ASSISTANT_URL}/services/climate/set_temperature", json=climate_payload, headers=headers, timeout=2.0)
                
                # 3. Update Media Soundscape state
                media_payload = {
                    "entity_id": "media_player.main_speaker",
                    "volume_level": profile["acoustics"]["volume_percent"] / 100.0
                }
                await client.post(f"{HOME_ASSISTANT_URL}/services/media_player/volume_set", json=media_payload, headers=headers, timeout=2.0)
                
                logger.info(f"✅ [IoT Integration] Physical Vastu environment successfully aligned on Home Assistant.")
            except Exception as e:
                logger.error(f"❌ [IoT Integration Failed] Failed to deliver REST command to Home Assistant: {e}")

    def _print_home_assistant_yaml(self, user_name: str, dosha: str, profile: Dict[str, Any]):
        """Generates clean Home Assistant automation templates for physical deployment."""
        yaml_output = f"""
# ----------------------------------------------------------------------
# 🏠 HOME ASSISTANT AUTOMATION TRIGGER TEMPLATE FOR ALWAR PROPERTY
# 👤 Occupant: {user_name} | energetic Profile: {dosha}
# ----------------------------------------------------------------------
alias: "Wellness Vastu Corrective Action - {user_name} ({dosha})"
description: "Triggers ambient sensory changes when sniffer classifies biometric imbalance."
trigger:
  - platform: webhook
    webhook_id: "wellness_trigger_{user_name.lower()}_{dosha.lower()}"
action:
  # 1. Set Vastu Ambient lighting
  - service: light.turn_on
    target:
      entity_id: light.living_room
    data:
      rgb_color: {profile['lighting']['rgb_color']}
      brightness_pct: {profile['lighting']['brightness_percent']}
      
  # 2. Set grounding/cooling HVAC conditions
  - service: climate.set_temperature
    target:
      entity_id: climate.living_room_hvac
    data:
      temperature: {profile['hvac']['target_temp_c']}
      
  # 3. Stream Ayurvedic / Sanskrit Sound therapy
  - service: media_player.volume_set
    target:
      entity_id: media_player.hall_speaker
    data:
      volume_level: {profile['acoustics']['volume_percent'] / 100.0}
      
  - service: media_player.play_media
    target:
      entity_id: media_player.hall_speaker
    data:
      media_content_id: "{profile['acoustics']['playlist']}"
      media_content_type: "music"
# ----------------------------------------------------------------------
"""
        logger.info(yaml_output)
