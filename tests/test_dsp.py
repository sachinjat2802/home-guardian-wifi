#!/usr/bin/env python3
import pytest
import numpy as np
import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gait_recognition_backend.engine import RuViewBreathingExtractor, RuViewHeartRateExtractor

def test_butterworth_filter_limits():
    """
    Test that the Respiration Butterworth IIR Bandpass Filter computes 
    valid output boundaries without saturating or overflowing.
    """
    extractor = RuViewBreathingExtractor(fs=2.0)
    
    # Simulating a quiet breathing sine wave at 0.25 Hz (15 RPM)
    t = np.arange(0, 30, 0.5) # 2Hz sampling frequency
    sine_signal = 82.0 + 0.5 * np.sin(2 * np.pi * 0.25 * t)
    
    outputs = []
    for sample in sine_signal:
        val = extractor.feed(sample)
        outputs.append(val)
        
    # Verify that values are floating numbers and filter doesn't saturate to infinity
    assert all(isinstance(v, float) for v in outputs)
    assert not np.isnan(outputs).any()
    assert not np.isinf(outputs).any()

def test_heart_rate_autocorrelation():
    """
    Test that the Cardiac Pitch Autocorrelation Lag sweeps are calculated correctly
    and return logical heart rate limits (45 to 120 BPM).
    """
    extractor = RuViewHeartRateExtractor(fs=2.0)
    
    # Feed static samples to see stable rate extraction
    for _ in range(20):
        extractor.feed(82.0)
        
    rate = extractor.get_rate()
    assert isinstance(rate, int)
    assert 45 <= rate <= 120
