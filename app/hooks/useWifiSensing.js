"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── SNN & Subcarrier Parameters (matching backend/server.cjs) ──────
const SNN_INPUT = 56;
const SNN_HIDDEN = 32;
const SNN_OUTPUT = 8;
const OUTPUT_LABELS = ['presence', 'motion', 'breathing', 'heart_rate', 'phase_var', 'persons', 'fall', 'rssi'];

export function useWifiSensing() {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState("connecting");
  const [telemetry, setTelemetry] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [snnConfig, setSnnConfig] = useState(null);
  const [connectedNetwork, setConnectedNetwork] = useState(null);
  const [events, setEvents] = useState([]);
  const [signalHistory, setSignalHistory] = useState([]);
  
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const localLoopRef = useRef(null);
  const localAnalysisLoopRef = useRef(null);

  // ─── Local Fallback Sensing Engine State ──────────────────────────
  const localEngineRef = useRef({
    frameCount: 0,
    totalMotionEvents: 0,
    lastSignal: null,
    baselineSignal: null,
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
    vitals: { presence: false, presenceScore: 0, motionEnergy: 0, breathingRate: 0, heartRate: 0, hrv: 0, temp: 0, spo2: 0, nPersons: 0, fall: false },
    entities: [],
    csiClassification: { nulls: 0, dynamic: 0, reflectors: 0, walls: 0 }
  });

  const addEvent = useCallback((msg, type = "info") => {
    setEvents((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // ─── Client-Side Local Sensing Mathematics ──────────────────────────
  const initLocalSNN = useCallback(() => {
    const totalWeights = SNN_INPUT * SNN_HIDDEN + SNN_HIDDEN * SNN_OUTPUT;
    const weights = new Float64Array(totalWeights);
    for (let i = 0; i < totalWeights; i++) {
      weights[i] = 0.3 + (Math.random() - 0.5) * 0.1;
    }
    localEngineRef.current.snnWeights = weights;
  }, []);

  const generateLocalSubcarriers = useCallback((signal, channel) => {
    const engine = localEngineRef.current;
    const baseAmplitude = (signal / 100) * 30;
    const t = Date.now() / 1000;

    engine.prevAmplitudes = Float64Array.from(engine.subcarrierAmplitudes);

    for (let i = 0; i < SNN_INPUT; i++) {
      const scFreqOffset = (i - SNN_INPUT / 2) * 0.3125;
      const freqResponse = 1.0 - (Math.abs(scFreqOffset) / (SNN_INPUT * 0.5)) * 0.3;
      const multipathDelay = Math.sin(i * 0.7 + t * 0.3) * 0.15;
      const multipathPhase = Math.cos(i * 1.2 + t * 0.2) * 0.1;
      const breathingOsc = Math.sin(t * 2 * Math.PI * 0.25) * 0.12;
      const heartOsc = Math.sin(t * 2 * Math.PI * 1.2) * 0.03;

      const motionNoise = (engine.signalHistory.length > 1)
        ? (engine.signalHistory[engine.signalHistory.length - 1].signal - (engine.signalHistory[engine.signalHistory.length - 2]?.signal || signal)) / 100 * 3
        : 0;

      const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.5;

      engine.subcarrierAmplitudes[i] = Math.max(0,
        baseAmplitude * freqResponse + multipathDelay + breathingOsc + heartOsc + motionNoise + noise
      );

      engine.subcarrierPhases[i] = Math.atan2(
        Math.sin(i * 0.5 + t * 0.1) + multipathPhase,
        Math.cos(i * 0.3 + t * 0.15)
      );

      engine.ampCount[i]++;
      const delta = engine.subcarrierAmplitudes[i] - engine.ampMean[i];
      engine.ampMean[i] += delta / engine.ampCount[i];
      const delta2 = engine.subcarrierAmplitudes[i] - engine.ampMean[i];
      engine.ampM2[i] += delta * delta2;
    }
  }, []);

  const runLocalSNNInference = useCallback(() => {
    const engine = localEngineRef.current;
    if (!engine.prevAmplitudes || !engine.snnWeights) return;

    const deltas = new Float64Array(SNN_INPUT);
    let maxDelta = 0.001;
    for (let i = 0; i < SNN_INPUT; i++) {
      deltas[i] = Math.abs(engine.subcarrierAmplitudes[i] - engine.prevAmplitudes[i]);
      if (deltas[i] > maxDelta) maxDelta = deltas[i];
    }

    for (let i = 0; i < SNN_INPUT; i++) {
      deltas[i] = Math.min(deltas[i] / maxDelta, 1.0);
    }

    const hidden = new Float64Array(SNN_HIDDEN);
    for (let h = 0; h < SNN_HIDDEN; h++) {
      let sum = 0;
      for (let i = 0; i < SNN_INPUT; i++) {
        sum += deltas[i] * engine.snnWeights[i * SNN_HIDDEN + h];
      }
      const normSum = sum / (SNN_INPUT * 0.15);
      hidden[h] = normSum > 0.5 ? 1.0 : normSum > 0.2 ? normSum : 0;
    }

    const output = new Float64Array(SNN_OUTPUT);
    const offset = SNN_INPUT * SNN_HIDDEN;
    for (let o = 0; o < SNN_OUTPUT; o++) {
      let sum = 0;
      for (let h = 0; h < SNN_HIDDEN; h++) {
        sum += hidden[h] * engine.snnWeights[offset + h * SNN_OUTPUT + o];
      }
      output[o] = Math.min(Math.max(sum / (SNN_HIDDEN * 0.15), 0), 1);
    }

    const alpha = 0.3;
    for (let i = 0; i < SNN_OUTPUT; i++) {
      engine.snnOutputSmoothed[i] = alpha * output[i] + (1 - alpha) * engine.snnOutputSmoothed[i];
    }

    // STDP learning
    for (let i = 0; i < SNN_INPUT; i++) {
      for (let h = 0; h < SNN_HIDDEN; h++) {
        const idx = i * SNN_HIDDEN + h;
        if (deltas[i] > 0.5 && hidden[h] > 0.5) {
          engine.snnWeights[idx] = Math.min(1.0, engine.snnWeights[idx] + 0.005);
        } else if (deltas[i] < 0.1 && hidden[h] > 0.5) {
          engine.snnWeights[idx] = Math.max(0.0, engine.snnWeights[idx] - 0.003);
        }
      }
    }
  }, []);

  const classifyLocalSubcarriers = useCallback(() => {
    const engine = localEngineRef.current;
    let maxAmp = 0;
    for (let i = 0; i < SNN_INPUT; i++) {
      if (engine.subcarrierAmplitudes[i] > maxAmp) maxAmp = engine.subcarrierAmplitudes[i];
    }
    if (maxAmp === 0) maxAmp = 1;

    let nulls = 0, dynamic = 0, reflectors = 0, walls = 0;

    for (let i = 0; i < SNN_INPUT; i++) {
      const normAmp = engine.subcarrierAmplitudes[i] / maxAmp;
      const variance = engine.ampCount[i] > 1 ? engine.ampM2[i] / (engine.ampCount[i] - 1) : 0;

      if (engine.subcarrierAmplitudes[i] < 2.0) {
        nulls++;
      } else if (variance > 0.15) {
        dynamic++;
      } else if (normAmp > 0.85) {
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

    engine.csiClassification = { nulls, dynamic, reflectors, walls };
  }, []);

  const extractLocalVitals = useCallback((signal, motionDetected, motionSeverity) => {
    const engine = localEngineRef.current;
    const t = Date.now() / 1000;

    let presence = false;
    let presenceScore = 0;
    let motionEnergy = 0;

    if (engine.signalHistory.length >= 5) {
      const recentSignals = engine.signalHistory.slice(-10).map(h => h.signal);
      const mean = recentSignals.reduce((a, b) => a + b, 0) / recentSignals.length;
      const variance = recentSignals.reduce((a, b) => a + (b - mean) ** 2, 0) / recentSignals.length;

      presence = variance > 1.0 || signal < 90;
      presenceScore = Math.min(1.0, variance / 10 + (signal < 80 ? 0.3 : 0));
      motionEnergy = Math.min(1.0, variance / 20);
    }

    let mainBreathing = 14;
    let mainHeart = 72;

    if (engine.signalHistory.length >= 20) {
      const recent = engine.signalHistory.slice(-20).map(h => h.signal);
      let zeroCrossings = 0;
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      for (let i = 1; i < recent.length; i++) {
        if ((recent[i] - avg) * (recent[i - 1] - avg) < 0) zeroCrossings++;
      }
      const durationSec = 10; // ~10 seconds estimated
      mainBreathing = Math.round(Math.max(8, Math.min(25, (zeroCrossings / 2) / durationSec * 60)));
    }

    if (engine.signalHistory.length >= 30) {
      const recent = engine.signalHistory.slice(-30).map(h => h.signal);
      let microVar = 0;
      for (let i = 1; i < recent.length; i++) {
        microVar += Math.abs(recent[i] - recent[i - 1]);
      }
      microVar /= recent.length;
      mainHeart = Math.round(60 + microVar * 8 + Math.sin(t * 0.1) * 3);
    }

    const vitals = {
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
    
    if (engine.simulationPreset === 'residential') {
      numPersons = 7;
      numPets = 2;
      numAppliances = 1;
    } else if (engine.simulationPreset === 'livestock') {
      numCows = 3;
      numBuffaloes = 2;
      numPets = 1;
      numPersons = 2;
    } else if (engine.simulationPreset === 'security') {
      numPersons = 3;
      numGhosts = 2;
    } else if (engine.simulationPreset === 'everything') {
      numPersons = 7;
      numCows = 3;
      numBuffaloes = 2;
      numPets = 2;
      numGhosts = 2;
      numAppliances = 1;
    }

    const entitiesList = [];

    // 1. Generate Persons
    for (let i = 1; i <= numPersons; i++) {
      const isIntruder = (engine.simulationPreset === 'security' && i === numPersons) || (engine.simulationPreset === 'everything' && i === 7);
      
      // Dynamic simulated state transitions over time (active, resting, sleeping)
      let status = 'resting';
      if (isIntruder) {
        status = 'active';
      } else {
        const personPhase = (t * 0.04) + i * 1.5;
        const wave = Math.sin(personPhase);
        if (wave > 0.4) {
          status = 'active';
        } else if (wave < -0.4 && (i % 2 === 1)) {
          status = 'sleeping';
        } else {
          status = 'resting';
        }
      }
      
      let hr = vitals.heartRate + (i - 1) * 2;
      let br = vitals.breathingRate + (i % 2 === 0 ? 1 : -1) * (i % 3);
      let sleepStage = null;

      if (status === 'sleeping') {
        const minutes = Math.floor((t / 60) % 90);
        if (minutes < 25) { sleepStage = 'light'; br = 13; hr = 64; }
        else if (minutes < 60) { sleepStage = 'deep'; br = 10; hr = 58; }
        else { sleepStage = 'rem'; br = 17; hr = 71; }
      }

      entitiesList.push({
        id: `person-${i}`,
        name: isIntruder ? `Intruder ${i === 7 ? '1' : i}` : `Person ${i}`,
        type: 'person',
        confidence: parseFloat((0.85 + Math.sin(t * 0.01 * i) * 0.1).toFixed(2)),
        vitals: {
          heartRate: Math.max(50, Math.min(140, hr + Math.round(vitals.motionEnergy * 15))),
          breathingRate: Math.max(6, Math.min(30, br + Math.round(vitals.motionEnergy * 4))),
          hrv: Math.round(52 + Math.cos(t * 0.05 * i) * 8 + (vitals.motionEnergy * 10)),
          temp: parseFloat((36.6 + Math.sin(t * 0.01 * i) * 0.1 + (vitals.motionEnergy * 0.15)).toFixed(1)),
          spo2: Math.round(98 + Math.sin(t * 0.03 * i) * 0.8),
          sleepStage
        },
        biometrics: {
          age: 22 + (i * 7) % 45,
          ageEst: 22 + (i * 7) % 45,
          gaitSpeed: status === 'active' ? parseFloat((0.8 + vitals.motionEnergy * 0.6).toFixed(2)) : 0,
          bodyDensity: parseFloat((1.01 + (i % 3) * 0.02).toFixed(2)),
          height: 160 + (i * 4) % 25,
          weight: 55 + (i * 6) % 35,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          classification: isIntruder ? 'Hostile Intruder' : (i === 1 ? 'Adult Human (Self)' : (i % 2 === 0 ? 'Adult Female' : 'Adult Male'))
        },
        status: status,
        x: 50 + Math.sin(t * 0.02 * i + (i * Math.PI / 4)) * (15 + i * 3.5 + vitals.motionEnergy * 10),
        y: 50 + Math.cos(t * 0.02 * i + (i * Math.PI / 4)) * (12 + i * 2.5 + vitals.motionEnergy * 8),
      });
    }

    // 2. Generate Livestock (Cows & Buffaloes)
    for (let i = 1; i <= numCows; i++) {
      entitiesList.push({
        id: `cow-${i}`,
        name: `Cow ${i}`,
        type: 'cow',
        confidence: parseFloat((0.90 + Math.sin(t * 0.005 * i) * 0.05).toFixed(2)),
        vitals: {
          heartRate: 55 + i * 3 + Math.round(vitals.motionEnergy * 8),
          breathingRate: 14 + (i % 3),
          hrv: 45 + i,
          temp: 38.4 + (i * 0.1),
          spo2: 97 + (i % 2),
        },
        biometrics: {
          age: 4 + i,
          ageEst: 4 + i,
          gaitSpeed: parseFloat((0.2 + vitals.motionEnergy * 0.3).toFixed(2)),
          bodyDensity: 1.15,
          height: 142 + i * 4,
          weight: 610 + i * 40,
          gender: 'Female',
          classification: 'Bovine Livestock'
        },
        status: 'grazing',
        x: 50 + Math.cos(t * 0.012 * i + (i * Math.PI / 3)) * (22 + i * 4 + vitals.motionEnergy * 5),
        y: 50 + Math.sin(t * 0.012 * i + (i * Math.PI / 3)) * (18 + i * 3 + vitals.motionEnergy * 4),
      });
    }

    for (let i = 1; i <= numBuffaloes; i++) {
      entitiesList.push({
        id: `buffalo-${i}`,
        name: `Buffalo ${i}`,
        type: 'buffalo',
        confidence: parseFloat((0.87 + Math.sin(t * 0.004 * i) * 0.06).toFixed(2)),
        vitals: {
          heartRate: 48 + i * 2 + Math.round(vitals.motionEnergy * 6),
          breathingRate: 11 + (i % 2),
          hrv: 48 + i,
          temp: 38.1 + (i * 0.1),
          spo2: 96 + (i % 2),
        },
        biometrics: {
          age: 5 + i,
          ageEst: 5 + i,
          gaitSpeed: parseFloat((0.15 + vitals.motionEnergy * 0.2).toFixed(2)),
          bodyDensity: 1.22,
          height: 148 + i * 3,
          weight: 750 + i * 30,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          classification: 'Bubaline Livestock'
        },
        status: 'resting',
        x: 50 + Math.sin(t * 0.01 * i + (i * Math.PI / 2.5)) * (25 + i * 3.5),
        y: 50 + Math.cos(t * 0.01 * i + (i * Math.PI / 2.5)) * (20 + i * 3.0),
      });
    }

    // 3. Generate Pets
    for (let i = 1; i <= numPets; i++) {
      const isDog = i % 2 === 1;
      entitiesList.push({
        id: `pet-${i}`,
        name: isDog ? `Pet (Dog ${i === 1 ? '' : Math.ceil(i/2)})` : `Pet (Cat ${Math.ceil(i/2)})`,
        type: isDog ? 'dog' : 'cat',
        confidence: 0.88,
        vitals: {
          heartRate: isDog ? 95 + Math.round(vitals.motionEnergy * 15) : 120 + Math.round(vitals.motionEnergy * 10),
          breathingRate: isDog ? 20 + Math.round(vitals.motionEnergy * 5) : 24 + Math.round(vitals.motionEnergy * 3),
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
        status: (Math.sin((t * 0.05) + i * 2) > 0.3) ? 'active' : 'resting',
        x: 50 + Math.sin(t * 0.04 * i + Math.PI) * (18 + i * 3 + vitals.motionEnergy * 8),
        y: 50 + Math.cos(t * 0.04 * i + Math.PI) * (14 + i * 2 + vitals.motionEnergy * 6),
      });
    }

    // 4. Generate Ghosts/Echo anomalies
    for (let i = 1; i <= numGhosts; i++) {
      entitiesList.push({
        id: `ghost-${i}`,
        name: i % 2 === 0 ? `Ghost Echo` : `Anomalous Echo`,
        type: 'anomalous',
        confidence: 0.65,
        vitals: { heartRate: 0, breathingRate: 0, hrv: 0, temp: 0, spo2: 0 },
        biometrics: { age: 0, ageEst: 0, gaitSpeed: 3.5, bodyDensity: 0.08, classification: i % 2 === 0 ? 'Ghost Echo' : 'Multipath Anomaly' },
        status: 'active',
        x: 50 + Math.sin(t * 0.1 * i) * (28 + vitals.motionEnergy * 10),
        y: 50 + Math.cos(t * 0.1 * i) * (22 + vitals.motionEnergy * 8),
      });
    }

    // 5. Generate Appliances
    for (let i = 1; i <= numAppliances; i++) {
      entitiesList.push({
        id: `appliance-${i}`,
        name: `Ceiling Fan`,
        type: 'appliance',
        confidence: 0.98,
        vitals: { heartRate: 0, breathingRate: 60 },
        biometrics: { age: 0, ageEst: 0, gaitSpeed: 5.0, bodyDensity: 7.85, classification: 'Electronic Appliance' },
        status: 'active',
        x: 50,
        y: 50,
      });
    }

    vitals.nPersons = entitiesList.filter(e => e.type === 'person').length;

    // Presence stability score scaling
    const activeEntities = entitiesList.filter(e => e.type !== 'appliance');
    if (activeEntities.length > 0) {
      vitals.presence = true;
      vitals.presenceScore = parseFloat(Math.min(1.0, Math.max(0.85, ...activeEntities.map(e => e.confidence))).toFixed(3));
    }

    // Fall detection logic
    if (engine.signalHistory.length >= 3) {
      const last3 = engine.signalHistory.slice(-3).map(h => h.signal);
      const suddenChange = Math.abs(last3[2] - last3[0]);
      vitals.fall = suddenChange > 15;
      if (vitals.fall && entitiesList.length > 0) {
        entitiesList[0].status = 'critical';
      }
    }

    // Security Alarm verification
    if (engine.securityArmed) {
      if (vitals.fall) {
        engine.alarmTriggered = true;
        engine.alarmReason = "FALL DETECTED: Primary subject fall event recorded";
      } else if (engine.simulationPreset === 'security' && entitiesList.length > 0) {
        engine.alarmTriggered = true;
        const personIntruder = entitiesList.find(e => e.type === 'person');
        const anomalyIntruder = entitiesList.find(e => e.type === 'anomalous');
        if (personIntruder) {
          engine.alarmReason = "INTRUSION DETECTED: Hostile intruder moving in secure sector";
        } else if (anomalyIntruder) {
          engine.alarmReason = "INTRUSION DETECTED: Anomalous interference signature detected in secure sector";
        } else {
          engine.alarmReason = "INTRUSION DETECTED: Unknown motion detected in secure sector";
        }
      } else if (vitals.motionEnergy > 0.6) {
        engine.alarmTriggered = true;
        engine.alarmReason = "MOTION ALERT: Extreme spatial disruption under arm surveillance";
      }
    }

    engine.vitals = vitals;
    engine.entities = entitiesList;
  }, []);

  // ─── Local Polling Loops ────────────────────────────────────────────
  const runLocalSensingIteration = useCallback(() => {
    const engine = localEngineRef.current;
    const t = Date.now() / 1000;

    const connectedNetwork = {
      ssid: 'HG_GUARDIAN_SECURE_AP (Local)',
      bssid: 'ab:cd:ef:01:23:45',
      channel: 6,
      band: '802.11ax (WiFi 6)',
      signal: 82,
      rxRate: 1200.5,
      txRate: 960.0
    };

    let signal = Math.round(82 + Math.sin(t * 0.5) * 1.5);
    
    let motionDetected = false;
    let motionSeverity = 'none';

    // Simulated human motion dips
    const motionCycle = Math.sin(t * 0.08); 
    if (motionCycle > 0.8) {
      signal -= Math.round(4 + Math.random() * 4);
    }

    engine.signalHistory.push({ signal, timestamp: Date.now() });
    if (engine.signalHistory.length > 60) engine.signalHistory.shift();

    engine.baselineSignal = engine.signalHistory.reduce((a, b) => a + b.signal, 0) / engine.signalHistory.length;

    generateLocalSubcarriers(signal, 6);

    if (engine.lastSignal !== null && engine.baselineSignal > 0) {
      const drop = engine.baselineSignal - signal;
      if (drop >= 3.0) {
        motionDetected = true;
        engine.totalMotionEvents++;
        motionSeverity = drop > 8 ? 'critical' : (drop > 5 ? 'high' : 'medium');
        addEvent(`MOTION DETECTED — Signal drop ${Math.round(engine.baselineSignal - signal)}% [${motionSeverity}]`, "alert");
      }
    }

    engine.lastSignal = signal;
    engine.frameCount++;

    runLocalSNNInference();
    classifyLocalSubcarriers();
    extractLocalVitals(signal, motionDetected, motionSeverity);

    setTelemetry({
      type: 'telemetry',
      frame: engine.frameCount,
      signal,
      baseline: engine.baselineSignal,
      motion: motionDetected,
      severity: motionSeverity,
      timestamp: Date.now(),
      mode: 'local-simulation',
      network: connectedNetwork,
      rssi: Math.round(-100 + (signal / 100) * 60),
    });
    setConnectedNetwork(connectedNetwork);
    setSignalHistory(engine.signalHistory.map(h => ({ signal: h.signal, baseline: engine.baselineSignal, t: h.timestamp })));
  }, [addEvent, generateLocalSubcarriers, runLocalSNNInference, classifyLocalSubcarriers, extractLocalVitals]);

  const runLocalAnalysisIteration = useCallback(() => {
    const engine = localEngineRef.current;
    
    if (!engine.mqtt) {
      engine.mqtt = {
        connected: false,
        host: "mqtt://192.168.1.150:1883",
        topic: "home/guardian",
        rateLimitMs: 1000,
        publishOccupancy: true,
        publishVitals: true,
        publishAlerts: true,
        logs: []
      };
    }

    const now = Date.now();
    if (!engine.lastMqttPublishTime) engine.lastMqttPublishTime = 0;
    
    if (engine.mqtt.connected && (now - engine.lastMqttPublishTime >= engine.mqtt.rateLimitMs)) {
      engine.lastMqttPublishTime = now;
      const timeStr = new Date().toLocaleTimeString();
      
      if (engine.mqtt.publishOccupancy) {
        engine.mqtt.logs.unshift({
          id: Math.random().toString(36).substr(2, 9),
          time: timeStr,
          topic: `${engine.mqtt.topic}/occupancy`,
          payload: JSON.stringify({
            status: engine.vitals.presence ? "occupied" : "vacant",
            people_count: engine.vitals.nPersons,
            motion_energy: engine.vitals.motionEnergy
          })
        });
      }
      
      if (engine.mqtt.publishVitals && engine.entities.length > 0) {
        engine.entities.forEach(ent => {
          if (ent.type === 'person') {
            engine.mqtt.logs.unshift({
              id: Math.random().toString(36).substr(2, 9),
              time: timeStr,
              topic: `${engine.mqtt.topic}/entities/${ent.id}`,
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

      if (engine.mqtt.publishAlerts) {
        engine.mqtt.logs.unshift({
          id: Math.random().toString(36).substr(2, 9),
          time: timeStr,
          topic: `${engine.mqtt.topic}/security`,
          payload: JSON.stringify({
            armed: engine.securityArmed,
            triggered: engine.alarmTriggered,
            reason: engine.alarmReason || "System Secure"
          })
        });
      }

      if (engine.mqtt.logs.length > 30) {
        engine.mqtt.logs = engine.mqtt.logs.slice(0, 30);
      }
    }

    const spectrumData = [];
    for (let i = 0; i < SNN_INPUT; i++) {
      spectrumData.push({
        index: i,
        amplitude: engine.subcarrierAmplitudes[i],
        phase: engine.subcarrierPhases[i],
        variance: engine.ampCount[i] > 1 ? engine.ampM2[i] / (engine.ampCount[i] - 1) : 0,
      });
    }

    const snnOutput = {};
    for (let i = 0; i < SNN_OUTPUT; i++) {
      snnOutput[OUTPUT_LABELS[i]] = parseFloat(engine.snnOutputSmoothed[i].toFixed(4));
    }

    setAnalysis({
      type: 'analysis',
      timestamp: Date.now(),
      frame: engine.frameCount,
      mode: 'local-simulation',
      classification: engine.csiClassification,
      vitals: { ...engine.vitals },
      snn: {
        output: snnOutput,
        spikes: Math.round(engine.snnOutputSmoothed.reduce((a, b) => a + b, 0) * 100),
        network: `${SNN_INPUT}-${SNN_HIDDEN}-${SNN_OUTPUT}`,
      },
      personCount: engine.vitals.nPersons,
      entities: engine.entities,
      spectrum: spectrumData,
      signalHistory: engine.signalHistory.slice(-30).map(h => ({ s: h.signal, t: h.timestamp })),
      totalMotionEvents: engine.totalMotionEvents,
      security: {
        armed: engine.securityArmed,
        triggered: engine.alarmTriggered,
        reason: engine.alarmReason,
        preset: engine.simulationPreset,
      },
      mqtt: { ...engine.mqtt }
    });
  }, []);

  const generateLocalNetworks = useCallback(() => {
    const localNets = [
      { ssid: "HG_GUARDIAN_SECURE_AP", bssid: "ab:cd:ef:01:23:45", signal: 82, channel: 6, auth: "WPA3-Personal", band: "802.11ax (WiFi 6)", rssi: -51, isConnected: true },
      { ssid: "HomeNet_2G", bssid: "12:34:56:78:90:ab", signal: 65, channel: 1, auth: "WPA2-Personal", band: "802.11n", rssi: -61, isConnected: false },
      { ssid: "NeighborWiFi_5G", bssid: "fe:dc:ba:09:87:65", signal: 45, channel: 36, auth: "WPA2-Personal", band: "802.11ac", rssi: -73, isConnected: false },
      { ssid: "SmartFridge_IoT", bssid: "55:66:77:88:99:aa", signal: 30, channel: 11, auth: "WPA2-Personal", band: "802.11n", rssi: -82, isConnected: false }
    ];
    setNetworks(localNets);
  }, []);

  const startLocalFallbackEngine = useCallback(() => {
    clearInterval(localLoopRef.current);
    clearInterval(localAnalysisLoopRef.current);

    setConnected(true);
    setMode("local-simulation");
    setSnnConfig({ input: SNN_INPUT, hidden: SNN_HIDDEN, output: SNN_OUTPUT, labels: OUTPUT_LABELS });
    
    initLocalSNN();
    generateLocalNetworks();
    
    addEvent("Server offline. Activated Local RuView Client-Side Sensing Pipeline", "system");

    localLoopRef.current = setInterval(runLocalSensingIteration, 500);
    localAnalysisLoopRef.current = setInterval(runLocalAnalysisIteration, 2000);
  }, [initLocalSNN, generateLocalNetworks, runLocalSensingIteration, runLocalAnalysisIteration, addEvent]);

  // ─── WebSocket Client (Hardware Sensing) ──────────────────────────
  const connect = useCallback(function doConnect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket("ws://localhost:8080");
      wsRef.current = ws;

      ws.onopen = () => {
        clearInterval(localLoopRef.current);
        clearInterval(localAnalysisLoopRef.current);

        setConnected(true);
        setMode("real");
        addEvent("Connected to WiFi Sensing Server", "system");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "init":
              setMode(data.mode);
              setSnnConfig(data.snnConfig);
              setConnectedNetwork(data.network);
              if (data.networks) setNetworks(data.networks);
              addEvent(`Sensing mode: ${data.mode.toUpperCase()}`, "system");
              break;
            case "telemetry":
              setTelemetry(data);
              setSignalHistory((prev) => {
                const next = [...prev, { signal: data.signal, baseline: data.baseline, t: Date.now() }];
                return next.slice(-60);
              });
              if (data.motion) {
                addEvent(
                  `MOTION DETECTED — Signal drop ${Math.round(data.baseline - data.signal)}% [${data.severity}]`,
                  "alert"
                );
              }
              break;
            case "analysis":
              setAnalysis((prev) => {
                if (data.security?.triggered && !prev?.security?.triggered) {
                  addEvent(`🚨 PERIMETER BREACH ALARM: ${data.security.reason || "Unknown intrusion detected"}`, "alert");
                }
                return data;
              });
              break;
            case "networks":
              setNetworks(data.networks || []);
              break;
          }
        } catch (e) {
          console.error("Parse error:", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setMode("disconnected");
        addEvent("Disconnected from WiFi Sensing Server. Trying to reconnect...", "system");
        
        // Start client-side local sensing engine fallback!
        startLocalFallbackEngine();
        
        reconnectRef.current = setTimeout(doConnect, 4000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setMode("disconnected");
      startLocalFallbackEngine();
      reconnectRef.current = setTimeout(doConnect, 4000);
    }
  }, [addEvent, startLocalFallbackEngine]);

  useEffect(() => {
    // Attempt websocket connection on startup
    connect();
    
    // Safety fallback timer: If websocket hasn't connected in 1.5 seconds, start local fallback
    // so the dashboard loads immediately instead of waiting for a reconnect loop to fail
    const safetyTimer = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        startLocalFallbackEngine();
      }
    }, 1500);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(reconnectRef.current);
      clearInterval(localLoopRef.current);
      clearInterval(localAnalysisLoopRef.current);
      wsRef.current?.close();
    };
  }, [connect, startLocalFallbackEngine]);

  // ─── API Commands (WebSocket Router or Local Engine State) ─────────
  const requestScan = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "scan" }));
    } else if (mode === "local-simulation") {
      generateLocalNetworks();
      addEvent("Local network scan completed", "system");
    }
  }, [mode, generateLocalNetworks, addEvent]);

  const armSecurity = useCallback(() => {
    addEvent("🔒 Security System Armed", "system");
    localEngineRef.current.securityArmed = true;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "arm" }));
    }
    if (mode === "local-simulation" || wsRef.current?.readyState !== WebSocket.OPEN) {
      runLocalAnalysisIteration(); // Trigger instant view refresh
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  const disarmSecurity = useCallback(() => {
    addEvent("🔓 Security System Disarmed", "system");
    localEngineRef.current.securityArmed = false;
    localEngineRef.current.alarmTriggered = false;
    localEngineRef.current.alarmReason = "";
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "disarm" }));
    }
    if (mode === "local-simulation" || wsRef.current?.readyState !== WebSocket.OPEN) {
      runLocalAnalysisIteration(); // Trigger instant view refresh
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  const triggerAlarm = useCallback((reason) => {
    const msgReason = reason || "Manual Emergency Trigger";
    addEvent(`🚨 Emergency Alarm Triggered: ${msgReason}`, "alert");
    localEngineRef.current.alarmTriggered = true;
    localEngineRef.current.alarmReason = msgReason;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "trigger_alarm", reason: msgReason }));
    }
    if (mode === "local-simulation" || wsRef.current?.readyState !== WebSocket.OPEN) {
      runLocalAnalysisIteration(); // Trigger instant view refresh
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  const changePreset = useCallback((preset) => {
    addEvent(`📡 Preset changed to: ${preset.toUpperCase()}`, "system");
    localEngineRef.current.simulationPreset = preset;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "preset", preset }));
    }
    
    // Regenerate immediately
    const engine = localEngineRef.current;
    extractLocalVitals(engine.lastSignal || 82, false, 'none');
    
    if (mode === "local-simulation" || wsRef.current?.readyState !== WebSocket.OPEN) {
      runLocalAnalysisIteration(); // Trigger instant view refresh
    }
  }, [mode, addEvent, extractLocalVitals, runLocalAnalysisIteration]);

  const changeMode = useCallback((newMode) => {
    addEvent(`Sensing mode toggle requested: ${newMode.toUpperCase()}`, "system");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mode", mode: newMode }));
    }
  }, [addEvent]);

  const toggleMqtt = useCallback((connected) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mqtt_toggle", connected }));
    } else if (mode === "local-simulation") {
      localEngineRef.current.mqtt = localEngineRef.current.mqtt || { connected: false, host: "mqtt://192.168.1.150:1883", topic: "home/guardian", rateLimitMs: 1000, publishOccupancy: true, publishVitals: true, publishAlerts: true, logs: [] };
      localEngineRef.current.mqtt.connected = connected;
      addEvent(`Local MQTT gateway state: ${connected ? "CONNECTED" : "DISCONNECTED"}`, "system");
      runLocalAnalysisIteration();
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  const configureMqtt = useCallback((config) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mqtt_config", config }));
    } else if (mode === "local-simulation") {
      localEngineRef.current.mqtt = localEngineRef.current.mqtt || { connected: false, host: "mqtt://192.168.1.150:1883", topic: "home/guardian", rateLimitMs: 1000, publishOccupancy: true, publishVitals: true, publishAlerts: true, logs: [] };
      localEngineRef.current.mqtt = { ...localEngineRef.current.mqtt, ...config };
      addEvent(`Local MQTT configurations updated`, "system");
      runLocalAnalysisIteration();
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  const testMqtt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mqtt_test" }));
    } else if (mode === "local-simulation") {
      localEngineRef.current.mqtt = localEngineRef.current.mqtt || { connected: false, host: "mqtt://192.168.1.150:1883", topic: "home/guardian", rateLimitMs: 1000, publishOccupancy: true, publishVitals: true, publishAlerts: true, logs: [] };
      const timeStr = new Date().toLocaleTimeString();
      localEngineRef.current.mqtt.logs = localEngineRef.current.mqtt.logs || [];
      localEngineRef.current.mqtt.logs.unshift({
        id: Math.random().toString(36).substr(2, 9),
        time: timeStr,
        topic: `${localEngineRef.current.mqtt.topic}/test`,
        payload: JSON.stringify({ event: "gateway_test", message: "Local Mock Broker Loopback Ping Successful", timestamp: Date.now() })
      });
      addEvent(`Local MQTT test loopback ping sent`, "system");
      runLocalAnalysisIteration();
    }
  }, [mode, addEvent, runLocalAnalysisIteration]);

  return {
    connected,
    mode,
    telemetry,
    analysis,
    networks,
    snnConfig,
    connectedNetwork,
    events,
    signalHistory,
    requestScan,
    armSecurity,
    disarmSecurity,
    triggerAlarm,
    changePreset,
    changeMode,
    toggleMqtt,
    configureMqtt,
    testMqtt
  };
}
