# 🚀 Home Guardian WiFi: Developer & Agent Guide

This file provides comprehensive guidelines for building, testing, running, and maintaining the **Home Guardian WiFi** system. It also acts as the central registry for our **Architecture Decision Records (ADRs)**.

---

## 🎛️ Unified Control Center CLI (guardian.sh)

We have integrated all scripts, tests, runtimes, Docker environments, and diagnostics in one piece. Use the unified command line control panel:

```bash
# Make executable (run once in host terminal)
chmod +x guardian.sh

# Run subcommands
./guardian.sh start      # Starts Next.js frontend and Python backend together
./guardian.sh test       # Runs automated PyTest suites checking DSP filters
./guardian.sh proof      # Replays archived CSI reference signals offline
./guardian.sh scan       # Runs lightweight Node.js terminal spectrum sweeps
./guardian.sh mcp        # Launches Model Context Protocol (MCP) server
./guardian.sh docker     # Spins up the multi-container Docker environment
./guardian.sh diagnose   # Runs system diagnostics processes locks checks
./guardian.sh setup      # Copies generated brand logo to Next.js public folders
```

### 4. Automated Testing & Verification
*   **Run DSP & Vitals PyTests:** `pytest tests/test_dsp.py`
    *(Runs unit tests checking Butterworth difference filters and heart rate autocorrelation)*
*   **Run Offline CSI Proof Replay:** `python3 archive/replay_proof.py`
    *(Replays archived reference CSI signals to verify DSP mathematical extraction layers)*
*   **Run Node.js Spectrum Sweep:** `node scripts/rf_scan.js --port 5006`
    *(Launches lightweight console-based spectrum sniffer simulation)*

### 5. Edge & Container Deployments (Docker)
*   **Launch Production Containers:** `docker compose up --build`
    *(Orchestrates production builds for Next.js frontend on port 3000 and Python backend on host port 8080)*

### 6. AI Agent MCP Integration
*   **Launch Model Context Protocol Server:** `python3 tools/mcp_server.py`
    *(Exposes physical presence coordinates and biometric snapshots as standard tools for AI Agents)*

---

## 📐 Architecture Decision Records (ADR) Log

We maintain a strict record of architectural decisions to ensure system integrity and prevent regressions in multi-agent environments.

### 🏛️ ADR-001: Unified Python Backend Service
*   **Decision:** Shifted all machine learning (Spiking Neural Network), digital signal processing (FFT spectrograms), database management (aiosqlite), and WebSocket broadcasting out of Next.js and into a unified Python backend (`gait_recognition_backend/`).
*   **Rationale:** Node.js lacks native bindings for high-performance scientific computation (PyTorch, NumPy), resulting in performance bottlenecks and mock telemetry. The Next.js frontend is now a pure presentation layer.

### 🏛️ ADR-014: Self-Healing Baseline Subtraction Calibration
*   **Decision:** Automatically capture the first 20 frames (10 seconds) of wireless reflection signals at startup as a room baseline matrix ($H_{baseline}$) and subtract 75% of this static signature from all active frames.
*   **Rationale:** Consumer-grade wireless reflections bounce off furniture and walls. Subtracting static clutter isolates **only active human movement Doppler reflections**, providing clear presence and pose estimation matrices.

### 🏛️ ADR-021: RuView DSP Respiration & Cardiac Extraction
*   **Decision:** Integrated 2nd-order Butterworth Infinite Impulse Response (IIR) Bandpass Filters (0.15–0.45 Hz) and mathematical Autocorrelation Lag Peak Detectors.
*   **Rationale:** Simplistic thresholds mistake static noise for breathing or heart rate. Ported RuView DSP filtering isolates true physiological waveforms and finds dominant pitches (BPM) while discarding slow drifts and high-frequency interference.

### 🏛️ ADR-022: Multi-Stage Production Edge Deployment & MCP Toolchains
*   **Decision:** Deployed containerized multi-stage Docker configurations (`docker-compose.yml`), standard testing suites (`tests/`), Node utility scripts (`scripts/`), and a JSON-RPC Model Context Protocol server (`tools/mcp_server.py`).
*   **Rationale:** Containerization guarantees consistent dependency compilation across edge platforms. EXposing vital telemetry as standard MCP tools allows modern AI agents to interact directly with physical environments, aligning the workspace with the conventions of the RuView platform.

---

## 🎨 System Coding & Design Rules

1.  **Strict UI Aesthetics:**
    *   Rely on vanilla CSS variables (`globals.css`). Never use TailwindCSS unless explicitly confirmed.
    *   Maintain curated **HSL sleek dark mode glassmorphism** palettes (smooth gradients, micro-animations, hover effects).
    *   Typography must use **Outfit** (headings) and **Inter** (body elements) via Google Fonts. No browser defaults.
2.  **Robust Async Database Operations:**
    *   Write vital snapshots to the `vital_snapshots` table in the SQLite database (`wifi_guardian.db`).
    *   Always catch SQLite exception blocks during writes to allow for self-healing schema corrections.
3.  **Correct Claude Code CLI Integrations:**
    *   Keep `.claude-plugin/marketplace.json` updated with custom CLI commands.
    *   Keep `.claude/skills/` populated with structured JSON guidelines for database, calibration, and health assessment agents.
