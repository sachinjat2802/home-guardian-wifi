#!/usr/bin/env python3
"""
Home Guardian WiFi: Minimal WebSocket Consumer Client Example

This runnable script demonstrates how to connect to the unified Python backend
WebSocket gateway, listen for dynamic gait/vital events, and log JSON frames.
"""
import asyncio
import websockets
import json
import sys

# HSL Sleek Console Colors
GREEN = '\033[0;32m'
CYAN = '\033[0;36m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'

WS_URI = "ws://localhost:8080"

async def monitor_events():
    print(f"{CYAN}======================================================================{NC}")
    print(f"{GREEN}   📡 HG-WIFI: MINIMAL WEBSOCKET SENSING CONSUMER EXAMPLE            {NC}")
    print(f"{CYAN}======================================================================{NC}")
    print(f"🔌 Connecting to unified sensing server at {CYAN}{WS_URI}{NC}...")
    
    try:
        async with websockets.connect(WS_URI) as websocket:
            print(f"✅ {GREEN}CONNECTED!{NC} Listening for real-time micro-Doppler signals...\n")
            
            frame_count = 0
            while True:
                # Receive the frame
                message = await websocket.recv()
                data = json.loads(message)
                frame_count += 1
                
                # Fetch telemetry and active vitals
                telemetry = data.get("telemetry", {})
                analysis = data.get("analysis", {})
                entities = analysis.get("entities", [])
                
                print(f"[{CYAN}Frame #{frame_count}{NC}] "
                      f"RSSI: {YELLOW}{telemetry.get('rssi_dbm', 'N/A')} dBm{NC} | "
                      f"Active Occupants: {GREEN}{len(entities)}{NC} | "
                      f"Link Health: {telemetry.get('noise_floor_dbm') is not None and 'EXCELLENT' or 'N/A'}")
                
                # Print active vital readings
                for entity in entities:
                    if entity.get("type") == "person" and "vitals" in entity:
                        v = entity["vitals"]
                        print(f"  👉 Occupant: {CYAN}{entity.get('name')}{NC} ({entity.get('status')}) | "
                              f"Heart Rate: {GREEN}{v.get('heartRate')} BPM{NC} | "
                              f"Respiration: {GREEN}{v.get('breathingRate')} RPM{NC} | "
                              f"HRV: {v.get('hrv')} ms")
                print("-" * 70)
                
    except websockets.exceptions.ConnectionClosedOK:
        print(f"\n🔌 Connection closed cleanly by server.")
    except Exception as e:
        print(f"\n{RED}❌ Connection failed: {e}{NC}")
        print("💡 Ensure your unified Python backend is running (bash start_backend.sh)")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(monitor_events())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}🔌 Monitor terminated by user. Exiting...{NC}")
