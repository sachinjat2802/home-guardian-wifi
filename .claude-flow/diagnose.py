#!/usr/bin/env python3
import os
import sys
import json
import socket
import sqlite3
import subprocess
import re
from datetime import datetime

# HSL Sleek Console Colors
GREEN = '\033[0;32m'
CYAN = '\033[0;36m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'

STATE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "state.json"))
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "wifi_guardian.db"))

def print_banner():
    print(f"{CYAN}======================================================================{NC}")
    print(f"{GREEN}   🤖 CLAUDE-FLOW: AGENT ORCHESTRATOR & SELF-HEALING DIAGNOSTIC SUITE  {NC}")
    print(f"{CYAN}======================================================================{NC}")

def check_python_dependencies():
    print(f"{CYAN}[1/5] Checking Python scientific and server packages...{NC}")
    packages = ["fastapi", "uvicorn", "numpy", "torch", "aiosqlite", "websockets", "sqlalchemy"]
    missing = []
    for pkg in packages:
        try:
            __import__(pkg)
            print(f"  ✅ {pkg}: installed")
        except ImportError:
            print(f"  ❌ {pkg}: MISSING")
            missing.append(pkg)
    return len(missing) == 0

def check_port_conflicts():
    print(f"\n{CYAN}[2/5] Inspecting Port 8080 bindings...{NC}")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", 8080))
        s.close()
        print("  ✅ Port 8080: FREE (Ready for startup)")
        return "FREE"
    except socket.error:
        print(f"  ⚠️ Port 8080: LOCKED (Another server is running or zombified)")
        
        # Self-healing attempt: Find process lock using lsof/fuser
        try:
            result = subprocess.run(["lsof", "-t", "-i", ":8080"], stdout=subprocess.PIPE, text=True)
            if result.stdout.strip():
                pids = result.stdout.strip().split("\n")
                print(f"  🔧 Found locks on PID(s): {', '.join(pids)}")
                return f"LOCKED_BY_PIDS_{'_'.join(pids)}"
        except Exception:
            pass
        return "LOCKED"

def check_database_integrity():
    print(f"\n{CYAN}[3/5] Verifying SQLite database integrity...{NC}")
    if not os.path.exists(DB_PATH):
        print(f"  ❌ SQLite DB not found at: {DB_PATH}")
        return "MISSING"
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        row = cursor.fetchone()
        conn.close()
        
        if row and row[0] == "ok":
            print("  ✅ SQLite Database: INTEGRITY CHECK PASSED")
            return "OK"
        else:
            print(f"  ❌ SQLite Database Corrupted: {row}")
            return "CORRUPTED"
    except Exception as e:
        print(f"  ❌ Database access failed: {e}")
        return f"ERROR_{e}"

def check_wifi_interface():
    print(f"\n{CYAN}[4/5] Inspecting host wireless parameters...{NC}")
    
    # Identify active interface
    iface = "wlo1"
    try:
        devices = os.listdir('/sys/class/net')
        wls = [d for d in devices if d.startswith('wl')]
        if wls:
            iface = wls[0]
    except Exception:
        pass
    
    print(f"  👉 Identified WiFi interface: {iface}")
    
    # Check Power Save state
    power_save_state = "Unknown"
    try:
        result = subprocess.run(["iw", "dev", iface, "get", "power_save"], stdout=subprocess.PIPE, text=True)
        if "Power save: on" in result.stdout:
            power_save_state = "ON"
            print(f"  ⚠️ {RED}WARNING: WiFi Power Save is currently ENABLED.{NC}")
            print(f"     This will trigger RTT latency spikes (10ms+) and rate downshifts.")
            print(f"     👉 Run: {CYAN}sudo iw dev {iface} set power_save off{NC} to fix this.")
        elif "Power save: off" in result.stdout:
            power_save_state = "OFF"
            print(f"  ✅ WiFi Power Save is DISABLED (Maximum responsiveness locked)")
    except Exception:
        print("  ⚠️ Run: 'sudo apt install iw' to fetch WiFi power saving status")
        
    return iface, power_save_state

def update_orchestrator_state(deps_ok, port_status, db_status, iface, ps_state):
    print(f"\n{CYAN}[5/5] Updating Claude Flow orchestrator state file...{NC}")
    
    health_status = "HEALTHY"
    if not deps_ok or db_status != "OK":
        health_status = "CRITICAL"
    elif "LOCKED" in port_status:
        health_status = "WARNING"
        
    state_data = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                state_data = json.load(f)
        except Exception:
            pass
            
    from datetime import timezone
    # Update metrics
    state_data["last_active"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    state_data["system_health"] = {
        "status": health_status,
        "db_integrity": db_status,
        "last_self_healing_check": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hardware_telemetry": {
            "active_interface": iface,
            "power_save": ps_state,
            "pinger_status": "ONLINE" if deps_ok else "OFFLINE"
        }
    }
    
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state_data, f, indent=2)
        print("  ✅ State file updated successfully.")
    except Exception as e:
        print(f"  ❌ Failed to write state file: {e}")

def main():
    print_banner()
    deps_ok = check_python_dependencies()
    port_status = check_port_conflicts()
    db_status = check_database_integrity()
    iface, ps_state = check_wifi_interface()
    update_orchestrator_state(deps_ok, port_status, db_status, iface, ps_state)
    
    print(f"\n{GREEN}======================================================================{NC}")
    print(f"{GREEN}   ✅ DIAGNOSTICS COMPLETE. SYSTEM HEALTH: {'HEALTHY' if db_status == 'OK' and deps_ok else 'ATTENTION REQUIRED'} {NC}")
    print(f"{GREEN}======================================================================{NC}")

if __name__ == "__main__":
    main()
