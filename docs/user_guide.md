# 📖 Home Guardian WiFi: User & Operational Guide

Welcome to the Home Guardian WiFi operational manual. This guide outlines how the system captures, processes, and displays physical bio-telemetry.

---

## 📡 1. Operational Modes

The system operates in three distinct modes depending on hardware availability:

### A. Real-World PCIe Host Card Polling (Default)
*   **Description:** Directly queries the host PCIe wireless adapter interface (e.g. `wlo1`) to extract RSSI, noise floors, channel capacity, and active MCS rates.
*   **Trigger:** Automatically active when booting the server via `bash start_backend.sh`.
*   **Recommendation:** To prevent rate downshifts and 10ms+ latency jitter spikes, disable power saving on the wireless adapter:
    ```bash
    sudo iw dev wlo1 set power_save off
    ```

### B. Offline Proof Replay Pipeline
*   **Description:** Replays high-fidelity reference CSI signal streams from a saved archive to verify the signal processing layers.
*   **Trigger:** Execute from your terminal:
    ```bash
    python3 archive/replay_proof.py
    ```
*   **Output:** Prints real-time zero-crossing respiration rate updates and cardiac pitch autocorrelations to your console.

---

## 🧘 2. Biometric & Ayurvedic Dosha Mappings

The Home Guardian analytics engine maps high-frequency physical telemetry to clinical vital scales and holistic Ayurvedic states:

### 💨 Vata Alignment
*   **Indicators:** Shallow, rapid breathing (>18 RPM) accompanied by high HRV amplitude swings.
*   **Protocol:** Dinacharya warm herbal fluids and deep alternate nostril breathing (Nadi Shodhana).

### 🔥 Pitta Alignment
*   **Indicators:** Elevated core body temp (>36.9 C) and a high sleeping resting heart rate (>75 BPM).
*   **Protocol:** Cooling teas (mint/coriander), sheetali breathing, and cooling oil applications.

### ⛰️ Kapha Alignment
*   **Indicators:** Slow baseline heart rate (<55 BPM) and deep, slow respiration (<10 RPM).
*   **Protocol:** Active invigorating yoga sequences and stimulating breathing cycles (Kapalabhati).
