# Home Guardian: WiFi Spatial Intelligence 📡

Welcome to **Home Guardian**, an advanced, privacy-first WiFi sensing dashboard designed to convert commodity WiFi signals into spatial intelligence. 

Drawing inspiration from cutting-edge research and concepts like RuView, this project visualizes complex telemetry data—including real-time human pose estimation, vital sign monitoring (heart rate, breathing rate), and presence detection—all without the use of invasive cameras.

## ✨ Features

- **📡 Live Spatial Scan:** A high-tech, military-grade radar map visualizing all entities in a space using simulated Channel State Information (CSI) and Received Signal Strength Indicator (RSSI) data.
- **🏃 DensePose & Point Cloud Reconstruction:** Select any tracked subject to view simulated 3D point cloud generation and skeleton wireframe pose-fusion.
- **🧬 Comprehensive Vitals Monitoring:** Real-time tracking of Heart Rate (BPM), Breathing Rate (RPM), Heart Rate Variability (HRV), Body Temperature, and SpO2.
- **👶 Age & Biometric Profiling:** Proprietary algorithms that estimate age based on gait and body density metrics.
- **🐾 Multi-Entity Tracking:** Capable of differentiating between humans, various pets (cats, dogs, birds, reptiles), livestock (cows, buffaloes), and even anomalous entities.
- **🛏️ Sleep Staging Analysis:** Continuous monitoring of REM, Light, and Deep sleep cycles via respiration and micro-movement analysis.
- **🚨 Perimeter Security:** Automated intrusion detection with audible alerting and detailed event logging.

## 🛠️ Technology Stack

- **Frontend Framework:** React (Vite)
- **Styling:** Custom CSS with a Neon/Cyber aesthetics and Glassmorphism UI
- **Icons:** Lucide React
- **Simulation Engine:** Custom JavaScript physics and oscillation models for highly realistic entity movement and vital sign variations.

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run the Development Server:**
   ```bash
   npm run dev
   ```

3. **Open the Dashboard:**
   Navigate to `http://localhost:5173` in your web browser.

## 🗺️ Custom Map Upload

The default map uses a high-tech satellite blueprint. If you wish to use a custom floor plan or a satellite view of your own property:
1. Click the **Upload Real Map** button in the top right corner.
2. Select an image file (`.png`, `.jpg`, etc.) from your computer.
3. The dashboard will instantly adapt to use your custom background.

---

*Disclaimer: This project is a highly advanced UI/UX simulation and data visualization dashboard. The current iteration uses procedural generation to simulate hardware telemetry. Future versions may integrate directly with ESP32 or similar hardware for live CSI data extraction.*
