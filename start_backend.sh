#!/bin/bash

# ==============================================================================
# Home Guardian WiFi: High-Performance Python Backend Launcher
# ==============================================================================

# HSLsleek colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}  🐍 HOME GUARDIAN WIFI: UNIFIED PYTHON BACKEND SERVER INITIALIZATION ${NC}"
echo -e "${CYAN}======================================================================${NC}"

# 1. Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: Python 3 is not installed on this system.${NC}"
    exit 1
fi

# 2. Check and install essential packages
echo -e "${CYAN}[1/3] Validating system dependency packages...${NC}"
python3 -c "
import fastapi, uvicorn, numpy, torch, aiosqlite, httpx, sqlalchemy
print('✅ All dependency packages are successfully installed!')
" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Warning: Some required packages (FastAPI, Uvicorn, Torch, NumPy, aiosqlite) might be missing.${NC}"
    echo -e "${CYAN}Installing missing requirements...${NC}"
    
    # Try using python3 -m pip first
    python3 -m pip install fastapi uvicorn numpy torch aiosqlite httpx sqlalchemy websockets --break-system-packages --quiet
    
    if [ $? -ne 0 ]; then
        if command -v pip3 &> /dev/null; then
            pip3 install fastapi uvicorn numpy torch aiosqlite httpx sqlalchemy websockets --break-system-packages --quiet
        else
            echo -e "${RED}❌ Error: Neither python3 -m pip nor pip3 were found.${NC}"
            echo -e "Please install pip or system-wide dependencies using apt:"
            echo -e "  👉 ${CYAN}sudo apt update && sudo apt install -y python3-pip python3-numpy python3-torch${NC}"
            exit 1
        fi
    fi
fi

# 3. Database configuration validation
echo -e "${CYAN}[2/3] Verifying SQLite database configurations...${NC}"
if [ -f "wifi_guardian.db" ]; then
    echo -e "💾 Found 'wifi_guardian.db' at process root."
else
    echo -e "${YELLOW}⚠️ Warning: 'wifi_guardian.db' not found in project root. Creating schema templates...${NC}"
fi

# Free up port 8080/tcp to prevent 'Address already in use' errors
if command -v fuser &> /dev/null; then
    fuser -k 8080/tcp &> /dev/null || true
elif command -v lsof &> /dev/null; then
    lsof -t -i :8080 | xargs kill -9 &> /dev/null || true
fi

# 4. Booting Server
echo -e "${CYAN}[3/3] Starting Unified Spatial Sensing & WebSocket Engine...${NC}"
echo -e "${GREEN}----------------------------------------------------------------------"
echo -e "📡 WebSocket Dashboard Server: ws://localhost:8080 (Front-End Connection)"
echo -e "🚀 REST APIs & RAG AI Gateway: http://localhost:8080"
echo -e "📡 WiFi Adapter Sensing:        Host WiFi Interface (Direct RSSI/Signal Polling)"
echo -e "🧠 PyTorch ML Device:          CUDA GPU / CPU (Edge INT8 Quantized)"
echo -e "----------------------------------------------------------------------${NC}"

export PYTHONUNBUFFERED=1
export PYTHONPATH=.
python3 gait_recognition_backend/app.py
