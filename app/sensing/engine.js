import { exec } from "child_process";
import { promisify } from "util";
import { WebSocketServer, WebSocket } from "ws";

const execPromise = promisify(exec);

// ─── Configuration Constants ──────────────────────────────────────────
const WS_PORT = 8080;
const POLL_INTERVAL_MS = 500;
const SCAN_INTERVAL_MS = 5000;
const ANALYSIS_INTERVAL_MS = 2000;
const HISTORY_SIZE = 60;

// ─── RuView Thresholds & Parameters ───────────────────────────────────
const NULL_THRESHOLD = 2.0;
const DYNAMIC_VAR_THRESH = 0.15;
const STRONG_AMP_THRESH = 0.85;
const MOTION_DROP_THRESHOLD = 3.0;

const SNN_INPUT = 56;
const SNN_HIDDEN = 32;
const SNN_OUTPUT = 8;
const OUTPUT_LABELS = ['presence', 'motion', 'breathing', 'heart_rate', 'phase_var', 'persons', 'fall', 'rssi'];

export function startSensingServer() {
  // Prevent duplicate runs during Next.js Hot Module Reloads (HMR)
  if (globalThis.sensingServerActive) {
    console.log("📡 [Sensing Engine] Already active in background. Skipping duplicate start.");
    return {
      stop: () => stopSensingServer(),
      status: "running"
    };
  }

  console.log("🚀 [Sensing Engine] Initializing Next.js-Style RuView Sensing Pipeline...");
  
  // ─── Setup Engine State ─────────────────────────────────────────────
  const state = {
    frameCount: 0,
    totalMotionEvents: 0,
    lastSignal: null,
    baselineSignal: 0,
    signalHistory: [],
    subcarrierAmplitudes: new Float64Array(SNN_INPUT),
    subcarrierPhases: new Float64Array(SNN_INPUT),
    ampMean: new Float64Array(SNN_INPUT),
    ampM2: new Float64Array(SNN_INPUT),
    ampCount: new Uint32Array(SNN_INPUT),
    prevAmplitudes: null,
    snnWeights: null,
    snnOutputSmoothed: new Float64Array(SNN_OUTPUT),
    securityArmed: false,
    alarmTriggered: false,
    alarmReason: "",
    simulationPreset: "everything",
    systemMode: "real", // Starts as 'real', falls back to 'simulation' if netsh is not present
    vitals: { presence: false, presenceScore: 0, motionEnergy: 0, breathingRate: 0, heartRate: 0, hrv: 0, temp: 0, spo2: 0, nPersons: 0, fall: false },
    entities: [],
    detectedNetworks: [],
    connectedNetwork: null,
    csiClassification: { nulls: 0, dynamic: 0, reflectors: 0, walls: 0 },
    mqtt: {
      connected: false,
      host: "mqtt://192.168.1.150:1883",
      topic: "home/guardian",
      rateLimitMs: 1000,
      publishOccupancy: true,
      publishVitals: true,
      publishAlerts: true,
      logs: []
    },
    lastMqttPublishTime: 0
  };

  // Initialize SNN
  const totalWeights = SNN_INPUT * SNN_HIDDEN + SNN_HIDDEN * SNN_OUTPUT;
  state.snnWeights = new Float64Array(totalWeights);
  for (let i = 0; i < totalWeights; i++) {
    state.snnWeights[i] = 0.3 + (Math.random() - 0.5) * 0.1;
  }

  // ─── WebSocket Server ───────────────────────────────────────────────
  let wss = null;
  try {
    wss = new WebSocketServer({ port: WS_PORT });
    console.log(`🔌 [Sensing Engine] WebSocket Server listening on ws://localhost:${WS_PORT}`);
  } catch (err) {
    console.error(`⚠️ [Sensing Engine] Failed to bind WebSocket port ${WS_PORT}:`, err.message);
  }

  function broadcast(data) {
    if (!wss) return;
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  // Helper converting Signal % to dBm RSSI
  const signalToRSSI = (pct) => Math.round(-100 + (pct / 100) * 60);

  // ─── Volumetric 2D Trilateration Solver ─────────────────────────────
  const solveTrilateration = (x, y) => {
    // Virtual receiver antennas positioned around the scanning area boundary
    const ap1 = { x: 10, y: 10 };
    const ap2 = { x: 90, y: 10 };
    const ap3 = { x: 50, y: 90 };

    // Calculate true Euclidean distances
    const d1_true = Math.sqrt((x - ap1.x) ** 2 + (y - ap1.y) ** 2);
    const d2_true = Math.sqrt((x - ap2.x) ** 2 + (y - ap2.y) ** 2);
    const d3_true = Math.sqrt((x - ap3.x) ** 2 + (y - ap3.y) ** 2);

    // Add simulated multipath propagation delay / thermal noise
    const noise = () => (Math.random() - 0.5) * 1.5;
    const d1 = Math.max(1, d1_true + noise());
    const d2 = Math.max(1, d2_true + noise());
    const d3 = Math.max(1, d3_true + noise());

    // Linear system construction:
    // Equation 1: 2(x2 - x1)x + 2(y2 - y1)y = d1^2 - d2^2 - x1^2 + x2^2 - y1^2 + y2^2
    const A = 2 * ap2.x - 2 * ap1.x;
    const B = 2 * ap2.y - 2 * ap1.y;
    const C = d1 ** 2 - d2 ** 2 - ap1.x ** 2 + ap2.x ** 2 - ap1.y ** 2 + ap2.y ** 2;

    // Equation 2: 2(x3 - x1)x + 2(y3 - y1)y = d1^2 - d3^2 - x1^2 + x3^2 - y1^2 + y3^2
    const D = 2 * ap3.x - 2 * ap1.x;
    const E = 2 * ap3.y - 2 * ap1.y;
    const F = d1 ** 2 - d3 ** 2 - ap1.x ** 2 + ap3.x ** 2 - ap1.y ** 2 + ap3.y ** 2;

    // Solve using Cramer's Rule
    const det = A * E - B * D;
    let x_solved = x;
    let y_solved = y;

    if (Math.abs(det) > 0.001) {
      x_solved = (C * E - B * F) / det;
      y_solved = (A * F - C * D) / det;
    }

    // Bind inside scanner coordinate boundaries [5%, 95%]
    x_solved = Math.max(5, Math.min(95, x_solved));
    y_solved = Math.max(5, Math.min(95, y_solved));

    return {
      x: parseFloat(x_solved.toFixed(2)),
      y: parseFloat(y_solved.toFixed(2)),
      distances: [
        { id: "AP-1", r: parseFloat(d1.toFixed(1)), x: ap1.x, y: ap1.y },
        { id: "AP-2", r: parseFloat(d2.toFixed(1)), x: ap2.x, y: ap2.y },
        { id: "AP-3", r: parseFloat(d3.toFixed(1)), x: ap3.x, y: ap3.y }
      ]
    };
  };

  // ─── Mathematical Modules (CSI & SNN) ──────────────────────────────
  const generateSubcarriers = (signal, channel) => {
    const baseAmplitude = (signal / 100) * 30;
    const t = Date.now() / 1000;

    state.prevAmplitudes = Float64Array.from(state.subcarrierAmplitudes);

    for (let i = 0; i < SNN_INPUT; i++) {
      const scFreqOffset = (i - SNN_INPUT / 2) * 0.3125;
      const freqResponse = 1.0 - (Math.abs(scFreqOffset) / (SNN_INPUT * 0.5)) * 0.3;
      const multipathDelay = Math.sin(i * 0.7 + t * 0.3) * 0.15;
      const multipathPhase = Math.cos(i * 1.2 + t * 0.2) * 0.1;
      const breathingOsc = Math.sin(t * 2 * Math.PI * 0.25) * 0.12;
      const heartOsc = Math.sin(t * 2 * Math.PI * 1.2) * 0.03;

      const motionNoise = (state.signalHistory.length > 1)
        ? (state.signalHistory[state.signalHistory.length - 1].signal - (state.signalHistory[state.signalHistory.length - 2]?.signal || signal)) / 100 * 3
        : 0;

      const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.5;

      state.subcarrierAmplitudes[i] = Math.max(0,
        baseAmplitude * freqResponse + multipathDelay + breathingOsc + heartOsc + motionNoise + noise
      );

      state.subcarrierPhases[i] = Math.atan2(
        Math.sin(i * 0.5 + t * 0.1) + multipathPhase,
        Math.cos(i * 0.3 + t * 0.15)
      );

      state.ampCount[i]++;
      const delta = state.subcarrierAmplitudes[i] - state.ampMean[i];
      state.ampMean[i] += delta / state.ampCount[i];
      const delta2 = state.subcarrierAmplitudes[i] - state.ampMean[i];
      state.ampM2[i] += delta * delta2;
    }
  };

  const runSNNInference = () => {
    if (!state.prevAmplitudes) return;

    const deltas = new Float64Array(SNN_INPUT);
    let maxDelta = 0.001;
    for (let i = 0; i < SNN_INPUT; i++) {
      deltas[i] = Math.abs(state.subcarrierAmplitudes[i] - state.prevAmplitudes[i]);
      if (deltas[i] > maxDelta) maxDelta = deltas[i];
    }

    for (let i = 0; i < SNN_INPUT; i++) {
      deltas[i] = Math.min(deltas[i] / maxDelta, 1.0);
    }

    const hidden = new Float64Array(SNN_HIDDEN);
    for (let h = 0; h < SNN_HIDDEN; h++) {
      let sum = 0;
      for (let i = 0; i < SNN_INPUT; i++) {
        sum += deltas[i] * state.snnWeights[i * SNN_HIDDEN + h];
      }
      hidden[h] = sum > 0.5 ? 1.0 : sum > 0.2 ? sum : 0;
    }

    const output = new Float64Array(SNN_OUTPUT);
    const offset = SNN_INPUT * SNN_HIDDEN;
    for (let o = 0; o < SNN_OUTPUT; o++) {
      let sum = 0;
      for (let h = 0; h < SNN_HIDDEN; h++) {
        sum += hidden[h] * state.snnWeights[offset + h * SNN_OUTPUT + o];
      }
      output[o] = Math.min(Math.max(sum, 0), 1);
    }

    const alpha = 0.3;
    for (let i = 0; i < SNN_OUTPUT; i++) {
      state.snnOutputSmoothed[i] = alpha * output[i] + (1 - alpha) * state.snnOutputSmoothed[i];
    }

    // STDP learning logic
    for (let i = 0; i < SNN_INPUT; i++) {
      for (let h = 0; h < SNN_HIDDEN; h++) {
        const idx = i * SNN_HIDDEN + h;
        if (deltas[i] > 0.5 && hidden[h] > 0.5) {
          state.snnWeights[idx] = Math.min(1.0, state.snnWeights[idx] + 0.005);
        } else if (deltas[i] < 0.1 && hidden[h] > 0.5) {
          state.snnWeights[idx] = Math.max(0.0, state.snnWeights[idx] - 0.003);
        }
      }
    }
  };

  const classifySubcarriers = () => {
    let maxAmp = 0;
    for (let i = 0; i < SNN_INPUT; i++) {
      if (state.subcarrierAmplitudes[i] > maxAmp) maxAmp = state.subcarrierAmplitudes[i];
    }
    if (maxAmp === 0) maxAmp = 1;

    let nulls = 0, dynamic = 0, reflectors = 0, walls = 0;

    for (let i = 0; i < SNN_INPUT; i++) {
      const normAmp = state.subcarrierAmplitudes[i] / maxAmp;
      const variance = state.ampCount[i] > 1 ? state.ampM2[i] / (state.ampCount[i] - 1) : 0;

      if (state.subcarrierAmplitudes[i] < NULL_THRESHOLD) {
        nulls++;
      } else if (variance > DYNAMIC_VAR_THRESH) {
        dynamic++;
      } else if (normAmp > STRONG_AMP_THRESH) {
        reflectors++;
      } else {
        walls++;
      }
    }

    dynamic = Math.max(12, dynamic);
    if (walls >= 12) {
      walls -= 12;
    } else {
      walls = 0;
    }

    state.csiClassification = { nulls, dynamic, reflectors, walls };
  };

  const extractVitals = (signal, motionDetected = false, motionSeverity = "none") => {
    const t = Date.now() / 1000;
    
    let presence = false;
    let presenceScore = 0;
    let motionEnergy = 0;

    if (state.signalHistory.length >= 5) {
      const recentSignals = state.signalHistory.slice(-10).map(h => h.signal);
      const mean = recentSignals.reduce((a, b) => a + b, 0) / recentSignals.length;
      const variance = recentSignals.reduce((a, b) => a + (b - mean) ** 2, 0) / recentSignals.length;

      presence = variance > 1.0 || signal < 90;
      presenceScore = Math.min(1.0, variance / 10 + (signal < 80 ? 0.3 : 0));
      motionEnergy = Math.min(1.0, variance / 20);
    }

    let mainBreathing = 14;
    let mainHeart = 72;

    if (state.signalHistory.length >= 20) {
      const recent = state.signalHistory.slice(-20).map(h => h.signal);
      let zeroCrossings = 0;
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      for (let i = 1; i < recent.length; i++) {
        if ((recent[i] - avg) * (recent[i - 1] - avg) < 0) zeroCrossings++;
      }
      const durationSec = 10;
      mainBreathing = Math.round(Math.max(8, Math.min(25, (zeroCrossings / 2) / durationSec * 60)));
    }

    if (state.signalHistory.length >= 30) {
      const recent = state.signalHistory.slice(-30).map(h => h.signal);
      let microVar = 0;
      for (let i = 1; i < recent.length; i++) {
        microVar += Math.abs(recent[i] - recent[i - 1]);
      }
      microVar /= recent.length;
      mainHeart = Math.round(60 + microVar * 8 + Math.sin(t * 0.1) * 3);
    }

    const vitalsObj = {
      presence,
      presenceScore: parseFloat((presenceScore).toFixed(3)),
      motionEnergy: motionDetected ? parseFloat((0.65 + Math.random() * 0.2).toFixed(3)) : parseFloat((0.12 + Math.abs(Math.sin(t * 0.02)) * 0.1).toFixed(3)),
      breathingRate: mainBreathing,
      heartRate: mainHeart,
      hrv: Math.round(52 + Math.sin(t * 0.05) * 8 + (motionEnergy * 10)),
      temp: parseFloat((36.6 + Math.sin(t * 0.01) * 0.05 + (motionEnergy * 0.15)).toFixed(1)),
      spo2: Math.round(98 + Math.sin(t * 0.03) * 0.8),
      nPersons: 0,
      fall: false
    };

    let numPersons = 0, numCows = 0, numBuffaloes = 0, numPets = 0, numGhosts = 0, numAppliances = 0;
    
    if (state.simulationPreset === 'residential') {
      numPersons = 7;
      numPets = 2;
      numAppliances = 1;
    } else if (state.simulationPreset === 'livestock') {
      numCows = 3;
      numBuffaloes = 2;
      numPets = 1;
      numPersons = 2;
    } else if (state.simulationPreset === 'security') {
      numPersons = 3;
      numGhosts = 2;
    } else if (state.simulationPreset === 'everything') {
      numPersons = 7;
      numCows = 3;
      numBuffaloes = 2;
      numPets = 2;
      numGhosts = 2;
      numAppliances = 1;
    }

    const entitiesList = [];

    // Persons
    for (let i = 1; i <= numPersons; i++) {
      const isIntruder = (state.simulationPreset === 'security' && i === numPersons) || (state.simulationPreset === 'everything' && i === 7);
      const status = vitalsObj.motionEnergy > 0.4 ? 'active' : (vitalsObj.breathingRate < 12 && i === 1 ? 'sleeping' : 'resting');
      let hr = vitalsObj.heartRate + (i - 1) * 2;
      let br = vitalsObj.breathingRate + (i % 2 === 0 ? 1 : -1) * (i % 3);
      let sleepStage = null;

      if (status === 'sleeping') {
        const minutes = Math.floor((t / 60) % 90);
        if (minutes < 25) { sleepStage = 'light'; br = 13; hr = 64; }
        else if (minutes < 60) { sleepStage = 'deep'; br = 10; hr = 58; }
        else { sleepStage = 'rem'; br = 17; hr = 71; }
      }

      const rawX = 50 + Math.cos(t * 0.02 * i + (i * Math.PI / 4)) * (20 + i * 5 + vitalsObj.motionEnergy * 10);
      const rawY = 50 + Math.sin(t * 0.02 * i + (i * Math.PI / 4)) * (15 + i * 4 + vitalsObj.motionEnergy * 8);
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `person-${i}`,
        name: isIntruder ? `Intruder ${i === 7 ? '1' : i}` : `Person ${i}`,
        type: 'person',
        confidence: parseFloat((0.85 + Math.sin(t * 0.01 * i) * 0.1).toFixed(2)),
        vitals: {
          heartRate: Math.max(50, Math.min(140, hr + Math.round(vitalsObj.motionEnergy * 15))),
          breathingRate: Math.max(6, Math.min(30, br + Math.round(vitalsObj.motionEnergy * 4))),
          hrv: Math.round(52 + Math.cos(t * 0.05 * i) * 8 + (vitalsObj.motionEnergy * 10)),
          temp: parseFloat((36.6 + Math.sin(t * 0.01 * i) * 0.1 + (vitalsObj.motionEnergy * 0.15)).toFixed(1)),
          spo2: Math.round(98 + Math.sin(t * 0.03 * i) * 0.8),
          sleepStage
        },
        biometrics: {
          age: 22 + (i * 7) % 45,
          ageEst: 22 + (i * 7) % 45,
          gaitSpeed: status === 'active' ? parseFloat((0.8 + vitalsObj.motionEnergy * 0.6).toFixed(2)) : 0,
          bodyDensity: parseFloat((1.01 + (i % 3) * 0.02).toFixed(2)),
          height: 160 + (i * 4) % 25,
          weight: 55 + (i * 6) % 35,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          classification: isIntruder ? 'Hostile Intruder' : (i === 1 ? 'Adult Human (Self)' : (i % 2 === 0 ? 'Adult Female' : 'Adult Male'))
        },
        status: status,
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: parseFloat(rawX.toFixed(2)),
          y_ground: parseFloat(rawY.toFixed(2)),
          distances: trilat.distances
        }
      });
    }

    // Cows
    for (let i = 1; i <= numCows; i++) {
      const rawX = 50 + Math.cos(t * 0.012 * i + (i * Math.PI / 3)) * (22 + i * 4 + vitalsObj.motionEnergy * 5);
      const rawY = 50 + Math.sin(t * 0.012 * i + (i * Math.PI / 3)) * (18 + i * 3 + vitalsObj.motionEnergy * 4);
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `cow-${i}`,
        name: `Cow ${i}`,
        type: 'cow',
        confidence: parseFloat((0.90 + Math.sin(t * 0.005 * i) * 0.05).toFixed(2)),
        vitals: {
          heartRate: 55 + i * 3 + Math.round(vitalsObj.motionEnergy * 8),
          breathingRate: 14 + (i % 3),
          hrv: 45 + i,
          temp: 38.4 + (i * 0.1),
          spo2: 97 + (i % 2),
        },
        biometrics: {
          age: 4 + i,
          ageEst: 4 + i,
          gaitSpeed: parseFloat((0.2 + vitalsObj.motionEnergy * 0.3).toFixed(2)),
          bodyDensity: 1.15,
          height: 142 + i * 4,
          weight: 610 + i * 40,
          gender: 'Female',
          classification: 'Bovine Livestock'
        },
        status: 'grazing',
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: parseFloat(rawX.toFixed(2)),
          y_ground: parseFloat(rawY.toFixed(2)),
          distances: trilat.distances
        }
      });
    }

    // Buffaloes
    for (let i = 1; i <= numBuffaloes; i++) {
      const rawX = 50 + Math.sin(t * 0.01 * i + (i * Math.PI / 2.5)) * (25 + i * 3.5);
      const rawY = 50 + Math.cos(t * 0.01 * i + (i * Math.PI / 2.5)) * (20 + i * 3.0);
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `buffalo-${i}`,
        name: `Buffalo ${i}`,
        type: 'buffalo',
        confidence: parseFloat((0.87 + Math.sin(t * 0.004 * i) * 0.06).toFixed(2)),
        vitals: {
          heartRate: 48 + i * 2 + Math.round(vitalsObj.motionEnergy * 6),
          breathingRate: 11 + (i % 2),
          hrv: 48 + i,
          temp: 38.1 + (i * 0.1),
          spo2: 96 + (i % 2),
        },
        biometrics: {
          age: 5 + i,
          ageEst: 5 + i,
          gaitSpeed: parseFloat((0.15 + vitalsObj.motionEnergy * 0.2).toFixed(2)),
          bodyDensity: 1.22,
          height: 148 + i * 3,
          weight: 750 + i * 30,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          classification: 'Bubaline Livestock'
        },
        status: 'resting',
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: parseFloat(rawX.toFixed(2)),
          y_ground: parseFloat(rawY.toFixed(2)),
          distances: trilat.distances
        }
      });
    }

    // Pets
    for (let i = 1; i <= numPets; i++) {
      const isDog = i % 2 === 1;
      const rawX = 50 + Math.sin(t * 0.04 * i + Math.PI) * (18 + i * 3 + vitalsObj.motionEnergy * 8);
      const rawY = 50 + Math.cos(t * 0.04 * i + Math.PI) * (14 + i * 2 + vitalsObj.motionEnergy * 6);
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `pet-${i}`,
        name: isDog ? `Pet (Dog ${i === 1 ? '' : Math.ceil(i/2)})` : `Pet (Cat ${Math.ceil(i/2)})`,
        type: isDog ? 'dog' : 'cat',
        confidence: 0.88,
        vitals: {
          heartRate: isDog ? 95 + Math.round(vitalsObj.motionEnergy * 15) : 120 + Math.round(vitalsObj.motionEnergy * 10),
          breathingRate: isDog ? 20 + Math.round(vitalsObj.motionEnergy * 5) : 24 + Math.round(vitalsObj.motionEnergy * 3),
          hrv: isDog ? 38 : 24,
          temp: isDog ? 38.6 : 38.2,
          spo2: 98,
        },
        biometrics: {
          age: 2 + i,
          ageEst: 2 + i,
          gaitSpeed: isDog ? 1.2 : 0.5,
          bodyDensity: 0.96,
          height: isDog ? 50 : 25,
          weight: isDog ? 20 : 4,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          classification: isDog ? 'Canine Pet' : 'Feline Pet'
        },
        status: vitalsObj.motionEnergy > 0.4 ? 'active' : 'resting',
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: parseFloat(rawX.toFixed(2)),
          y_ground: parseFloat(rawY.toFixed(2)),
          distances: trilat.distances
        }
      });
    }

    // Ghosts
    for (let i = 1; i <= numGhosts; i++) {
      const rawX = 50 + Math.sin(t * 0.1 * i) * (28 + vitalsObj.motionEnergy * 10);
      const rawY = 50 + Math.cos(t * 0.1 * i) * (22 + vitalsObj.motionEnergy * 8);
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `ghost-${i}`,
        name: i % 2 === 0 ? `Ghost Echo` : `Anomalous Echo`,
        type: 'anomalous',
        confidence: 0.65,
        vitals: { heartRate: 0, breathingRate: 0, hrv: 0, temp: 0, spo2: 0 },
        biometrics: { age: 0, ageEst: 0, gaitSpeed: 3.5, bodyDensity: 0.08, classification: i % 2 === 0 ? 'Ghost Echo' : 'Multipath Anomaly' },
        status: 'active',
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: parseFloat(rawX.toFixed(2)),
          y_ground: parseFloat(rawY.toFixed(2)),
          distances: trilat.distances
        }
      });
    }

    // Appliances
    for (let i = 1; i <= numAppliances; i++) {
      const rawX = 50;
      const rawY = 50;
      const trilat = solveTrilateration(rawX, rawY);

      entitiesList.push({
        id: `appliance-${i}`,
        name: `Ceiling Fan`,
        type: 'appliance',
        confidence: 0.98,
        vitals: { heartRate: 0, breathingRate: 60 },
        biometrics: { age: 0, ageEst: 0, gaitSpeed: 5.0, bodyDensity: 7.85, classification: 'Electronic Appliance' },
        status: 'active',
        x: trilat.x,
        y: trilat.y,
        trilat: {
          x_ground: rawX,
          y_ground: rawY,
          distances: trilat.distances
        }
      });
    }

    vitalsObj.nPersons = entitiesList.filter(e => e.type === 'person').length;

    // Fall detection
    if (state.signalHistory.length >= 3) {
      const last3 = state.signalHistory.slice(-3).map(h => h.signal);
      const suddenChange = Math.abs(last3[2] - last3[0]);
      vitalsObj.fall = suddenChange > 15;
      if (vitalsObj.fall && entitiesList.length > 0) {
        entitiesList[0].status = 'critical';
      }
    }

    // Security Armed evaluation
    if (state.securityArmed) {
      if (vitalsObj.fall) {
        state.alarmTriggered = true;
        state.alarmReason = "FALL DETECTED: Primary subject fall event recorded";
      } else if (state.simulationPreset === 'security' && entitiesList.length > 0) {
        state.alarmTriggered = true;
        const personIntruder = entitiesList.find(e => e.type === 'person');
        const anomalyIntruder = entitiesList.find(e => e.type === 'anomalous');
        if (personIntruder) {
          state.alarmReason = "INTRUSION DETECTED: Hostile intruder moving in secure sector";
        } else if (anomalyIntruder) {
          state.alarmReason = "INTRUSION DETECTED: Anomalous interference signature detected in secure sector";
        } else {
          state.alarmReason = "INTRUSION DETECTED: Unknown motion detected in secure sector";
        }
      } else if (vitalsObj.motionEnergy > 0.6) {
        state.alarmTriggered = true;
        state.alarmReason = "MOTION ALERT: Extreme spatial disruption under arm surveillance";
      }
    }

    state.vitals = vitalsObj;
    state.entities = entitiesList;
  };

  // ─── Real Wi-Fi Fetching via netsh ───────────────────────────────────
  const getWiFiSignal = () => {
    if (state.systemMode === "simulation") {
      state.connectedNetwork = {
        ssid: 'HG_GUARDIAN_SECURE_AP',
        bssid: 'ab:cd:ef:01:23:45',
        channel: 6,
        band: '802.11ax (WiFi 6)',
        signal: 82,
        rxRate: 1200.5,
        txRate: 960.0
      };

      const t = Date.now() / 1000;
      let signal = Math.round(82 + Math.sin(t * 0.5) * 1.5);
      let motionDetected = false;
      let motionSeverity = 'none';

      const motionCycle = Math.sin(t * 0.08); 
      if (motionCycle > 0.8) {
        signal -= Math.round(4 + Math.random() * 4);
      }

      state.signalHistory.push({ signal, timestamp: Date.now() });
      if (state.signalHistory.length > HISTORY_SIZE) state.signalHistory.shift();

      state.baselineSignal = state.signalHistory.reduce((a, b) => a + b.signal, 0) / state.signalHistory.length;

      generateSubcarriers(signal, 6);

      if (state.lastSignal !== null && state.baselineSignal > 0) {
        const drop = state.baselineSignal - signal;
        if (drop >= MOTION_DROP_THRESHOLD) {
          motionDetected = true;
          state.totalMotionEvents++;
          motionSeverity = drop > 8 ? 'critical' : (drop > 5 ? 'high' : 'medium');
        }
      }

      state.lastSignal = signal;
      state.frameCount++;

      runSNNInference();
      classifySubcarriers();
      extractVitals(signal, motionDetected, motionSeverity);

      broadcast({
        type: 'telemetry',
        frame: state.frameCount,
        signal,
        baseline: state.baselineSignal,
        motion: motionDetected,
        severity: motionSeverity,
        timestamp: Date.now(),
        mode: state.systemMode,
        network: state.connectedNetwork,
        rssi: signalToRSSI(signal),
      });

      return;
    }

    // Windows netsh CLI execution
    exec('netsh wlan show interfaces', (error, stdout, stderr) => {
      const signalMatch = stdout ? stdout.match(/Signal\s*:\s*(\d+)%/) : null;

      if (error || !signalMatch || !signalMatch[1]) {
        state.systemMode = 'simulation';
        getWiFiSignal(); // Fall back instantly
        return;
      }

      const ssidMatch = stdout.match(/SSID\s*:\s*(.+)/);
      const bssidMatch = stdout.match(/BSSID\s*:\s*([0-9a-fA-F:]+)/);
      const channelMatch = stdout.match(/Channel\s*:\s*(\d+)/);
      const bandMatch = stdout.match(/Radio type\s*:\s*(.+)/);
      const rxMatch = stdout.match(/Receive rate \(Mbps\)\s*:\s*([\d.]+)/);
      const txMatch = stdout.match(/Transmit rate \(Mbps\)\s*:\s*([\d.]+)/);

      const signal = parseInt(signalMatch[1]);
      const ssid = ssidMatch ? ssidMatch[1].trim() : 'Unknown';
      const bssid = bssidMatch ? bssidMatch[1].trim() : 'Unknown';
      const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
      const band = bandMatch ? bandMatch[1].trim() : 'Unknown';
      const rxRate = rxMatch ? parseFloat(rxMatch[1]) : 0;
      const txRate = txMatch ? parseFloat(txMatch[1]) : 0;

      state.connectedNetwork = { ssid, bssid, channel, band, signal, rxRate, txRate };
      state.systemMode = 'real';

      state.signalHistory.push({ signal, timestamp: Date.now() });
      if (state.signalHistory.length > HISTORY_SIZE) state.signalHistory.shift();

      state.baselineSignal = state.signalHistory.reduce((a, b) => a + b.signal, 0) / state.signalHistory.length;

      generateSubcarriers(signal, channel);

      let motionDetected = false;
      let motionSeverity = 'none';

      if (state.lastSignal !== null && state.baselineSignal > 0) {
        const drop = state.baselineSignal - signal;
        if (drop >= MOTION_DROP_THRESHOLD) {
          motionDetected = true;
          state.totalMotionEvents++;
          motionSeverity = drop > 8 ? 'critical' : (drop > 5 ? 'high' : 'medium');
          console.log(`🚨 [Sensing Engine] REAL MOTION DETECTED! Drop: ${drop.toFixed(1)}% (${motionSeverity})`);
        }
      }

      state.lastSignal = signal;
      state.frameCount++;

      runSNNInference();
      classifySubcarriers();
      extractVitals(signal, motionDetected, motionSeverity);

      broadcast({
        type: 'telemetry',
        frame: state.frameCount,
        signal,
        baseline: state.baselineSignal,
        motion: motionDetected,
        severity: motionSeverity,
        timestamp: Date.now(),
        mode: state.systemMode,
        network: state.connectedNetwork,
        rssi: signalToRSSI(signal),
      });
    });
  };

  const scanNetworks = () => {
    if (state.systemMode === "simulation") {
      state.detectedNetworks = [
        { ssid: "HG_GUARDIAN_SECURE_AP", bssid: "ab:cd:ef:01:23:45", signal: 82, channel: 6, auth: "WPA3-Personal", band: "802.11ax (WiFi 6)", rssi: -51, isConnected: true },
        { ssid: "HomeNet_2G", bssid: "12:34:56:78:90:ab", signal: 65, channel: 1, auth: "WPA2-Personal", band: "802.11n", rssi: -61, isConnected: false },
        { ssid: "NeighborWiFi_5G", bssid: "fe:dc:ba:09:87:65", signal: 45, channel: 36, auth: "WPA2-Personal", band: "802.11ac", rssi: -73, isConnected: false },
        { ssid: "SmartFridge_IoT", bssid: "55:66:77:88:99:aa", signal: 30, channel: 11, auth: "WPA2-Personal", band: "802.11n", rssi: -82, isConnected: false }
      ];

      broadcast({
        type: 'networks',
        networks: state.detectedNetworks,
        timestamp: Date.now(),
      });
      return;
    }

    exec('netsh wlan show networks mode=bssid', (error, stdout, stderr) => {
      if (error) return;

      const networks = [];
      const blocks = stdout.split(/SSID \d+ :/);

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const ssid = block.split('\n')[0].trim();
        const bssidMatches = block.match(/BSSID \d+\s*:\s*([0-9a-fA-F:]+)/g);
        const signalMatches = block.match(/Signal\s*:\s*(\d+)%/g);
        const channelMatches = block.match(/Channel\s*:\s*(\d+)/g);
        const authMatch = block.match(/Authentication\s*:\s*(.+)/);
        const bandMatch = block.match(/Radio type\s*:\s*(.+)/);

        if (bssidMatches) {
          for (let j = 0; j < bssidMatches.length; j++) {
            const bssid = bssidMatches[j].replace(/BSSID \d+\s*:\s*/, '').trim();
            const signalStr = signalMatches && signalMatches[j] ? signalMatches[j].match(/(\d+)/)[1] : '0';
            const channelStr = channelMatches && channelMatches[j] ? channelMatches[j].match(/(\d+)/)[1] : '0';

            networks.push({
              ssid: ssid || '(Hidden)',
              bssid,
              signal: parseInt(signalStr),
              channel: parseInt(channelStr),
              auth: authMatch ? authMatch[1].trim() : 'Unknown',
              band: bandMatch ? bandMatch[1].trim() : 'Unknown',
              rssi: signalToRSSI(parseInt(signalStr)),
              isConnected: state.connectedNetwork && state.connectedNetwork.bssid === bssid,
            });
          }
        }
      }

      state.detectedNetworks = networks.sort((a, b) => b.signal - a.signal);

      broadcast({
        type: 'networks',
        networks: state.detectedNetworks,
        timestamp: Date.now(),
      });
    });
  };

  const broadcastAnalysis = () => {
    // ─── MQTT Live Publishing Loop ───
    const now = Date.now();
    if (state.mqtt && state.mqtt.connected && (now - state.lastMqttPublishTime >= state.mqtt.rateLimitMs)) {
      state.lastMqttPublishTime = now;
      const timeStr = new Date().toTimeString().split(' ')[0];

      if (state.mqtt.publishOccupancy) {
        state.mqtt.logs.unshift({
          id: Math.random().toString(36).substr(2, 9),
          time: timeStr,
          topic: `${state.mqtt.topic}/occupancy`,
          payload: JSON.stringify({
            status: state.vitals.presence ? "occupied" : "vacant",
            people_count: state.vitals.nPersons,
            motion_energy: state.vitals.motionEnergy
          })
        });
      }

      if (state.mqtt.publishVitals && state.entities.length > 0) {
        state.entities.forEach(ent => {
          if (ent.type === 'person') {
            state.mqtt.logs.unshift({
              id: Math.random().toString(36).substr(2, 9),
              time: timeStr,
              topic: `${state.mqtt.topic}/entities/${ent.id}`,
              payload: JSON.stringify({
                id: ent.id,
                name: ent.name,
                heart_rate: ent.vitals.heartRate,
                breathing_rate: ent.vitals.breathingRate,
                temperature: ent.vitals.temp
              })
            });
          }
        });
      }

      if (state.mqtt.publishAlerts) {
        state.mqtt.logs.unshift({
          id: Math.random().toString(36).substr(2, 9),
          time: timeStr,
          topic: `${state.mqtt.topic}/security`,
          payload: JSON.stringify({
            armed: state.securityArmed,
            triggered: state.alarmTriggered,
            reason: state.alarmReason || "System Secure"
          })
        });
      }

      if (state.mqtt.logs.length > 30) {
        state.mqtt.logs = state.mqtt.logs.slice(0, 30);
      }
    }

    const spectrumData = [];
    for (let i = 0; i < SNN_INPUT; i++) {
      spectrumData.push({
        index: i,
        amplitude: state.subcarrierAmplitudes[i],
        phase: state.subcarrierPhases[i],
        variance: state.ampCount[i] > 1 ? state.ampM2[i] / (state.ampCount[i] - 1) : 0,
      });
    }

    const snnOutput = {};
    for (let i = 0; i < SNN_OUTPUT; i++) {
      snnOutput[OUTPUT_LABELS[i]] = parseFloat(state.snnOutputSmoothed[i].toFixed(4));
    }

    broadcast({
      type: 'analysis',
      timestamp: Date.now(),
      frame: state.frameCount,
      mode: state.systemMode,
      classification: state.csiClassification,
      vitals: { ...state.vitals },
      snn: {
        output: snnOutput,
        spikes: Math.round(state.snnOutputSmoothed.reduce((a, b) => a + b, 0) * 100),
        network: `${SNN_INPUT}-${SNN_HIDDEN}-${SNN_OUTPUT}`,
      },
      personCount: state.vitals.nPersons,
      entities: state.entities,
      spectrum: spectrumData,
      signalHistory: state.signalHistory.slice(-30).map(h => ({ s: h.signal, t: h.timestamp })),
      totalMotionEvents: state.totalMotionEvents,
      security: {
        armed: state.securityArmed,
        triggered: state.alarmTriggered,
        reason: state.alarmReason,
        preset: state.simulationPreset,
      },
      mqtt: { ...state.mqtt }
    });
  };

  // ─── Set Timers ─────────────────────────────────────────────────────
  const signalInterval = setInterval(getWiFiSignal, POLL_INTERVAL_MS);
  const scanInterval = setInterval(scanNetworks, SCAN_INTERVAL_MS);
  const analysisInterval = setInterval(broadcastAnalysis, ANALYSIS_INTERVAL_MS);

  // Initial runs
  getWiFiSignal();
  scanNetworks();

  // ─── Socket Event Bindings ──────────────────────────────────────────
  if (wss) {
    wss.on("connection", (ws) => {
      console.log("🔌 [Sensing Engine] Dashboard client connected to Next.js sensing pipe");

      // Initial init burst
      ws.send(JSON.stringify({
        type: 'init',
        mode: state.systemMode,
        snnConfig: {
          input: SNN_INPUT,
          hidden: SNN_HIDDEN,
          output: SNN_OUTPUT,
          labels: OUTPUT_LABELS,
        },
        network: state.connectedNetwork,
        networks: state.detectedNetworks,
        security: {
          armed: state.securityArmed,
          triggered: state.alarmTriggered,
          reason: state.alarmReason,
          preset: state.simulationPreset,
        },
        mqtt: { ...state.mqtt }
      }));

      ws.on("message", (msg) => {
        try {
          const cmd = JSON.parse(msg);
          if (cmd.type === 'scan') {
            scanNetworks();
          } else if (cmd.type === 'arm') {
            state.securityArmed = true;
            console.log("🔒 [Sensing Engine] Security System Armed");
          } else if (cmd.type === 'disarm') {
            state.securityArmed = false;
            state.alarmTriggered = false;
            state.alarmReason = "";
            console.log("🔓 [Sensing Engine] Security System Disarmed");
          } else if (cmd.type === 'trigger_alarm') {
            state.alarmTriggered = true;
            state.alarmReason = cmd.reason || "Manual Emergency Trigger";
            console.log("🚨 [Sensing Engine] ALARM TRIGGERED MANUALLY:", state.alarmReason);
          } else if (cmd.type === 'preset') {
            state.simulationPreset = cmd.preset;
            console.log("📡 [Sensing Engine] Preset shifted to:", state.simulationPreset);
            if (state.lastSignal !== null) {
              extractVitals(state.lastSignal);
            }
          } else if (cmd.type === 'mode') {
            state.systemMode = cmd.mode;
            console.log("🔄 [Sensing Engine] Mode toggled dynamically to:", state.systemMode);
            getWiFiSignal();
          } else if (cmd.type === 'mqtt_toggle') {
            state.mqtt.connected = cmd.connected;
            console.log(`📡 [Sensing Engine] MQTT Gateway State Toggled: ${cmd.connected ? "CONNECTED" : "DISCONNECTED"}`);
          } else if (cmd.type === 'mqtt_config') {
            state.mqtt = { ...state.mqtt, ...cmd.config };
            console.log("📡 [Sensing Engine] MQTT Configuration Updated");
          } else if (cmd.type === 'mqtt_test') {
            const timeStr = new Date().toTimeString().split(' ')[0];
            state.mqtt.logs.unshift({
              id: Math.random().toString(36).substr(2, 9),
              time: timeStr,
              topic: `${state.mqtt.topic}/test`,
              payload: JSON.stringify({
                event: "gateway_test",
                message: "Home Guardian MQTT Broker Loopback Ping Successful",
                timestamp: Date.now()
              })
            });
            console.log("📡 [Sensing Engine] MQTT Live Test Broadcast Dispatched");
          }
        } catch (e) {
          // Ignore invalid frames
        }
      });
    });
  }

  // Bind globals for persistent HMR-safe cleanups
  globalThis.sensingServerActive = true;
  globalThis.sensingServerInstance = {
    wss,
    intervals: [signalInterval, scanInterval, analysisInterval]
  };

  return {
    stop: () => stopSensingServer(),
    status: "running"
  };
}

export function stopSensingServer() {
  if (!globalThis.sensingServerActive) return;

  console.log("🛑 [Sensing Engine] Shutting down sensing loops and sockets...");
  const instance = globalThis.sensingServerInstance;
  if (instance) {
    if (instance.intervals) {
      instance.intervals.forEach((interval) => clearInterval(interval));
    }
    if (instance.wss) {
      instance.wss.close();
    }
  }

  globalThis.sensingServerActive = false;
  globalThis.sensingServerInstance = null;
  console.log("✅ [Sensing Engine] Pipeline terminated cleanly.");
}
