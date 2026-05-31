"""
Home Guardian WiFi: gait_recognition_backend package

Exposes high-level class wrappers mapping 100% to standard wifi_densepose schemas,
enabling clean and modular package imports for external developers.
"""
from .engine import SensingEngine as WiFiDensePose
from .engine import RuViewBreathingExtractor, RuViewHeartRateExtractor

__all__ = [
    "WiFiDensePose",
    "RuViewBreathingExtractor",
    "RuViewHeartRateExtractor"
]
