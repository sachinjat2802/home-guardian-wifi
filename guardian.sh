#!/usr/bin/env bash
# ==============================================================================
# Home Guardian WiFi: Unified Control Center CLI (guardian.sh)
#
# A single command-line interface integrating all scripts, tests, runtimes,
# Docker deployments, and diagnostic pipelines in one piece.
# ==============================================================================

# HSL Sleek Console Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_banner() {
    echo -e "${CYAN}======================================================================${NC}"
    echo -e "${GREEN}   📡 HOME GUARDIAN WIFI: UNIFIED COMMAND CENTER CONTROL PANEL       ${NC}"
    echo -e "${CYAN}======================================================================${NC}"
}

print_usage() {
    print_banner
    echo -e "Usage: ${YELLOW}./guardian.sh [command]${NC}\n"
    echo -e "Available Commands:"
    echo -e "  ${GREEN}setup${NC}      : Copy generated brand logo to Next.js public directories"
    echo -e "  ${GREEN}start${NC}      : Start the Next.js frontend and Python backend together"
    echo -e "  ${GREEN}test${NC}       : Execute automated PyTest suites verifying DSP filters"
    echo -e "  ${GREEN}proof${NC}      : Replay archived CSI reference signals offline"
    echo -e "  ${GREEN}scan${NC}       : Run lightweight Node.js terminal-based spectrum sweeps"
    echo -e "  ${GREEN}mcp${NC}        : Launch the JSON-RPC Model Context Protocol (MCP) server"
    echo -e "  ${GREEN}docker${NC}     : Spin up the multi-container edge Docker environment"
    echo -e "  ${GREEN}diagnose${NC}   : Run the self-healing Python system diagnostic audits"
    echo -e "  ${GREEN}help${NC}       : Display this control panel help menu"
    echo -e "\nExample: ${YELLOW}./guardian.sh test${NC}"
    echo -e "${CYAN}======================================================================${NC}"
}

if [ -z "$1" ]; then
    print_usage
    exit 0
fi

case "$1" in
    setup)
        print_banner
        echo -e "🔧 Running branding asset migration..."
        if [ -f ".claude-flow/copy_asset.py" ]; then
            python3 .claude-flow/copy_asset.py
        else
            echo -e "${RED}❌ Asset migration utility not found.${NC}"
            exit 1
        fi
        ;;
        
    start)
        print_banner
        echo -e "🚀 Launching unified sensing environments..."
        echo -e "💡 Press Ctrl+C to terminate both servers cleanly.\n"
        
        # Start Python backend in background
        bash start_backend.sh &
        BACKEND_PID=$!
        
        # Start Next.js frontend in foreground
        npm run dev
        
        # Kill backend on exit
        kill $BACKEND_PID 2>/dev/null
        ;;
        
    test)
        print_banner
        echo -e "🧪 Invoking automated PyTests..."
        pytest tests/test_dsp.py
        ;;
        
    proof)
        print_banner
        echo -e "🧬 Replaying legacy CSI signal datasets..."
        python3 archive/replay_proof.py
        ;;
        
    scan)
        print_banner
        echo -e "📡 Launching Node.js spectrum sweep sniffer..."
        node scripts/rf_scan.js
        ;;
        
    mcp)
        print_banner
        echo -e "🔌 Initializing JSON-RPC MCP Server..."
        python3 tools/mcp_server.py
        ;;
        
    docker)
        print_banner
        echo -e "🐳 Spinning up containerized edge services..."
        docker compose up --build
        ;;
        
    diagnose)
        print_banner
        echo -e "🩺 Auditing system health and process locks..."
        python3 .claude-flow/diagnose.py
        ;;
        
    help|--help|-h)
        print_usage
        ;;
        
    *)
        echo -e "${RED}❌ Unknown command: '$1'${NC}"
        print_usage
        exit 1
        ;;
esac
