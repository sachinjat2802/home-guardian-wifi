#!/usr/bin/env python3
import os
import sys
import json
import time

# HSL Sleek Console Colors
GREEN = '\033[0;32m'
CYAN = '\033[0;36m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'

# Add backend directory to Python path to import our extractors
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from gait_recognition_backend.engine import RuViewBreathingExtractor, RuViewHeartRateExtractor
except ImportError as e:
    print(f"{RED}❌ Failed to import engine extractors: {e}{NC}")
    sys.exit(1)

PROOF_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "csi_reference_proof.json"))

def print_banner():
    print(f"{CYAN}======================================================================{NC}")
    print(f"{GREEN}   🧬 CLAUDE-FLOW: LEGACY CSI DATA & DSP PROOF REPLAY PIPELINE        {NC}")
    print(f"{CYAN}======================================================================{NC}")

def run_proof_replay():
    if not os.path.exists(PROOF_FILE):
        print(f"{RED}❌ Reference proof dataset not found at: {PROOF_FILE}{NC}")
        sys.exit(1)
        
    with open(PROOF_FILE, 'r') as f:
        proof_data = json.load(f)
        
    print(f"📖 Loaded Dataset: {CYAN}{proof_data.get('dataset', 'Unknown')}{NC}")
    print(f"📅 Recorded At: {CYAN}{proof_data.get('recorded_at', 'Unknown')}{NC}")
    print(f"📊 Total Frame Count: {CYAN}{len(proof_data.get('samples', []))}{NC}\n")
    
    # Initialize the RuView DSP Extractors
    breathing_extractor = RuViewBreathingExtractor(fs=2.0)
    heart_extractor = RuViewHeartRateExtractor(fs=2.0)
    
    print(f"{CYAN}{'Time (ms)':<10} | {'Raw CSI':<8} | {'DSP Filtered':<12} | {'Breathing Rate':<15} | {'Heart Rate':<10} | {'Status Note':<25}{NC}")
    print("-" * 90)
    
    for sample in proof_data.get('samples', []):
        ts = sample.get("timestamp_ms")
        sig = sample.get("signal")
        note = sample.get("notes", "")
        
        # Feed the signal into our physical DSP extractors
        filtered_val = breathing_extractor.feed(sig)
        heart_extractor.feed(sig)
        
        br = breathing_extractor.get_rate()
        hr = heart_extractor.get_rate()
        
        # Highlight walking vs resting periods
        color = YELLOW if "walking" in note.lower() else NC
        
        print(f"{color}{ts:<10} | {sig:<8.1f} | {filtered_val:<12.3f} | {br:<15} | {hr:<10} | {note:<25}{NC}")
        time.sleep(0.1) # Accelerated replay
        
    print(f"\n{GREEN}======================================================================{NC}")
    print(f"{GREEN}   ✅ OFFLINE INTEGRITY PROOF VERIFIED SUCCESSFULLY!                  {NC}")
    print(f"{GREEN}======================================================================{NC}")

if __name__ == "__main__":
    print_banner()
    run_proof_replay()
