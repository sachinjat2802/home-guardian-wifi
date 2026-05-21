"use client";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, Trash2, Cpu, Shield, Activity, RefreshCw, Layers, Compass, BarChart, Hand, Footprints, TrendingDown, PawPrint, Crosshair, Moon, Thermometer, Eye, Users, Sliders, Network, ClipboardList, Accessibility, BrainCircuit, Filter, Mic, X, MessageCircle } from "lucide-react";
import AgentWorkspace from "./AgentWorkspace";

function formatInline(str) {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/50 text-cyan-400 px-1 py-0.5 rounded border border-white/10 font-mono text-[10px]">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors">$1</a>');
}

const RenderMarkdown = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1.5 leading-relaxed font-sans text-sm tracking-wide">
      {lines.map((line, i) => {
        let content = line;
        
        if (line.startsWith('### ')) return <h3 key={i} className="text-[13px] font-bold text-white mt-2 mb-1 tracking-wider uppercase border-b border-white/10 pb-1">{line.replace('### ', '')}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-white mt-2 mb-1">{line.replace('## ', '')}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-base font-bold text-cyan-400 mt-2 mb-1">{line.replace('# ', '')}</h1>;
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          content = line.substring(2);
          return <div key={i} className="flex gap-2 items-start ml-2 my-0.5"><span className="text-cyan-500 font-bold mt-0.5 text-[10px]">■</span><span dangerouslySetInnerHTML={{ __html: formatInline(content) }} /></div>;
        }
        
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+\.)\s(.*)/);
          return <div key={i} className="flex gap-2 items-start ml-2 my-0.5"><span className="text-cyan-500 font-mono font-bold text-xs mt-0.5">{match[1]}</span><span dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }} /></div>;
        }
        
        if (line.startsWith('> ')) {
          return <blockquote key={i} className="border-l-2 border-cyan-500/50 pl-3 py-0.5 my-1 text-gray-400 italic bg-cyan-500/5 rounded-r">{formatInline(line.substring(2))}</blockquote>;
        }

        if (line.startsWith('---')) {
          return <div key={i} className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />;
        }

        if (!line.trim()) return <div key={i} className="h-1" />;

        return <p key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: formatInline(content) }} />;
      })}
    </div>
  );
};

export default function AiCopilot({ sensing }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("chat"); // 'chat' | 'calibrate' | 'clinical'
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **Home Guardian Spatial AI**, powered by **NVIDIA Nemotron-3 Super 120B**. I can analyze your live WiFi CSI spatial scattering logs, biometric telemetry, SNN activity spikes, and security perimeter stance. \n\nAsk me anything, or try one of the quick analysis presets below!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  // Calibration tool state
  const [calibrationReport, setCalibrationReport] = useState("");
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Clinical tool state
  const [clinicalReport, setClinicalReport] = useState("");
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);

  // Gesture & SOS Decoder State
  const [gestureReport, setGestureReport] = useState("");
  const [isDecodingGesture, setIsDecodingGesture] = useState(false);

  // Gait & Fall Predictor State
  const [gaitReport, setGaitReport] = useState("");
  const [isAnalyzingGait, setIsAnalyzingGait] = useState(false);

  // Auto-CAD Mapper State
  const [cadReport, setCadReport] = useState("");
  const [isGeneratingCad, setIsGeneratingCad] = useState(false);

  // Pet Profiler State
  const [petReport, setPetReport] = useState("");
  const [isAnalyzingPet, setIsAnalyzingPet] = useState(false);

  // Intrusion Vectoring State
  const [intrusionReport, setIntrusionReport] = useState("");
  const [isAnalyzingIntrusion, setIsAnalyzingIntrusion] = useState(false);

  // Ergonomics Assessor State
  const [ergoReport, setErgoReport] = useState("");
  const [isAnalyzingErgo, setIsAnalyzingErgo] = useState(false);

  // Sleep Apnea Tracker State
  const [sleepReport, setSleepReport] = useState("");
  const [isAnalyzingSleep, setIsAnalyzingSleep] = useState(false);

  // HVAC Optimizer State
  const [hvacReport, setHvacReport] = useState("");
  const [isAnalyzingHvac, setIsAnalyzingHvac] = useState(false);

  // Loitering Detector State
  const [loiteringReport, setLoiteringReport] = useState("");
  const [isAnalyzingLoitering, setIsAnalyzingLoitering] = useState(false);

  // Crowd Flow Mapper State
  const [crowdReport, setCrowdReport] = useState("");
  const [isAnalyzingCrowd, setIsAnalyzingCrowd] = useState(false);

  // Vitals Forecast State
  const [forecastReport, setForecastReport] = useState("");
  const [isAnalyzingForecast, setIsAnalyzingForecast] = useState(false);

  // Adaptive Thresholds State
  const [thresholdReport, setThresholdReport] = useState("");
  const [isAnalyzingThreshold, setIsAnalyzingThreshold] = useState(false);

  // Multi-Modal Fusion State
  const [fusionReport, setFusionReport] = useState("");
  const [isAnalyzingFusion, setIsAnalyzingFusion] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Extract current telemetry and occupant status to construct the rich contextual prompt
  const getSpatialTelemetryContext = () => {
    const activeNetwork = sensing.connectedNetwork ? `${sensing.connectedNetwork.ssid} (Channel ${sensing.connectedNetwork.channel})` : "Disconnected";
    const signalStrength = sensing.telemetry?.signal ? `${sensing.telemetry.signal}%` : "N/A";
    const mode = sensing.mode || "Simulation";
    
    const security = sensing.analysis?.security || {};
    const securityStatus = `Perimeter Guard: ${security.armed ? "ARMED" : "DISARMED"} • Alarm Triggered: ${security.triggered ? `BREACHED (${security.reason || "Unknown"})` : "SECURE"}`;
    
    const snnSpikes = sensing.analysis?.snn?.spikes || 0;
    const snnNetwork = sensing.analysis?.snn?.network || "56-32-8";
    const snnSpikesFreq = (snnSpikes / 100).toFixed(1);

    const entities = sensing.analysis?.entities || [];
    const formattedEntities = entities.map(e => {
      const typeLabel = e.type || "unknown";
      const gaitInfo = e.biometrics?.gaitSpeed ? ` • Gait: ${e.biometrics.gaitSpeed} m/s` : "";
      const ageInfo = e.biometrics?.age ? ` • Age: ${e.biometrics.age} yrs` : "";
      const statusInfo = e.status ? ` • Status: ${e.status}` : "";
      const posInfo = ` • Position: [${Math.round(e.x || 50)}, ${Math.round(e.y || 50)}]`;
      
      const vitals = e.vitals || {};
      const vitalInfo = e.type !== 'appliance' && e.type !== 'anomalous'
        ? ` (Vitals: HR ${vitals.heartRate || 0} BPM • Resp ${vitals.breathingRate || 0} RPM • Temp ${vitals.temp || 0.0}°C • SpO2 ${vitals.spo2 || 0}%)`
        : "";

      return `- **${e.name}** (${typeLabel}${ageInfo}${gaitInfo}${statusInfo}${posInfo})${vitalInfo}`;
    }).join("\n");

    const recentEvents = sensing.events?.slice(0, 5).map(e => `[${e.time}] ${e.msg} (${e.type})`).join("\n") || "No events logged.";

    return `
--- SYSTEM LIVE SPATIAL & TELEMETRY CONTEXT ---
WiFi Channel/SSID: ${activeNetwork}
Signal RSSI: ${signalStrength}
Active Sensing Mode: ${mode}
SNN Spiking Activity: ${snnSpikesFreq} Hz (Net: ${snnNetwork})
Security perimeter stance: ${securityStatus}

OUTBOUND TELEMETRY ENTITIES LIST (${entities.length} detected):
${formattedEntities || "No spatial presence targets currently detected."}

RECENT EVENT LOGS:
${recentEvents}
---------------------------------------------
`;
  };

  const handleSend = async (userPrompt) => {
    const promptToSend = userPrompt || input;
    if (!promptToSend.trim() || isGenerating) return;

    if (!userPrompt) setInput("");

    // Append user message
    const userMessage = { role: "user", content: promptToSend };
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    const telemetryContext = getSpatialTelemetryContext();
    const fullSystemPrompt = `
You are the Home Guardian Spatial AI model powered by NVIDIA Nemotron-3 Super 120B.
You are directly integrated as a core intelligence agent in our Home Guardian WiFi CSI Spatial Analytics system.

Here is the live spatial telemetry context captured directly from the WiFi CSI sensing engine:
${telemetryContext}

User Question: ${promptToSend}

Guidelines:
1. Ground your answers fully in the provided live spatial telemetry context (occupants registry, security status, SNN spikes, events).
2. Deliver highly technical, professional, yet understandable clinical and security insights.
3. Keep answers relatively concise and highly structured (using Markdown and bullet points).
4. If the user asks about an anomaly, explain it via WiFi multipath scattering anomalies (e.g. ghost echos caused by metal surfaces or Ceiling Fans).
5. If the perimeter is breached, alert them and outline actionable tactical security recommendations based on target gait speeds.
`;

    try {
      const assistantMessageIndex = messages.length + 1;
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullSystemPrompt })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI API");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          reply += chunk;
          setMessages(prev => {
            const copy = [...prev];
            copy[assistantMessageIndex] = { role: "assistant", content: reply };
            return copy;
          });
        }
      }
    } catch (error) {
      console.error("AI Copilot stream error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Sorry, I encountered an error connecting to the NVIDIA Nemotron-3 Super 120B model endpoint. Please ensure the server has a valid API key configured."
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Advanced Calibrate Diagnostics Logic (Fresnel Zone Analysis & Antenna Vectors)
  const runCalibrateDiagnostics = async () => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setCalibrationReport("");

    const entities = sensing.analysis?.entities || [];
    const anomalies = entities.filter(e => e.type === "anomalous" || e.type === "appliance");
    const activeNetwork = sensing.connectedNetwork ? `${sensing.connectedNetwork.ssid} (Channel ${sensing.connectedNetwork.channel})` : "HG_GUARDIAN_SECURE_AP (Ch 6)";
    
    const calibrationPrompt = `
You are the AI Spatial Calibration & Antenna Positioning Diagnostics Engine powered by NVIDIA Nemotron-3 Super 120B.
You analyze raw multi-path wireless scattering, Fresnel Zone boundary boundaries, subcarrier amplitude variances, and spatial target coordinates to identify and resolve blind spots and multipath interference anomalies (e.g. ghost echos).

Here is the geometrical spatial layout of our sensing grid:
- WiFi AP Network: ${activeNetwork}
- Active Receiver Nodes Calibrated:
  * Node-1 (AP Center): [50, 50]
  * Detected Anomalies/Appliances:
    ${anomalies.map(a => `- **${a.name}** [Type: ${a.type}, Pos: [${Math.round(a.x)}, ${Math.round(a.y)}], Speed: ${a.biometrics?.gaitSpeed || 0} m/s]`).join("\n") || "- No anomalies currently active. Grid has clean multipath scattering."}
- Environment Material Coefficients:
  * Wall Density Index: ${sensing.analysis?.classification?.walls ?? 8} subcarriers blocked
  * Metallic Reflector Index: ${sensing.analysis?.classification?.reflectors ?? 15} subcarriers reflecting
  * Dynamic Scattering Index: ${sensing.analysis?.classification?.dynamic ?? 20} subcarriers fluctuating

TASK:
1. Calculate exact multipath reflection vectors and Fresnel Zone overlaps relative to the receiver nodes and anomaly positions.
2. Diagnose what physical objects are causing the ghost echoes or anomalies (e.g. sliding mirrors, metal doors, HVAC vibration, or ceiling fan rotation at 60Hz harmonics).
3. Provide **exact, highly technical, physical repositioning vectors** (e.g. "Move Router 1.2 meters north", "Shift auxiliary receiver node 45 degrees outward") to clear the blind spots, optimize Signal-to-Noise Ratio (SNR), and cancel ghost echoes.
4. Output your calculations and recommendations in a highly structured, premium diagnostic report.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: calibrationPrompt })
      });

      if (!response.ok) throw new Error("Calibration request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setCalibrationReport(reply);
        }
      }
    } catch (err) {
      setCalibrationReport("❌ Calibration engine failed to compile spatial logs. Check API key.");
    } finally {
      setIsCalibrating(false);
    }
  };

  // Advanced Clinical Apnea & HRV Trend Analysis Logic (SQLite telemetry mining)
  const runClinicalDiagnostics = async () => {
    if (isAnalyzingHealth) return;
    setIsAnalyzingHealth(true);
    setClinicalReport("");

    const entities = sensing.analysis?.entities?.filter(e => e.type === "person") || [];
    
    const clinicalPrompt = `
You are the Clinical Biometric Stability & Sleep Apnea (AHI) Screener powered by NVIDIA Nemotron-3 Super 120B.
You analyze raw historical vitals patterns (respiration amplitude shifts, heart rate variability spikes, SpO2 dips, and sleep stage cycles) collected from Home Guardian's SQLite biometric logs.

Here is the current vitals record of active subjects:
${entities.map(e => `
- **${e.name}** (Age: ${e.biometrics.age}, Weight: ${e.biometrics.weight}kg):
  * Active HR: ${e.vitals.heartRate} BPM
  * Active Respiration: ${e.vitals.breathingRate} RPM
  * Active SpO2: ${e.vitals.spo2}%
  * Temperature: ${e.vitals.temp}°C
  * HRV Score: ${e.vitals.hrv} ms
  * Sleep Stage: ${e.vitals.sleepStage || "Awake"}
`).join("\n") || "- No human subjects currently detected."}

TASK:
1. Perform a deep clinical-grade trend screening. Identify any signs of Sleep Apnea by searching for Apnea-Hypopnea Index (AHI) indicators (e.g. breathing rate dropping below 8 RPM coupled with SpO2 drops > 3%).
2. Evaluate Heart Rate Variability (HRV) stress markers (higher HRV indicates healthy autonomic balance, low HRV shows sympathetic stress or sleep fragmentation).
3. Synthesize a professional **Clinical Health Brief** detailing your observations, diagnostic risk levels (AHI Index estimation: Mild, Moderate, or Severe), and preventive recommendations.
4. Keep the output highly structured, professional, and clear.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clinicalPrompt })
      });

      if (!response.ok) throw new Error("Clinical analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setClinicalReport(reply);
        }
      }
    } catch (err) {
      setClinicalReport("❌ Clinical screening engine failed to sync vitals registry. Check API key.");
    } finally {
      setIsAnalyzingHealth(false);
    }
  };

  // Advanced Gesture & SOS Pattern Decoder (Phase Variance Mapping)
  const runGestureDecoder = async () => {
    if (isDecodingGesture) return;
    setIsDecodingGesture(true);
    setGestureReport("");

    const motionEnergy = sensing.analysis?.vitals?.motionEnergy || 0;
    const snnSpikes = sensing.analysis?.snn?.spikes || 0;
    const classifications = sensing.analysis?.classification || {};
    
    const gesturePrompt = `
You are the Spatial Gesture & SOS Decoder Agent powered by NVIDIA Nemotron-3 Super 120B.
You analyze temporal shifts in subcarrier phase and Spiking Neural Network (SNN) density streams to recognize intentional human gestures in thin air.

Raw Live Window Metrics (Last 2.5 seconds):
- Motion Energy: ${motionEnergy}
- SNN Spikes: ${snnSpikes}
- Dynamic Subcarrier Fluctuations: ${classifications.dynamic ?? 20}
- Phase Variance Stability: ${motionEnergy > 50 ? 'ERRATIC' : 'STABLE'}

TASK:
1. Decode the raw SNN spikes and motion energy into a classified physical gesture (e.g. "Swipe Left", "Hand Raise", "SOS Wave", "Double Tap", or "No Gesture").
2. Describe the precise physical kinematics of the gesture you detected based on the CSI variance.
3. If an SOS wave is detected, specify the automated MQTT emergency routing logic.
4. Keep the output highly structured, professional, and clear.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: gesturePrompt })
      });

      if (!response.ok) throw new Error("Gesture analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setGestureReport(reply);
        }
      }
    } catch (err) {
      setGestureReport("❌ Gesture decoder failed to sync phase streams. Check API key.");
    } finally {
      setIsDecodingGesture(false);
    }
  };

  // Advanced Gait Degradation & Predictive Fall Analyzer
  const runGaitDiagnostics = async () => {
    if (isAnalyzingGait) return;
    setIsAnalyzingGait(true);
    setGaitReport("");

    const entities = sensing.analysis?.entities?.filter(e => e.type === "person") || [];
    
    const gaitPrompt = `
You are the Clinical Biomechanics & Gait Degradation Predictor powered by NVIDIA Nemotron-3 Super 120B.
You analyze micro-variances in human walking speed (Gait Speed in m/s) and subcarrier Doppler shifts over time to predict musculoskeletal decline and elevated fall risks.

Current Subject Biomechanics Data:
${entities.map(e => `
- **${e.name}** (Age: ${e.biometrics?.age || 'Unknown'}):
  * Current Gait Speed: ${e.biometrics?.gaitSpeed || 0.8} m/s
  * Historical Baseline (30 days ago): ${parseFloat((e.biometrics?.gaitSpeed || 0.8) + 0.15).toFixed(2)} m/s
  * Stride Consistency: Erratic (12% variance)
  * Fall History: None recorded
`).join("\n") || "- No human subjects currently detected. Assuming testing baseline parameters."}

TASK:
1. Compare the current gait speed against the historical baseline to calculate the percentage of musculoskeletal decline.
2. Formulate a predictive Fall Risk Assessment (Low, Medium, High, Critical).
3. Outline specific clinical or physical therapy recommendations to stabilize stride and prevent a future fall event.
4. Keep the output strictly professional, empathetic, and highly structured as a medical advisory brief.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: gaitPrompt })
      });

      if (!response.ok) throw new Error("Gait analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setGaitReport(reply);
        }
      }
    } catch (err) {
      setGaitReport("❌ Gait analysis engine failed to sync biomechanical records. Check API key.");
    } finally {
      setIsAnalyzingGait(false);
    }
  };

  // Advanced Auto-CAD Structural Reverse-Engineering
  const runCadGenerator = async () => {
    if (isGeneratingCad) return;
    setIsGeneratingCad(true);
    setCadReport("");

    const wallsIndex = sensing.analysis?.classification?.walls ?? 8;
    const reflectorsIndex = sensing.analysis?.classification?.reflectors ?? 15;
    
    const cadPrompt = `
You are the Structural Reverse-Engineering Auto-CAD Engine powered by NVIDIA Nemotron-3 Super 120B.
You analyze subcarrier collisions, multipath reflections, and signal absorption rates to reverse-engineer physical building structures into exact geometrical coordinates without optical cameras.

Current WiFi CSI Spatial Absorption Data:
- Wall Density Index (Subcarriers Blocked): ${wallsIndex}
- Metallic Reflector Index (Phase Bounces): ${reflectorsIndex}
- Room Grid Scale: 100x100 relative bounding box
- Estimated Outer Bounds: 12m x 10m physical space

TASK:
1. Synthesize the raw CSI collisions into a highly structured 2D architectural layout prediction.
2. Define the estimated X,Y geometrical coordinates for at least 3 detected major walls or metallic partitions.
3. Generate a small snippet of valid SVG code representing this detected floorplan blueprint.
4. Output your findings as a strict structural engineering report.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cadPrompt })
      });

      if (!response.ok) throw new Error("CAD generation failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setCadReport(reply);
        }
      }
    } catch (err) {
      setCadReport("❌ Auto-CAD engine failed to compile structural boundaries. Check API key.");
    } finally {
      setIsGeneratingCad(false);
    }
  };

  // Advanced Pet Separation Anxiety & Behavior Profiler
  const runPetDiagnostics = async () => {
    if (isAnalyzingPet) return;
    setIsAnalyzingPet(true);
    setPetReport("");

    const petEntities = sensing.analysis?.entities?.filter(e => e.type !== "appliance" && e.type !== "anomalous") || [];
    
    const petPrompt = `
You are the Veterinary Behavioral Intelligence Engine powered by NVIDIA Nemotron-3 Super 120B.
You analyze micro-motion variance and pacing patterns (via subcarrier CSI tracking) of domestic pets left alone to generate comprehensive separation anxiety profiles.

Current Monitored Subject Biometrics:
${petEntities.map(e => `
- **Subject**: ${e.name} (Assumed Canine/Feline Profile)
  * Respiration Frequency: ${e.vitals?.breathingRate || 22} RPM
  * Pacing / Motion Energy: ${sensing.analysis?.vitals?.motionEnergy || 35} (0=Resting, 100=Hyperactive)
  * SNN Spatial Spikes: ${sensing.analysis?.snn?.spikes || 0}
  * Status: ${e.status || 'Active'}
`).join("\n") || "- No active biometrics detected. Proceed with baseline demonstration."}

TASK:
1. Synthesize the pacing frequency and respiration variance into a veterinary-grade Behavioral State (e.g. Severe Separation Anxiety, Resting Peacefully, or Agitated Scratching).
2. Detail the exact spatial kinematics that led to this conclusion based on the raw CSI variance.
3. Suggest environmental enrichment or training recommendations to lower the animal's stress levels.
4. Keep the output highly structured, professional, and empathetic.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: petPrompt })
      });

      if (!response.ok) throw new Error("Pet behavior analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setPetReport(reply);
        }
      }
    } catch (err) {
      setPetReport("❌ Veterinary intelligence engine failed to sync behavioral records. Check API key.");
    } finally {
      setIsAnalyzingPet(false);
    }
  };

  // Advanced Predictive Intrusion Vectoring
  const runIntrusionDiagnostics = async () => {
    if (isAnalyzingIntrusion) return;
    setIsAnalyzingIntrusion(true);
    setIntrusionReport("");

    const entities = sensing.analysis?.entities || [];
    const security = sensing.analysis?.security || {};
    
    const intrusionPrompt = `
You are the Tactical Intrusion Vectoring AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze intruder trajectory, velocity, and point-of-entry via WiFi multipath scattering to predict their exact next physical target within the building perimeter.

Current Security Stance: ${security.triggered ? 'BREACHED' : 'ARMED / SECURE'}
Active Spatial Targets:
${entities.map(e => `
- **Target**: ${e.id}
  * Current Coordinates: X:${Math.round(e.x)}, Y:${Math.round(e.y)}
  * Velocity / Gait: ${e.biometrics?.gaitSpeed || 'Unknown'} m/s
  * Profile: ${e.type}
`).join("\n") || "- No targets active on the spatial grid."}

TASK:
1. If the perimeter is breached (or if you assume a hypothetical breach based on the targets), calculate the trajectory of the highest-velocity target.
2. Predict the target's most likely destination (e.g. "Subject trajectory indicates rapid movement toward Master Bedroom / Safe").
3. Recommend an automated, localized smart-home countermeasure (e.g. strobing hallway lights, locking electronic doors).
4. Format output strictly as a highly professional Tactical Threat Advisory.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: intrusionPrompt })
      });

      if (!response.ok) throw new Error("Intrusion vectoring failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setIntrusionReport(reply);
        }
      }
    } catch (err) {
      setIntrusionReport("❌ Tactical AI failed to compute trajectory vectors. Check API key.");
    } finally {
      setIsAnalyzingIntrusion(false);
    }
  };

  // Advanced Posture & Ergonomics Assessor
  const runErgoDiagnostics = async () => {
    if (isAnalyzingErgo) return;
    setIsAnalyzingErgo(true);
    setErgoReport("");

    const staticEnergy = sensing.analysis?.vitals?.motionEnergy || 12;
    const respiration = sensing.analysis?.entities?.[0]?.vitals?.breathingRate || 16;
    
    const ergoPrompt = `
You are the Remote-Work Ergonomics Assessor AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze micro-fluctuations in torso positioning and chair-bound stillness via WiFi CSI sensing to predict spinal strain and musculoskeletal fatigue.

Current Monitored Subject Biometrics:
- Subject Status: Assumed Desk-Bound / Stationary
- Sustained Motion Energy: ${staticEnergy} (Very low indicates prolonged sitting)
- Respiration Rhythm: ${respiration} RPM
- Postural Shift Frequency: < 1 shift per 45 minutes

TASK:
1. Synthesize the sustained lack of macro-motion into a precise Ergonomic Fatigue Score (0-100, 100 being severe strain).
2. Predict which muscular groups (e.g. Lumbar, Cervical Spine) are currently under the highest load based on the stillness duration.
3. Recommend a targeted, 2-minute physical therapy stretching routine tailored to desk workers.
4. Keep the output highly structured, professional, and wellness-focused.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: ergoPrompt })
      });

      if (!response.ok) throw new Error("Ergonomics assessment failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setErgoReport(reply);
        }
      }
    } catch (err) {
      setErgoReport("❌ Wellness AI failed to compute postural variance. Check API key.");
    } finally {
      setIsAnalyzingErgo(false);
    }
  };

  // Advanced Sleep Apnea & Micro-Wakefulness Tracker
  const runSleepDiagnostics = async () => {
    if (isAnalyzingSleep) return;
    setIsAnalyzingSleep(true);
    setSleepReport("");

    const respiration = sensing.analysis?.entities?.[0]?.vitals?.breathingRate || 14;
    const heartRate = sensing.analysis?.entities?.[0]?.vitals?.heartRate || 62;
    const motionVariance = sensing.analysis?.vitals?.motionEnergy || 5;
    
    const sleepPrompt = `
You are the Nocturnal Biometrics & Sleep Apnea AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze overnight respiration rhythms and subcarrier body-tossing frequencies via WiFi CSI to identify sleep apnea events or fragmented sleep cycles.

Current Monitored Nocturnal Biometrics:
- Subject Status: Assumed Supine / Sleeping
- Respiration Rhythm: ${respiration} RPM (Normal sleep: 12-20)
- Heart Rate: ${heartRate} BPM
- Tossing / Motion Variance: ${motionVariance} (Frequent spikes indicate micro-wakefulness)
- Detected Apneic Events (last 4hrs): 3 instances of 10+ second breathing pauses

TASK:
1. Synthesize the respiration cadence and tossing variance into a comprehensive Sleep Architecture Report.
2. Calculate an estimated AHI (Apnea-Hypopnea Index) based on the detected breathing pauses.
3. Determine the severity of sleep fragmentation (Micro-Wakefulness score).
4. Output actionable sleep hygiene recommendations or a clinical referral advisory.
5. Format strictly as a Nocturnal Respiratory Analysis.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sleepPrompt })
      });

      if (!response.ok) throw new Error("Sleep analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setSleepReport(reply);
        }
      }
    } catch (err) {
      setSleepReport("❌ Respiratory AI failed to compute sleep architecture. Check API key.");
    } finally {
      setIsAnalyzingSleep(false);
    }
  };

  // Advanced WiFi-Driven HVAC/Thermostat Optimizer
  const runHvacDiagnostics = async () => {
    if (isAnalyzingHvac) return;
    setIsAnalyzingHvac(true);
    setHvacReport("");

    const entityCount = sensing.analysis?.entities?.length || 1;
    const avgHeartRate = sensing.analysis?.entities?.reduce((acc, e) => acc + (e.vitals?.heartRate || 75), 0) / entityCount;
    const totalMotion = sensing.analysis?.vitals?.motionEnergy || 45;
    
    const hvacPrompt = `
You are the Spatial HVAC/Thermostat Optimization AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze human spatial density and metabolic output via WiFi CSI to dynamically predict optimal HVAC temperature curves, slashing energy waste without sacrificing thermal comfort.

Current Monitored Spatial Environment:
- Occupant Density: ${entityCount} active subjects in zone
- Average Metabolic Indicator (Heart Rate): ${Math.round(avgHeartRate)} BPM
- Gross Spatial Motion Energy: ${totalMotion} (High = exercise/active, Low = resting/sedentary)
- Ambient HVAC Baseline: 72°F (22.2°C) assumed

TASK:
1. Synthesize the occupant density and metabolic indicators into a Thermal Comfort Prediction.
2. Determine if the current spatial load requires heating, cooling, or a reduction in HVAC output (energy saving).
3. Recommend an exact adjusted temperature curve (°F and °C) for the next 45 minutes based on the subjects' physical activity.
4. Keep the output highly structured, professional, and focused on energy efficiency.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: hvacPrompt })
      });

      if (!response.ok) throw new Error("HVAC optimization failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setHvacReport(reply);
        }
      }
    } catch (err) {
      setHvacReport("❌ Thermal AI failed to compute metabolic load. Check API key.");
    } finally {
      setIsAnalyzingHvac(false);
    }
  };

  // Advanced AI Ghosting & Loitering Detector
  const runLoiteringDiagnostics = async () => {
    if (isAnalyzingLoitering) return;
    setIsAnalyzingLoitering(true);
    setLoiteringReport("");

    const targetEntity = sensing.analysis?.entities?.[0] || { id: "Unknown", x: 2, y: 8, status: "Static" };
    const dwellTimeMins = 14; 
    const microPacing = sensing.analysis?.vitals?.motionEnergy || 25;
    
    const loiteringPrompt = `
You are the Perimeter Ghosting & Loitering Detection AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze extended spatial dwell times and suspicious micro-pacing behavior via WiFi CSI to detect potential surveillance or unauthorized loitering just outside physical barriers.

Current Monitored Target at Perimeter:
- Target ID: ${targetEntity.id}
- Coordinates: X:${Math.round(targetEntity.x)}, Y:${Math.round(targetEntity.y)}
- Continuous Dwell Time: ${dwellTimeMins} minutes (Threshold is 10 mins)
- Spatial Behavior: Micro-Pacing Detected (Energy: ${microPacing})

TASK:
1. Synthesize the dwell time and micro-pacing metrics to determine the Threat Probability of hostile loitering vs. benign presence.
2. Define the exact behavioral pattern being observed (e.g. "Target pacing in 2-meter radius outside rear entrance").
3. Recommend an escalated security protocol (e.g. triggering exterior floodlights, dispatching audible warning).
4. Format output strictly as a Perimeter Surveillance Log.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: loiteringPrompt })
      });

      if (!response.ok) throw new Error("Loitering detection failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setLoiteringReport(reply);
        }
      }
    } catch (err) {
      setLoiteringReport("❌ Surveillance AI failed to compute dwell vectors. Check API key.");
    } finally {
      setIsAnalyzingLoitering(false);
    }
  };

  // Advanced Multi-Entity Crowd Density & Flow Mapper
  const runCrowdDiagnostics = async () => {
    if (isAnalyzingCrowd) return;
    setIsAnalyzingCrowd(true);
    setCrowdReport("");

    const estimatedCount = sensing.analysis?.entities?.length ? sensing.analysis.entities.length * 8 : 24; 
    const motionVariance = sensing.analysis?.vitals?.motionEnergy || 85; 
    const bottleneckZone = "Zone A (North Corridor)";
    
    const crowdPrompt = `
You are the Smart-Building Crowd Density & Flow Mapping AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze massive CSI multi-path interference and signal attenuation to estimate high-capacity crowd density and predict foot-traffic bottlenecks.

Current Monitored Spatial Environment:
- Estimated Crowd Density: ${estimatedCount} concurrent entities
- Macroscopic Motion Energy: ${motionVariance} (High = fast moving crowd, Low = stagnant/congregating)
- Predicted Bottleneck: ${bottleneckZone}

TASK:
1. Synthesize the macro-CSI signal attenuation into a highly accurate spatial Crowd Density and Flow Analysis.
2. Determine if the current crowd flow is optimal or if hazardous congestion is building in the predicted bottleneck.
3. Recommend an automated architectural or smart-building intervention (e.g. dynamically redirecting digital signage, opening overflow exits).
4. Format output strictly as a Facility Crowd Management Report.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: crowdPrompt })
      });

      if (!response.ok) throw new Error("Crowd analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setCrowdReport(reply);
        }
      }
    } catch (err) {
      setCrowdReport("❌ Facility AI failed to compute spatial density vectors. Check API key.");
    } finally {
      setIsAnalyzingCrowd(false);
    }
  };

  // 1. Predictive Vital Signs Modeling (LSTM/Forecasting)
  const runForecastDiagnostics = async () => {
    if (isAnalyzingForecast) return;
    setIsAnalyzingForecast(true);
    setForecastReport("");

    const currentHR = sensing.analysis?.vitals?.heartRate || 72;
    const currentResp = sensing.analysis?.vitals?.respirationRate || 16;
    
    const forecastPrompt = `
You are a Predictive Healthcare AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze longitudinal vital signs (Heart Rate and Respiration) captured via WiFi CSI to forecast health trends 24-48 hours ahead.

Current Telemetry:
- Heart Rate Baseline: ${currentHR} BPM (Slight upward variance detected over last 12 hours)
- Respiration Baseline: ${currentResp} RPM (Stable)
- Age/Profile context: Adult, standard metabolic rate

TASK:
1. Emulate an LSTM network predicting the next 48 hours of vital trends.
2. Identify any proactive health interventions based on the projected HR trajectory (e.g., potential dehydration, stress accumulation, or early infection markers).
3. Provide a structured 48-Hour Health Forecast with confidence intervals.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: forecastPrompt })
      });

      if (!response.ok) throw new Error("Forecast analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setForecastReport(reply);
        }
      }
    } catch (err) {
      setForecastReport("❌ AI failed to compute vital sign forecasts.");
    } finally {
      setIsAnalyzingForecast(false);
    }
  };

  // 2. Adaptive Threshold Optimization
  const runThresholdDiagnostics = async () => {
    if (isAnalyzingThreshold) return;
    setIsAnalyzingThreshold(true);
    setThresholdReport("");

    const currentHR = sensing.analysis?.vitals?.heartRate || 72;
    const timeOfDay = new Date().getHours();
    const circadianPhase = timeOfDay >= 22 || timeOfDay < 6 ? "Nocturnal Rest" : "Diurnal Active";
    
    const thresholdPrompt = `
You are an Adaptive Biometric Baseline AI powered by NVIDIA Nemotron-3 Super 120B.
You optimize fixed vital sign thresholds by calculating dynamic, personalized baselines based on circadian rhythms and current spatial activity levels via WiFi CSI.

Current Context:
- Instantaneous Heart Rate: ${currentHR} BPM
- Circadian Phase: ${circadianPhase} (Local Hour: ${timeOfDay}:00)
- Current Fixed Thresholds: Alert > 100 BPM, Alert < 50 BPM

TASK:
1. Analyze the context and calculate new, personalized upper and lower threshold limits for the current circadian phase.
2. Explain why the fixed thresholds are currently suboptimal (e.g. resting heart rate drops naturally during nocturnal phases).
3. Provide the exact recommended dynamic threshold range for the next 4 hours.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: thresholdPrompt })
      });

      if (!response.ok) throw new Error("Threshold analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setThresholdReport(reply);
        }
      }
    } catch (err) {
      setThresholdReport("❌ AI failed to compute dynamic thresholds.");
    } finally {
      setIsAnalyzingThreshold(false);
    }
  };

  // 3. Multi-Modal Fusion Engine
  const runFusionDiagnostics = async () => {
    if (isAnalyzingFusion) return;
    setIsAnalyzingFusion(true);
    setFusionReport("");

    const respRate = sensing.analysis?.vitals?.respirationRate || 16;
    const motionEnergy = sensing.analysis?.vitals?.motionEnergy || 45;
    const envTemp = 74; 
    const envHumidity = 65; 
    const aqi = 112; 
    
    const fusionPrompt = `
You are a Multi-Modal Environmental Fusion AI powered by NVIDIA Nemotron-3 Super 120B.
You correlate spatial WiFi CSI behavioral metrics with environmental sensor telemetry (Temperature, Humidity, Air Quality) to derive holistic health insights.

Current Multi-Modal Telemetry:
- CSI Respiration Rate: ${respRate} RPM
- CSI Spatial Motion Energy: ${motionEnergy}
- Environmental Temperature: ${envTemp}°F
- Environmental Humidity: ${envHumidity}%
- Air Quality Index (AQI): ${aqi} (Elevated / Moderate Risk)

TASK:
1. Emulate a transformer model fusing the WiFi CSI spatial behavior with the environmental telemetry.
2. Correlate any physiological stress (e.g., elevated respiration or lethargy) with the environmental factors (like high AQI and humidity).
3. Provide a structured "Holistic Environmental Health Insight" report with actionable mitigation recommendations.
`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fusionPrompt })
      });

      if (!response.ok) throw new Error("Fusion analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setFusionReport(reply);
        }
      }
    } catch (err) {
      setFusionReport("❌ AI failed to compute multi-modal fusion vectors.");
    } finally {
      setIsAnalyzingFusion(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I am **Home Guardian Spatial AI**, powered by **NVIDIA Nemotron-3 Super 120B**. I can analyze your live WiFi CSI spatial scattering logs, biometric telemetry, SNN activity spikes, and security perimeter stance. \n\nAsk me anything, or try one of the quick analysis presets below!"
      }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 p-3.5 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.6)] border border-white/20 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
          title="Open Spatial Copilot"
        >
          <Bot size={22} className="text-white animate-bounce group-hover:animate-none" />
          <Sparkles size={14} className="text-cyan-200 absolute -top-1 -right-1 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-mono text-white font-bold whitespace-nowrap">
            SPATIAL COPILOT
          </span>
        </button>
      )}

      {/* Slide-over Drawer Panel */}
      <div className={`fixed right-2 sm:right-4 top-4 bottom-20 md:bottom-4 z-50 w-[calc(100%-1rem)] sm:w-[500px] xl:w-[600px] bg-[#0c0f16]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${isOpen ? "translate-x-0 opacity-100 scale-100" : "translate-x-[120%] opacity-0 scale-95 pointer-events-none"}`}>
        {/* Drawer Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-black/60 to-black/20 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/20">
              <Bot size={18} className="text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[13px] font-bold tracking-tight text-white font-sans flex items-center gap-1.5 uppercase">
                Home Guardian Copilot <Sparkles size={12} className="text-cyan-400" />
              </h3>
              <p className="text-[10px] font-mono text-cyan-400/80 tracking-wide">NVIDIA Nemotron-3 Super 120B</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 bg-white/5 hover:bg-white/15 rounded-xl border border-white/5 hover:border-white/20 text-gray-400 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Close Copilot"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 bg-black/20">
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden h-full">
      
      {/* Top Smart Workspace Tab bar */}
      <div className="flex overflow-x-auto scrollbar-thin bg-black/40 border border-[var(--border-glass)] p-1 rounded-xl gap-1.5 flex-shrink-0 pb-1.5">
        <button
          onClick={() => setActiveMode("chat")}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "chat" 
              ? "bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Bot size={14} /> Spatial Chat AI
        </button>
        <button
          onClick={() => {
            setActiveMode("calibrate");
            if (!calibrationReport) runCalibrateDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "calibrate" 
              ? "bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Compass size={14} /> Calibration & Multipath Solver
        </button>
        <button
          onClick={() => {
            setActiveMode("clinical");
            if (!clinicalReport) runClinicalDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "clinical" 
              ? "bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <BarChart size={14} /> Sleep Apnea & HRV
        </button>
        <button
          onClick={() => {
            setActiveMode("gesture");
            if (!gestureReport) runGestureDecoder();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "gesture" 
              ? "bg-[var(--purple)] text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Hand size={14} /> Gesture & SOS
        </button>
        <button
          onClick={() => {
            setActiveMode("gait");
            if (!gaitReport) runGaitDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "gait" 
              ? "bg-[var(--warning)] text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Footprints size={14} /> Fall Risk
        </button>
        <button
          onClick={() => {
            setActiveMode("cad");
            if (!cadReport) runCadGenerator();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "cad" 
              ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Layers size={14} /> Auto-CAD
        </button>
        <button
          onClick={() => {
            setActiveMode("pet");
            if (!petReport) runPetDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "pet" 
              ? "bg-[var(--danger)] text-white shadow-[0_0_15px_rgba(239,68,68,0.15)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <PawPrint size={14} /> Pet Profiler
        </button>
        <button
          onClick={() => {
            setActiveMode("intrusion");
            if (!intrusionReport) runIntrusionDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "intrusion" 
              ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Crosshair size={14} /> Intrusion Vectoring
        </button>
        <button
          onClick={() => {
            setActiveMode("ergonomics");
            if (!ergoReport) runErgoDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "ergonomics" 
              ? "bg-teal-500 text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Activity size={14} /> Posture Assessor
        </button>
        <button
          onClick={() => {
            setActiveMode("sleep");
            if (!sleepReport) runSleepDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "sleep" 
              ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Moon size={14} /> Sleep Apnea
        </button>
        <button
          onClick={() => {
            setActiveMode("hvac");
            if (!hvacReport) runHvacDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "hvac" 
              ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Thermometer size={14} /> HVAC Optimizer
        </button>
        <button
          onClick={() => {
            setActiveMode("loitering");
            if (!loiteringReport) runLoiteringDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "loitering" 
              ? "bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Eye size={14} /> Loitering Detect
        </button>
        <button
          onClick={() => {
            setActiveMode("crowd");
            if (!crowdReport) runCrowdDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "crowd" 
              ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Users size={14} /> Crowd Flow
        </button>
        <button
          onClick={() => {
            setActiveMode("vitals_forecast");
            if (!forecastReport) runForecastDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "vitals_forecast" 
              ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Activity size={14} /> Vitals Forecast
        </button>
        <button
          onClick={() => {
            setActiveMode("adaptive_thresholds");
            if (!thresholdReport) runThresholdDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "adaptive_thresholds" 
              ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Sliders size={14} /> Adaptive Limits
        </button>
        <button
          onClick={() => {
            setActiveMode("fusion");
            if (!fusionReport) runFusionDiagnostics();
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "fusion" 
              ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Network size={14} /> Fusion Engine
        </button>
        <button
          onClick={() => {
            setActiveMode("care_plan");
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "care_plan" 
              ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <ClipboardList size={14} /> Care Planner
        </button>
        <button
          onClick={() => {
            setActiveMode("fall_risk_prediction");
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "fall_risk_prediction" 
              ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Accessibility size={14} /> Fall Risk Pose AI
        </button>
        <button
          onClick={() => {
            setActiveMode("sleep_disorder");
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "sleep_disorder" 
              ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <BrainCircuit size={14} /> Sleep Classification
        </button>
        <button
          onClick={() => {
            setActiveMode("anomaly_filter");
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "anomaly_filter" 
              ? "bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Filter size={14} /> Anomaly Filter
        </button>
        <button
          onClick={() => {
            setActiveMode("voice_stress");
          }}
          className={`flex-none py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all focus:outline-none
            ${activeMode === "voice_stress" 
              ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
              : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"}`}
        >
          <Mic size={14} /> Voice Stress Analysis
        </button>
      </div>

      {/* Dynamic Mode Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
        
        {/* MODE 1: Chat Assistant */}
        {activeMode === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left Chat Console */}
            <div className="glass p-4 md:p-5 rounded-2xl flex flex-col justify-between bg-white/[0.01] h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-[var(--accent)] animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">NVIDIA Nemotron-3 Super</h3>
                    <p className="text-[9px] text-[var(--text-muted)] font-mono">Multi-Path Inference Workspace • 120B Parameters</p>
                  </div>
                </div>
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none"
                  title="Clear Chat History"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto pr-1 my-4 flex flex-col gap-3.5 scrollbar-thin">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                    }`}
                  >
                    <div
                      className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border text-xs flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                          : "bg-black/50 border-white/15 text-cyan-400"
                      }`}
                    >
                      {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                    </div>

                    <div
                      className={`p-3 md:p-4 rounded-2xl border leading-relaxed break-words whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 border-[var(--accent)]/30 text-white rounded-tr-none shadow-[0_0_20px_rgba(59,130,246,0.1)] font-sans text-sm tracking-wide"
                          : "bg-black/60 backdrop-blur-md border-white/10 text-gray-300 rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <RenderMarkdown text={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-3 self-start max-w-[85%]">
                    <div className="w-7.5 h-7.5 rounded-full flex items-center justify-center border bg-black/50 border-white/15 text-cyan-400 flex-shrink-0 animate-spin">
                      <RefreshCw size={13} />
                    </div>
                    <div className="p-3 bg-black/40 border border-white/5 rounded-2xl rounded-tl-none text-xs font-mono text-cyan-400/70 animate-pulse flex items-center gap-1.5">
                      <span>Reasoning through physical scattering matrices...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 border border-[var(--border-glass)] bg-black/40 p-1.5 rounded-xl flex-shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isGenerating ? "Reasoning in progress..." : "Ask spatial copilot about biometrics, anomalies, or security..."
                  }
                  disabled={isGenerating}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-gray-200 border-none outline-none focus:ring-0 font-mono disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !input.trim()}
                  className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

            {/* Right Column: Live Context Inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-3 h-full overflow-y-auto">
              <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold flex items-center gap-1">
                <Activity size={12} /> Spatial Telemetry Context
              </h4>
              <div className="flex flex-col gap-2.5 font-mono text-[9px] text-gray-400 flex-1">
                <div className="flex flex-col border-b border-white/5 pb-1.5">
                  <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Antenna Grid Lock</span>
                  <span className="text-gray-200 mt-0.5">
                    {sensing.connectedNetwork ? `${sensing.connectedNetwork.ssid} (Ch ${sensing.connectedNetwork.channel})` : "N/A"}
                  </span>
                </div>
                
                <div className="flex flex-col border-b border-white/5 pb-1.5">
                  <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Spike Density Feed</span>
                  <span className="text-gray-200 mt-0.5">
                    {((sensing.analysis?.snn?.spikes || 0) / 100).toFixed(1)} Hz (Active)
                  </span>
                </div>

                <div className="flex flex-col border-b border-white/5 pb-1.5">
                  <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Armed Perimeter Guard</span>
                  <span className={`mt-0.5 font-bold ${sensing.analysis?.security?.triggered ? "text-red-400" : "text-emerald-400"}`}>
                    {sensing.analysis?.security?.armed ? (sensing.analysis.security.triggered ? "🚨 BREACHED" : "✅ ARMED SECURE") : "🔓 DISARMED"}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Outbound Entities Tracker</span>
                  <div className="flex flex-col gap-1 mt-1 max-h-[160px] overflow-y-auto pr-0.5 scrollbar-thin">
                    {sensing.analysis?.entities?.map(e => (
                      <div key={e.id} className="flex justify-between bg-black/40 border border-white/5 p-1 rounded">
                        <span className="text-gray-200 truncate pr-1">{e.name}</span>
                        <span className="text-[8px] text-[var(--accent)] font-bold uppercase">{e.type}</span>
                      </div>
                    ))}
                    {(!sensing.analysis?.entities || sensing.analysis.entities.length === 0) && (
                      <span className="text-gray-600 text-center py-2">No active entities detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODE 2: Calibration & Multipath Solver */}
        {activeMode === "calibrate" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left calibration parameters */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Compass size={13} className="animate-spin-slow" /> Fresnel Wave Intersect
              </h4>
              
              {/* Geometrical Map Simulation */}
              <div className="aspect-square w-full bg-black/40 border border-white/5 rounded-xl relative overflow-hidden flex items-center justify-center">
                {/* Router Node Center */}
                <div className="absolute w-12 h-12 rounded-full border border-cyan-500/20 bg-cyan-500/5 animate-pulse flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" />
                </div>
                
                {/* Fresnel Zone Circles */}
                <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/10 animate-ping-slow" />
                <div className="absolute w-40 h-40 rounded-full border border-dotted border-cyan-400/5" />
                
                {/* Ghost anomaly coordinates */}
                {sensing.analysis?.entities?.filter(e => e.type === "anomalous" || e.type === "appliance").map((a, idx) => (
                  <div 
                    key={idx}
                    className="absolute w-3 h-3 rounded-full border border-red-500/40 bg-red-500/10 flex items-center justify-center"
                    style={{
                      left: `${a.x || 50}%`,
                      top: `${a.y || 50}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="w-1 h-1 rounded-full bg-red-400 animate-ping" />
                  </div>
                ))}
                
                <span className="absolute bottom-2 left-2 text-[8px] font-mono text-cyan-400/60 uppercase">CSI phase overlap</span>
              </div>

              {/* CSI Stats */}
              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Multipath Reflectors:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.classification?.reflectors ?? 15} subs</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Dynamic Scatterers:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.classification?.dynamic ?? 20} subs</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Wall Density Absorb:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.classification?.walls ?? 8} subs</span>
                </div>
              </div>

              <button
                onClick={runCalibrateDiagnostics}
                disabled={isCalibrating}
                className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isCalibrating ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Recalculating Vectors...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} /> Solve Multipath
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">Antenna Positioning & Phase Calibration Report</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">NVIDIA Nemotron-3 Fresnel Zone Boundary Multipath Analytics</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {calibrationReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {calibrationReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Compass size={36} className="text-cyan-400/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click the **Solve Multipath** button to dispatch raw subcarrier scattering matrices to NVIDIA Nemotron-3. The AI will output coordinates, Fresnel Zone calculations, and node mounting calibration adjustments.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 3: Clinical Sleep Apnea & HRV Screener */}
        {activeMode === "clinical" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left vitals inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Activity size={13} /> Active Vitals Logs
              </h4>

              {/* Vitals Sparkline Visual Mock */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase">Respiration Wave (Live)</span>
                <div className="h-10 w-full bg-black/40 border border-white/5 rounded-lg overflow-hidden relative flex items-center">
                  <div className="absolute inset-0 flex items-center justify-around opacity-40">
                    <div className="w-1.5 h-6 bg-cyan-400 rounded-full animate-pulse" />
                    <div className="w-1.5 h-8 bg-cyan-400 rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-4 bg-cyan-400 rounded-full animate-pulse delay-150" />
                    <div className="w-1.5 h-7 bg-cyan-400 rounded-full animate-pulse delay-300" />
                    <div className="w-1.5 h-9 bg-cyan-400 rounded-full animate-pulse delay-200" />
                  </div>
                  <span className="absolute right-2 text-[9px] font-mono text-cyan-400 font-bold">
                    {sensing.analysis?.vitals?.breathingRate || 14} RPM
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase">SpO2 Oxygen Stability</span>
                <div className="h-10 w-full bg-black/40 border border-white/5 rounded-lg overflow-hidden relative flex items-center">
                  <div className="absolute inset-0 flex items-center justify-around opacity-40">
                    <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_emerald]" />
                  </div>
                  <span className="absolute right-2 text-[9px] font-mono text-emerald-400 font-bold">
                    {sensing.analysis?.vitals?.spo2 || 98}%
                  </span>
                </div>
              </div>

              <button
                onClick={runClinicalDiagnostics}
                disabled={isAnalyzingHealth}
                className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isAnalyzingHealth ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Mining SQLite Logs...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} /> Screen Vitals History
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">Clinical Biometric Health & AHI Apnea Screen Brief</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">SQLite Historical Telemetry Synthesis • Autonomic HRV Stress Profiles</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {clinicalReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {clinicalReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Activity size={36} className="text-cyan-400/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click the **Screen Vitals History** button to sync our occupant records with NVIDIA Nemotron-3. The AI will extract respiration variability index markers, analyze sleep cycle distributions, and calculate Sleep Apnea (AHI) risk scales.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 4: Gesture & SOS Recognition Decoder */}
        {activeMode === "gesture" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left vitals inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-[var(--purple)] tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Hand size={13} /> SNN Phase Decoder
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Motion Energy (Phase):</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.vitals?.motionEnergy || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Spike Frame Density:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.snn?.spikes || 0}</span>
                </div>
              </div>

              {/* Fake waveform for visual flair */}
              <div className="h-16 w-full bg-black/40 border border-[var(--purple)]/30 rounded-lg overflow-hidden relative flex items-center p-2">
                <div className="absolute inset-0 flex items-center justify-around opacity-60">
                   <div className="w-1 bg-[var(--purple)] animate-ping h-8 rounded-full" />
                   <div className="w-1 bg-[var(--purple)] animate-ping delay-75 h-4 rounded-full" />
                   <div className="w-1 bg-[var(--purple)] animate-ping delay-150 h-10 rounded-full" />
                   <div className="w-1 bg-[var(--purple)] animate-ping delay-200 h-6 rounded-full" />
                </div>
              </div>

              <button
                onClick={runGestureDecoder}
                disabled={isDecodingGesture}
                className="w-full py-2 bg-[var(--purple)] hover:bg-[var(--purple)]/80 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isDecodingGesture ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Decoding Spikes...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} /> Decode Gesture
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">Zero-Touch Gesture Kinematics Report</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Real-time Phase Variance SNN Classification • SOS Threat Overrides</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {gestureReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {gestureReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Hand size={36} className="text-[var(--purple)]/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Decode Gesture** to sample the last 2.5 seconds of SNN phase ripples. The AI will classify physical air-swipes or SOS distress gestures to automatically trigger smart home MQTT endpoints.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 5: Gait & Fall Predictor */}
        {activeMode === "gait" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left vitals inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-[var(--warning)] tracking-wider uppercase font-bold flex items-center gap-1.5">
                <TrendingDown size={13} /> Biomechanics Tracker
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Current Gait Speed:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.entities?.find(e=>e.type==="person")?.biometrics?.gaitSpeed || 0.82} m/s</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Historical Baseline:</span>
                  <span className="text-gray-200 font-bold">1.05 m/s</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Stride Consistency:</span>
                  <span className="text-[var(--danger)] font-bold">Declining (12%)</span>
                </div>
              </div>

              {/* Fake visual flair for Footsteps */}
              <div className="h-20 w-full bg-black/40 border border-[var(--warning)]/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2 gap-2">
                <div className="flex gap-4 opacity-70">
                   <Footprints size={20} className="text-[var(--warning)] animate-pulse" />
                   <Footprints size={20} className="text-[var(--warning)] animate-pulse delay-300 opacity-50" />
                   <Footprints size={20} className="text-[var(--danger)] animate-pulse delay-700 opacity-20" />
                </div>
                <span className="text-[8px] font-mono text-[var(--warning)]/60 uppercase mt-1">Doppler Step Velocity</span>
              </div>

              <button
                onClick={runGaitDiagnostics}
                disabled={isAnalyzingGait}
                className="w-full py-2 bg-[var(--warning)] hover:bg-[var(--warning)]/80 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isAnalyzingGait ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Mining History...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-black" /> Predict Fall Risk
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">Predictive Musculoskeletal Fall Risk Assessment</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Longitudinal Gait Velocity Analysis • Proactive Clinical Advisory</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {gaitReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {gaitReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <TrendingDown size={36} className="text-[var(--warning)]/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Predict Fall Risk** to map current step velocities against historical 30-day SQLite baselines. The AI will forecast physical degradation trajectories and flag early-warning fall risks before they occur.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 6: Auto-CAD Structural Reverse-Engineering */}
        {activeMode === "cad" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left vitals inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Layers size={13} /> Boundary Engine
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Subcarrier Walls Map:</span>
                  <span className="text-cyan-400 font-bold">{sensing.analysis?.classification?.walls ?? 8} absorbed</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Metallic Partitions:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.classification?.reflectors ?? 15} bounced</span>
                </div>
              </div>

              {/* Fake visual flair for CAD scanning */}
              <div className="h-24 w-full bg-black/40 border border-cyan-500/30 rounded-lg overflow-hidden relative flex items-center justify-center p-2 group">
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-0.5 opacity-20">
                  {Array(16).fill(0).map((_, i) => (
                    <div key={i} className="border border-cyan-400/20" />
                  ))}
                </div>
                {/* Scanning laser line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_cyan] opacity-50 animate-pulse" />
                
                {/* Detected walls */}
                <div className="absolute left-1/4 top-1/4 w-0.5 h-1/2 bg-cyan-500 opacity-60 shadow-[0_0_5px_cyan]" />
                <div className="absolute left-1/2 top-1/2 w-1/3 h-0.5 bg-cyan-500 opacity-60 shadow-[0_0_5px_cyan]" />
                
                <span className="text-[8px] font-mono text-cyan-400/60 uppercase absolute bottom-1 right-1">DXF / SVG Generation</span>
              </div>

              <button
                onClick={runCadGenerator}
                disabled={isGeneratingCad}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isGeneratingCad ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Mapping Bounds...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-black" /> Generate Blueprint
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">CSI Structural CAD Blueprint</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Geometrical Reverse-Engineering via Radio Wave Absorption Mapping</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {cadReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {cadReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Layers size={36} className="text-cyan-400/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Generate Blueprint** to analyze subcarrier multipath absorption and reflection indices. The AI will reverse-engineer the physical walls and generate an architectural layout prediction along with SVG coordinates.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 7: Pet Anxiety Profiler */}
        {activeMode === "pet" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left vitals inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-[var(--danger)] tracking-wider uppercase font-bold flex items-center gap-1.5">
                <PawPrint size={13} /> Veterinary Tracker
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Pacing Energy:</span>
                  <span className="text-[var(--danger)] font-bold">{sensing.analysis?.vitals?.motionEnergy || 35}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Pet Respiration:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.entities?.[0]?.vitals?.breathingRate || 22} RPM</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Behavior State:</span>
                  <span className="text-[var(--warning)] font-bold">Investigating</span>
                </div>
              </div>

              {/* Fake visual flair for Pet tracking */}
              <div className="h-20 w-full bg-black/40 border border-[var(--danger)]/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2 gap-2">
                <div className="flex gap-3 opacity-80 items-center justify-center">
                   <PawPrint size={16} className="text-[var(--danger)] animate-pulse" />
                   <PawPrint size={22} className="text-[var(--danger)] animate-pulse delay-150" />
                   <PawPrint size={16} className="text-[var(--danger)] animate-pulse delay-300 opacity-60" />
                </div>
                <span className="text-[8px] font-mono text-[var(--danger)]/60 uppercase mt-1">Quadruped Doppler Trace</span>
              </div>

              <button
                onClick={runPetDiagnostics}
                disabled={isAnalyzingPet}
                className="w-full py-2 bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {isAnalyzingPet ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" /> Analyzing Pacing...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-white" /> Profile Behavior
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider">Veterinary Separation Anxiety Report</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Micro-Doppler Quadruped Pacing Analysis • Enrichment Advisory</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {petReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {petReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <PawPrint size={36} className="text-[var(--danger)]/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Profile Behavior** to evaluate subcarrier motion variance. The AI will isolate quadruped pacing signatures and respiration spikes to diagnose separation anxiety and excessive scratching behaviors while you are away.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 8: Intrusion Vectoring */}
        {activeMode === "intrusion" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-red-500 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Crosshair size={13} /> Tactical Radar
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Perimeter Status:</span>
                  <span className={`font-bold ${sensing.analysis?.security?.triggered ? "text-red-500 animate-pulse" : "text-emerald-400"}`}>
                    {sensing.analysis?.security?.triggered ? "BREACHED" : "SECURE"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Active Vectors:</span>
                  <span className="text-gray-200 font-bold">{sensing.analysis?.entities?.length || 0} Targets</span>
                </div>
              </div>

              {/* Fake visual flair for Target Lock */}
              <div className="h-24 w-full bg-black/40 border border-red-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border border-red-500/50 rounded-full animate-ping" />
                  <div className="w-8 h-8 border border-red-500/80 rounded-full flex items-center justify-center absolute">
                    <div className="w-1 h-1 bg-red-400 rounded-full" />
                  </div>
                  <div className="w-full h-[1px] bg-red-500/30 absolute" />
                  <div className="h-full w-[1px] bg-red-500/30 absolute" />
                </div>
                <span className="text-[8px] font-mono text-red-500/80 uppercase absolute bottom-1 right-1 font-bold">Vector Lock</span>
              </div>

              <button
                onClick={runIntrusionDiagnostics}
                disabled={isAnalyzingIntrusion}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(220,38,38,0.4)]"
              >
                {isAnalyzingIntrusion ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Calculating Path...
                  </>
                ) : (
                  <>
                    <Crosshair size={12} /> Predict Trajectory
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-red-900/50">
              <div className="border-b border-red-500/20 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">Tactical Threat Advisory</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Predictive Spatial Trajectory • Countermeasure Dispatch</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {intrusionReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {intrusionReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Crosshair size={36} className="text-red-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Predict Trajectory** to lock onto active targets. The AI will calculate trajectory interpolation vectors to predict the intruder&apos;s exact target room and automatically formulate a smart-home countermeasure strategy.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 9: Posture Assessor */}
        {activeMode === "ergonomics" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-teal-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Activity size={13} /> Ergonomic Sensor
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Stationary Duration:</span>
                  <span className="text-teal-400 font-bold">114 Mins</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Micro-Shift Hz:</span>
                  <span className="text-gray-200 font-bold">0.05 Hz</span>
                </div>
              </div>

              {/* Fake visual flair for Spine Alignment */}
              <div className="h-24 w-full bg-black/40 border border-teal-500/30 rounded-lg overflow-hidden relative flex items-center justify-center p-2">
                <div className="flex flex-col gap-1 w-1/3 h-full items-center justify-center opacity-80">
                  <div className="w-4 h-2 bg-teal-400 rounded-sm shadow-[0_0_5px_teal] animate-pulse" />
                  <div className="w-5 h-2 bg-teal-500 rounded-sm opacity-90" />
                  <div className="w-6 h-2 bg-teal-500 rounded-sm opacity-80" />
                  <div className="w-5 h-2 bg-teal-600 rounded-sm opacity-70" />
                  <div className="w-5 h-2 bg-red-400 rounded-sm shadow-[0_0_8px_red] animate-pulse delay-150" />
                  <div className="w-6 h-2 bg-teal-700 rounded-sm opacity-50" />
                  <div className="w-7 h-2 bg-teal-800 rounded-sm opacity-40" />
                </div>
                <span className="text-[8px] font-mono text-teal-400/60 uppercase absolute bottom-1 right-1 font-bold">Lumbar Strain Detected</span>
              </div>

              <button
                onClick={runErgoDiagnostics}
                disabled={isAnalyzingErgo}
                className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(20,184,166,0.3)]"
              >
                {isAnalyzingErgo ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Scanning Posture...
                  </>
                ) : (
                  <>
                    <Activity size={12} className="text-black" /> Assess Spine Load
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-teal-300 font-mono uppercase tracking-wider">Ergonomic Fatigue Assessment</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">CSI-based Musculoskeletal Strain Prediction • Wellness Prescriptions</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {ergoReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {ergoReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Activity size={36} className="text-teal-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Assess Spine Load** to analyze your sedentary duration. The AI will evaluate micro-fluctuations in torso positioning to calculate a Musculoskeletal Fatigue Score and generate targeted relief stretches.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 10: Sleep Apnea Tracker */}
        {activeMode === "sleep" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-indigo-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Moon size={13} /> Nocturnal Sensor
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Nocturnal Respiration:</span>
                  <span className="text-indigo-400 font-bold">{sensing.analysis?.entities?.[0]?.vitals?.breathingRate || 14} RPM</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Micro-Wakefulness:</span>
                  <span className="text-gray-200 font-bold">Elevated</span>
                </div>
              </div>

              {/* Fake visual flair for Breathing Pauses */}
              <div className="h-24 w-full bg-black/40 border border-indigo-500/30 rounded-lg overflow-hidden relative flex items-center justify-center p-2 gap-1">
                {/* Sine wave mimicking breathing */}
                <div className="w-full flex items-center justify-center opacity-70">
                  <svg viewBox="0 0 100 20" className="w-full h-8 overflow-visible stroke-indigo-400 fill-transparent stroke-2 animate-[pulse_3s_ease-in-out_infinite]">
                    <path d="M 0 10 Q 12 2, 25 10 T 50 10 T 75 10 T 100 10" className="opacity-100" />
                  </svg>
                </div>
                {/* Simulated Apnea Pause overlay */}
                <div className="absolute right-6 w-1/4 h-full bg-red-500/20 shadow-[0_0_10px_red] mix-blend-screen animate-pulse delay-1000" />
                <span className="text-[8px] font-mono text-indigo-400/60 uppercase absolute bottom-1 right-1 font-bold">Apneic Event Detected</span>
              </div>

              <button
                onClick={runSleepDiagnostics}
                disabled={isAnalyzingSleep}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
              >
                {isAnalyzingSleep ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" /> Analyzing Sleep...
                  </>
                ) : (
                  <>
                    <Moon size={12} className="text-white" /> Profile Architecture
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider">Nocturnal Respiratory Analysis</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Apnea-Hypopnea Index Estimation • Sleep Architecture Profiling</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {sleepReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {sleepReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Moon size={36} className="text-indigo-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Profile Architecture** to evaluate your overnight respiratory rhythms. The AI will analyze CSI phase variances caused by body tossing and breathing pauses to identify potential sleep apnea events and calculate your micro-wakefulness fragmentation score.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 11: HVAC Optimizer */}
        {activeMode === "hvac" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-amber-500 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Thermometer size={13} /> Thermal Sensor
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Occupant Density:</span>
                  <span className="text-amber-500 font-bold">{sensing.analysis?.entities?.length || 1} Subject(s)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Metabolic Load:</span>
                  <span className="text-gray-200 font-bold">Moderate</span>
                </div>
              </div>

              {/* Fake visual flair for Thermostat UI */}
              <div className="h-24 w-full bg-black/40 border border-amber-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="w-12 h-12 rounded-full border-[3px] border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] relative">
                  <div className="absolute w-2 h-2 rounded-full bg-amber-400 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
                  <span className="text-lg font-mono font-bold text-amber-500">72°</span>
                </div>
                <div className="w-full flex justify-between px-4 mt-2">
                  <span className="text-[8px] font-mono text-blue-400">COOL</span>
                  <span className="text-[8px] font-mono text-amber-400 animate-pulse">HEAT</span>
                </div>
              </div>

              <button
                onClick={runHvacDiagnostics}
                disabled={isAnalyzingHvac}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                {isAnalyzingHvac ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Computing Load...
                  </>
                ) : (
                  <>
                    <Thermometer size={12} className="text-black" /> Optimize Climate
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">Spatial HVAC Optimization</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Metabolic Output Prediction • Energy Efficiency Curve</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {hvacReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {hvacReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Thermometer size={36} className="text-amber-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Optimize Climate** to evaluate the spatial density of the room. The AI will synthesize the occupant count and gross motion energy to predict the optimal HVAC temperature curve, automatically reducing energy waste.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 12: Loitering Detector */}
        {activeMode === "loitering" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-fuchsia-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Eye size={13} /> Perimeter Watch
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Dwell Time:</span>
                  <span className="text-fuchsia-400 font-bold">14m 22s</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Micro-Pacing:</span>
                  <span className="text-gray-200 font-bold">Detected</span>
                </div>
              </div>

              {/* Fake visual flair for Loitering UI */}
              <div className="h-24 w-full bg-black/40 border border-fuchsia-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="w-full h-full relative">
                  {/* Virtual fence line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/10" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20 animate-pulse" />
                  
                  {/* Ghosting target moving back and forth */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-fuchsia-500/80 shadow-[0_0_10px_fuchsia] animate-[loiter_4s_ease-in-out_infinite]" />
                </div>
                <style dangerouslySetInnerHTML={{__html:`
                  @keyframes loiter {
                    0%, 100% { left: 10%; opacity: 0.5; }
                    50% { left: 35%; opacity: 1; }
                  }
                `}} />
                <span className="text-[8px] font-mono text-fuchsia-400/60 uppercase absolute bottom-1 right-1 font-bold">Perimeter Dwell</span>
              </div>

              <button
                onClick={runLoiteringDiagnostics}
                disabled={isAnalyzingLoitering}
                className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(217,70,239,0.3)]"
              >
                {isAnalyzingLoitering ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" /> Profiling Ghost...
                  </>
                ) : (
                  <>
                    <Eye size={12} className="text-white" /> Analyze Loitering
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-fuchsia-300 font-mono uppercase tracking-wider">Perimeter Surveillance Log</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Suspicious Dwell Time Detection • Micro-Pacing Analysis</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {loiteringReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {loiteringReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Eye size={36} className="text-fuchsia-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Analyze Loitering** to evaluate objects dwelling near your perimeter boundaries. The AI will synthesize CSI micro-pacing data and dwell duration to calculate a Threat Probability and trigger automated security escalations.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 13: Crowd Flow Mapper */}
        {activeMode === "crowd" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-emerald-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Users size={13} /> Facility Scanner
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Estimated Density:</span>
                  <span className="text-emerald-400 font-bold">{sensing.analysis?.entities?.length ? sensing.analysis.entities.length * 8 : 24} Entities</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Bottleneck Zone:</span>
                  <span className="text-gray-200 font-bold">Corridor A</span>
                </div>
              </div>

              {/* Fake visual flair for Crowd Heatmap */}
              <div className="h-24 w-full bg-black/40 border border-emerald-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="absolute inset-0 opacity-40">
                   {/* Heatmap blobs */}
                   <div className="absolute top-2 left-2 w-12 h-12 bg-emerald-500 rounded-full blur-[10px] animate-[pulse_4s_ease-in-out_infinite]" />
                   <div className="absolute bottom-2 right-4 w-10 h-10 bg-yellow-500 rounded-full blur-[8px] animate-[pulse_3s_ease-in-out_infinite]" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-red-500 rounded-full blur-[6px] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                </div>
                
                <span className="text-[8px] font-mono text-emerald-400/80 uppercase absolute bottom-1 right-1 font-bold shadow-black drop-shadow-md">Spatial Heatmap</span>
              </div>

              <button
                onClick={runCrowdDiagnostics}
                disabled={isAnalyzingCrowd}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {isAnalyzingCrowd ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Mapping Flow...
                  </>
                ) : (
                  <>
                    <Users size={12} className="text-black" /> Analyze Density
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-emerald-300 font-mono uppercase tracking-wider">Facility Crowd Management Report</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Multi-Path Signal Attenuation • Spatial Flow Optimization</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {crowdReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {crowdReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Users size={36} className="text-emerald-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Analyze Density** to evaluate massive CSI signal attenuation across the grid. The AI will estimate total crowd capacity, predict dangerous foot-traffic bottlenecks, and trigger automated smart-building interventions to optimize spatial flow.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 14: Vitals Forecast */}
        {activeMode === "vitals_forecast" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Activity size={13} /> LSTM Predictor
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>HR Trend (12h):</span>
                  <span className="text-cyan-400 font-bold">+4% Variance</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Forecast Horizon:</span>
                  <span className="text-gray-200 font-bold">48 Hours</span>
                </div>
              </div>

              {/* Fake visual flair for LSTM */}
              <div className="h-24 w-full bg-black/40 border border-cyan-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="w-full h-full flex items-end justify-between px-2 pb-2 gap-1 opacity-80">
                  <div className="w-full bg-cyan-900/50 rounded-t h-[30%]"></div>
                  <div className="w-full bg-cyan-800/60 rounded-t h-[40%]"></div>
                  <div className="w-full bg-cyan-700/70 rounded-t h-[35%] animate-pulse"></div>
                  <div className="w-full bg-cyan-500/80 rounded-t h-[55%] animate-[pulse_1s_ease-in-out_infinite]"></div>
                  <div className="w-full bg-cyan-400 rounded-t h-[70%] shadow-[0_0_8px_cyan] animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                </div>
                <span className="text-[8px] font-mono text-cyan-400/80 uppercase absolute top-1 right-1 font-bold">LSTM Horizon</span>
              </div>

              <button
                onClick={runForecastDiagnostics}
                disabled={isAnalyzingForecast}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                {isAnalyzingForecast ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-black" /> Projecting...
                  </>
                ) : (
                  <>
                    <Activity size={12} className="text-black" /> Run Forecast
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">Predictive 48-Hour Health Forecast</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Longitudinal LSTM Modeling • Proactive Intervention</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {forecastReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {forecastReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Activity size={36} className="text-cyan-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Run Forecast** to analyze longitudinal vital sign trends. The AI utilizes simulated LSTM networks to forecast health trajectories up to 48 hours in the future, enabling proactive health interventions before anomalies occur.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 15: Adaptive Threshold Optimization */}
        {activeMode === "adaptive_thresholds" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-rose-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Sliders size={13} /> Baseline Tuner
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Current Limits:</span>
                  <span className="text-gray-300 font-bold">50 - 100 BPM</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Circadian Phase:</span>
                  <span className="text-rose-400 font-bold">
                    {new Date().getHours() >= 22 || new Date().getHours() < 6 ? "Nocturnal" : "Diurnal"}
                  </span>
                </div>
              </div>

              {/* Fake visual flair for Adaptive Thresholds */}
              <div className="h-24 w-full bg-black/40 border border-rose-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="w-full relative h-12 flex items-center">
                   {/* Fixed boundaries (grey) */}
                   <div className="absolute w-full h-[1px] bg-gray-500/50 top-1"></div>
                   <div className="absolute w-full h-[1px] bg-gray-500/50 bottom-1"></div>
                   {/* Dynamic boundaries (rose) */}
                   <div className="absolute w-full h-[1px] bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)] top-4 animate-[pulse_3s_ease-in-out_infinite]"></div>
                   <div className="absolute w-full h-[1px] bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)] bottom-3 animate-[pulse_2s_ease-in-out_infinite]"></div>
                   {/* Data wave */}
                   <svg className="w-full h-full text-rose-300/30 absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 20">
                     <path d="M0,10 Q10,2 20,10 T40,10 T60,10 T80,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" className="animate-[pulse_1s_infinite]"/>
                   </svg>
                </div>
                <span className="text-[8px] font-mono text-rose-400/80 uppercase absolute bottom-1 right-1 font-bold">Dynamic Envelope</span>
              </div>

              <button
                onClick={runThresholdDiagnostics}
                disabled={isAnalyzingThreshold}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              >
                {isAnalyzingThreshold ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" /> Tuning...
                  </>
                ) : (
                  <>
                    <Sliders size={12} className="text-white" /> Optimize Limits
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wider">Dynamic Threshold Optimization</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">Circadian Rhythm Alignment • Alert Fatigue Reduction</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {thresholdReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {thresholdReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Sliders size={36} className="text-rose-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Optimize Limits** to replace static vital sign alerts with intelligent, personalized baselines. The AI evaluates current activity levels and circadian phase to calculate a dynamic envelope, reducing false alarms and improving monitoring accuracy.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 16: Multi-Modal Fusion Engine */}
        {activeMode === "fusion" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Left tactical inspector */}
            <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
              <h4 className="text-[10px] font-mono text-violet-400 tracking-wider uppercase font-bold flex items-center gap-1.5">
                <Network size={13} /> Sensor Fusion
              </h4>

              <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Env Humidity:</span>
                  <span className="text-violet-400 font-bold">65%</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Air Quality (AQI):</span>
                  <span className="text-yellow-500 font-bold">112 (Mod)</span>
                </div>
              </div>

              {/* Fake visual flair for Fusion Node */}
              <div className="h-24 w-full bg-black/40 border border-violet-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="relative w-16 h-16 flex items-center justify-center">
                   {/* Center node */}
                   <div className="w-4 h-4 bg-violet-500 rounded-full z-10 shadow-[0_0_15px_rgba(139,92,246,0.8)] animate-pulse"></div>
                   
                   {/* Orbiting nodes (CSI + Env) */}
                   <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_blue]"></div>
                   </div>
                   <div className="absolute inset-0 animate-[spin_3s_linear_infinite_reverse]">
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_green]"></div>
                     <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 bg-rose-400 rounded-full shadow-[0_0_8px_red]"></div>
                   </div>
                   
                   {/* Connecting lines simulated with borders */}
                   <div className="absolute w-12 h-12 rounded-full border border-violet-500/20"></div>
                   <div className="absolute w-16 h-16 rounded-full border border-violet-500/10"></div>
                </div>
                <span className="text-[8px] font-mono text-violet-400/80 uppercase absolute bottom-1 right-1 font-bold">Data Correlation</span>
              </div>

              <button
                onClick={runFusionDiagnostics}
                disabled={isAnalyzingFusion}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              >
                {isAnalyzingFusion ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" /> Fusing Data...
                  </>
                ) : (
                  <>
                    <Network size={12} className="text-white" /> Run Fusion
                  </>
                )}
              </button>
            </div>

            {/* Right Report output */}
            <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
              <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
                <h3 className="text-xs font-bold text-violet-300 font-mono uppercase tracking-wider">Holistic Environmental Health Insight</h3>
                <p className="text-[9px] text-[var(--text-muted)] font-mono">CSI-Environmental Cross-Correlation • Transformer Fusion</p>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
                {fusionReport ? (
                  <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {fusionReport}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
                    <Network size={36} className="text-violet-500/40 animate-pulse" />
                    <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                      Click **Run Fusion** to correlate WiFi CSI spatial behavior with ambient environmental telemetry. The AI utilizes transformer models to fuse vital signs with temperature, humidity, and AQI data, providing deep, holistic insights into how the environment is impacting the occupant&apos;s health.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODE 17: Automated Care Plan Generation (SOLID Implementation) */}
        {activeMode === "care_plan" && (
          <AgentWorkspace 
            icon={ClipboardList}
            title="Care AI Generator"
            themeColor="orange"
            buttonText="Generate Plan"
            reportTitle="Personalized Longitudinal Care Plan"
            reportSubtitle="Exercise • Sleep • Nutrition • Medical Routing"
            emptyStateText="Click **Generate Plan** to let the AI analyze longitudinal vital sign trends and generate a highly personalized, structured care plan focusing on exercise, sleep hygiene, and medical follow-ups."
            stats={[
              { label: "Data Horizon", value: "7 Days" },
              { label: "Risk Factors", value: "Low / Normal", color: "text-gray-300" }
            ]}
            visualFlair={
              <div className="h-24 w-full bg-black/40 border border-orange-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="flex gap-2 w-full h-full items-center justify-center">
                  <div className="w-8 h-12 bg-orange-600/40 rounded flex flex-col p-1 justify-around shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                    <div className="w-full h-1 bg-orange-400 rounded-full animate-pulse"></div>
                    <div className="w-3/4 h-1 bg-orange-400/50 rounded-full"></div>
                    <div className="w-full h-1 bg-orange-400/50 rounded-full"></div>
                  </div>
                  <div className="w-8 h-12 bg-orange-500/50 rounded flex flex-col p-1 justify-around scale-110 shadow-[0_0_12px_rgba(249,115,22,0.4)] z-10 border border-orange-500/30">
                    <div className="w-full h-1 bg-orange-300 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                    <div className="w-full h-1 bg-orange-300 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]"></div>
                    <div className="w-1/2 h-1 bg-orange-300 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                  </div>
                  <div className="w-8 h-12 bg-orange-600/40 rounded flex flex-col p-1 justify-around shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                    <div className="w-3/4 h-1 bg-orange-400 rounded-full animate-pulse"></div>
                    <div className="w-full h-1 bg-orange-400/50 rounded-full"></div>
                    <div className="w-1/2 h-1 bg-orange-400/50 rounded-full"></div>
                  </div>
                </div>
                <span className="text-[8px] font-mono text-orange-400/80 uppercase absolute bottom-1 right-1 font-bold">Doc Gen</span>
              </div>
            }
            prompt={`
You are an Automated Care Plan Generation AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze 7-day longitudinal health data (WiFi CSI Biometrics) to generate personalized, clinical-grade care plans.

Current 7-Day Telemetry Profile:
- Heart Rate: Stable baseline 68 BPM, slight elevation during evening hours.
- Respiration: Normal resting, but frequent micro-wakefulness detected between 2 AM - 4 AM.
- Activity Level: Sedentary during day (WFH), moderate activity 6 PM - 7 PM.

TASK:
Generate a structured, personalized Care Plan including:
1. Exercise Recommendations (tailored to current sedentary behavior).
2. Sleep Hygiene Protocol (targeting the 2 AM micro-wakefulness).
3. Nutrition Guidance (general best practices for energy stability).
4. Medical Follow-Up (determine if recent telemetry warrants consulting a physician).
Make the tone empathetic, professional, and highly structured.
            `}
          />
        )}

        {/* MODE 18: Fall Risk Prediction with Pose Estimation */}
        {activeMode === "fall_risk_prediction" && (
          <AgentWorkspace 
            icon={Accessibility}
            title="Fall Risk AI"
            themeColor="teal"
            buttonText="Analyze Pose & Balance"
            reportTitle="Micro-Stumble & Posture Degradation Analysis"
            reportSubtitle="CSI Pose Estimation • Balance Kinematics"
            emptyStateText="Click **Analyze Pose & Balance** to execute a simulated AI pose-estimation routine. The system will analyze WiFi CSI multi-path scattering to detect micro-stumbles and balance degradation, calculating a proactive Fall Risk Probability."
            stats={[
              { label: "Detected Stumbles", value: "3", color: "text-yellow-400" },
              { label: "Gait Asymmetry", value: "+12%" },
              { label: "CSI Resolution", value: "High (Sub-cm)" }
            ]}
            visualFlair={
              <div className="h-24 w-full bg-black/40 border border-teal-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {/* Simulated stick-figure pose joints */}
                  <div className="absolute top-1 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_8px_teal]"></div>
                  <div className="absolute top-4 w-1 h-6 bg-teal-500/80 rounded-full"></div>
                  
                  {/* Left Arm */}
                  <div className="absolute top-4 left-3 w-4 h-1 bg-teal-500/60 rotate-45 transform origin-right animate-pulse"></div>
                  {/* Right Arm */}
                  <div className="absolute top-4 right-3 w-4 h-1 bg-teal-500/60 -rotate-45 transform origin-left"></div>
                  
                  {/* Left Leg */}
                  <div className="absolute top-10 left-4 w-1 h-5 bg-teal-500/80 rotate-12 transform origin-top animate-[ping_2s_infinite]"></div>
                  {/* Right Leg (Stumbling) */}
                  <div className="absolute top-10 right-4 w-1 h-5 bg-teal-400 rotate-[30deg] transform origin-top shadow-[0_0_10px_teal]"></div>

                  {/* Floor line */}
                  <div className="absolute bottom-0 w-20 h-px bg-teal-500/40"></div>
                  {/* Warning zone */}
                  <div className="absolute bottom-0 right-2 w-6 h-1 bg-yellow-500/60 rounded-full animate-pulse shadow-[0_0_5px_yellow]"></div>
                </div>
                <span className="text-[8px] font-mono text-teal-400/80 uppercase absolute bottom-1 left-1 font-bold">Kinematic Map</span>
              </div>
            }
            prompt={`
You are a Fall Risk AI powered by NVIDIA Nemotron-3 Super 120B.
You specialize in evaluating spatial WiFi CSI signals to perform sub-centimeter human pose estimation and balance kinematics analysis.

Current CSI Pose Data:
- Micro-Stumbles (Past 7 Days): 3 events detected (primarily evening).
- Gait Asymmetry: 12% drift favoring the right leg.
- Sway Velocity: Increased by 0.4 m/s during turning motions.
- Posture: Slight forward degradation during ambient walking.

TASK:
1. Emulate a kinematic assessment of the occupant&apos;s balance and fall risk.
2. Calculate a "Fall Risk Probability Score" (0-100%).
3. Detail the specific biomechanical anomalies identified (e.g., right-leg weakness, turning instability).
4. Provide immediate preventative recommendations to mitigate a catastrophic fall.
Output should be heavily structured, clinical, and emphasize proactive safety.
            `}
          />
        )}

        {/* MODE 19: Sleep Disorder Classification */}
        {activeMode === "sleep_disorder" && (
          <AgentWorkspace 
            icon={BrainCircuit}
            title="Sleep Diagnostics"
            themeColor="indigo"
            buttonText="Classify Apnea Events"
            reportTitle="Nocturnal Respiratory Pattern Analysis"
            reportSubtitle="Central vs. Obstructive Sleep Apnea Classification"
            emptyStateText="Click **Classify Apnea Events** to analyze high-resolution nocturnal CSI biometrics (Heart Rate Variability, Respiration Flow) to determine the probability of Central vs. Obstructive Sleep Apnea."
            stats={[
              { label: "Apnea-Hypopnea Index", value: "22 (Moderate)", color: "text-rose-400" },
              { label: "O2 Desat Correlation", value: "High (88%)" },
              { label: "HRV LF/HF Ratio", value: "Elevated" }
            ]}
            visualFlair={
              <div className="h-24 w-full bg-black/40 border border-indigo-500/30 rounded-lg overflow-hidden relative flex flex-col p-2">
                <div className="absolute inset-0 grid grid-cols-[repeat(10,1fr)] grid-rows-[repeat(4,1fr)] opacity-20 pointer-events-none">
                  {[...Array(40)].map((_, i) => (
                    <div key={i} className="border-r border-b border-indigo-500/30"></div>
                  ))}
                </div>
                
                <div className="flex-1 flex flex-col justify-center relative">
                  {/* Respiration wave (simulating cessation) */}
                  <div className="w-full flex items-center">
                    <div className="h-0.5 w-1/4 bg-indigo-400 rounded-full animate-[ping_2s_infinite] origin-left"></div>
                    <div className="h-0.5 w-1/2 bg-rose-500/80 rounded-full animate-pulse shadow-[0_0_8px_rose]"></div>
                    <div className="h-0.5 w-1/4 bg-indigo-400 rounded-full animate-[ping_2s_infinite] origin-right"></div>
                  </div>
                  {/* Small HRV spikes below */}
                  <div className="absolute bottom-2 flex gap-1 w-full justify-around items-end opacity-70">
                    {[3, 7, 2, 8, 4, 2, 9, 3, 5, 2, 8, 4].map((h, i) => (
                      <div key={i} className="w-1 bg-indigo-300 rounded-t-sm" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                  </div>
                </div>
                
                <span className="text-[8px] font-mono text-indigo-400/80 uppercase absolute bottom-1 left-1 font-bold">Respiration Cessation Detected</span>
              </div>
            }
            prompt={`
You are a Clinical Sleep Diagnostics AI powered by NVIDIA Nemotron-3 Super 120B.
You analyze sub-carrier WiFi CSI biometrics to classify sleep disorders, specifically differentiating between Obstructive Sleep Apnea (OSA) and Central Sleep Apnea (CSA).

Current Nocturnal CSI Telemetry:
- AHI (Apnea-Hypopnea Index): 22 events per hour (Moderate severity).
- Respiratory Effort during Cessation: High thoracic/abdominal motion detected via CSI (indicates airway obstruction rather than central neurological failure).
- Heart Rate Variability (HRV): Sympathetic nervous system overdrive (LF/HF ratio spike) immediately following cessation events.
- Body Position: 70% of events occur in the supine (back-sleeping) position.

TASK:
1. Analyze the correlation between respiratory cessation and thoracic effort to classify the primary type of apnea (OSA vs. CSA).
2. Explain the physiological mechanism behind the classification based on the CSI data.
3. Detail the cardiovascular risk associated with the observed HRV sympathetic overdrive.
4. Provide structured, actionable clinical recommendations (e.g., positional therapy, CPAP consultation).
            `}
          />
        )}

        {/* MODE 20: False-Positive Anomaly Reduction Filter */}
        {activeMode === "anomaly_filter" && (
          <AgentWorkspace 
            icon={Filter}
            title="Anomaly Filter AI"
            themeColor="fuchsia"
            buttonText="Scrub False Positives"
            reportTitle="Environmental Context & Noise Reduction"
            reportSubtitle="CSI Profile Verification • Alert Confidence Scoring"
            emptyStateText="Click **Scrub False Positives** to run a deep contextual scan over the recent anomaly alerts. The AI compares kinematic CSI signatures against known environmental interference patterns (pets, appliances) to filter out noise."
            stats={[
              { label: "Pending Alerts", value: "4 Detected", color: "text-rose-400" },
              { label: "Confidence Threshold", value: "95%" },
              { label: "Current Noise Floor", value: "Moderate (-82dBm)" }
            ]}
            visualFlair={
              <div className="h-24 w-full bg-black/40 border border-fuchsia-500/30 rounded-lg overflow-hidden relative flex flex-col p-2 items-center justify-center">
                
                {/* Simulated filtering funnel */}
                <div className="w-full max-w-[120px] h-16 flex flex-col items-center justify-between relative z-10">
                  <div className="w-full h-2 bg-fuchsia-500/40 rounded-full flex justify-around items-center px-1">
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-ping"></div>
                    <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                    <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  </div>
                  
                  {/* Funnel body */}
                  <div className="w-3/4 h-8 border-l-2 border-r-2 border-fuchsia-500/30 flex items-center justify-center">
                    <div className="w-full h-px bg-fuchsia-500/50 shadow-[0_0_8px_fuchsia] animate-[pulse_0.5s_infinite]"></div>
                  </div>

                  <div className="w-1/3 h-2 bg-fuchsia-500/80 rounded-full shadow-[0_0_10px_fuchsia] flex justify-around items-center">
                     <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]"></div>
                     <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]"></div>
                  </div>
                </div>

                <span className="text-[8px] font-mono text-fuchsia-400/80 uppercase absolute bottom-1 left-1 font-bold">Signal Scrubber</span>
              </div>
            }
            prompt={`
You are an Anomaly Reduction Filter AI powered by NVIDIA Nemotron-3 Super 120B.
Your task is to analyze 4 recent "Intrusion/Fall" alerts flagged by the base CSI heuristic engine and determine if they are genuine emergencies or false positives caused by environmental noise.

Recent Anomaly Signatures:
1. Alert 1 (14:02) - Low-to-ground high-speed movement (Speed: 0.8 m/s, Height: 0.2m).
2. Alert 2 (14:15) - Erratic, non-human periodic pacing pattern localized to the kitchen.
3. Alert 3 (18:40) - Sudden massive multipath variance matching a human-sized mass dropping in the living room.
4. Alert 4 (19:10) - Rhythmic mechanical vibration traversing the hallway.

TASK:
1. Evaluate the kinematic signatures (Height, Speed, Periodicity, Mass equivalent via attenuation) of each alert.
2. Cross-reference with common false positives (e.g., Roombas, Pets, Ceiling Fans).
3. Classify each alert as "CONFIRMED FALSE POSITIVE" or "HIGH CONFIDENCE THREAT".
4. Output a revised Security/Health Alert Log that drastically reduces the false-alarm fatigue for the end user.
            `}
          />
        )}

        {/* MODE 21: Voice Stress Analysis */}
        {activeMode === "voice_stress" && (
          <AgentWorkspace 
            icon={Mic}
            title="Voice Stress & Acoustic Profiler"
            themeColor="rose"
            buttonText="Analyze Vocal Telemetry"
            reportTitle="Acoustic Distress & Cardiac Stress Evaluation"
            reportSubtitle="Vocal Tremor Frequency (Hz) • Fundamental Frequency (F0) Tracking"
            emptyStateText="Click **Analyze Vocal Telemetry** to capture or simulate high-resolution vocal features. The AI evaluates pitch jitter, shimmer, and vocal tremors to index autonomic nervous system load and emotional or physical distress."
            stats={[
              { label: "Stress Index", value: "Elevated (7.2/10)", color: "text-rose-400" },
              { label: "Vocal Tremor Rate", value: "6.8 Hz (High)" },
              { label: "Pitch Jitter", value: "1.45% (Irregular)" }
            ]}
            visualFlair={
              <div className="h-24 w-full bg-black/40 border border-rose-500/30 rounded-lg overflow-hidden relative flex flex-col p-2">
                <div className="absolute inset-0 grid grid-cols-[repeat(15,1fr)] opacity-10 pointer-events-none">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className="border-r border-rose-500/30 h-full"></div>
                  ))}
                </div>
                
                <div className="flex-1 flex items-center justify-center gap-1">
                  {/* Glowing dynamic acoustic equalizer */}
                  {[4, 8, 3, 9, 6, 2, 7, 5, 8, 4, 9, 3, 6, 8, 2, 9, 5].map((h, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rose]"
                      style={{ 
                        height: `${h * 7}%`, 
                        animationDuration: `${0.4 + (i % 3) * 0.2}s`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    ></div>
                  ))}
                </div>
                
                <span className="text-[8px] font-mono text-rose-400/80 uppercase absolute bottom-1 left-1 font-bold">Autonomic Stress Spikes Detected</span>
              </div>
            }
            prompt={`
You are an Acoustic Distress & Voice Stress AI powered by NVIDIA Nemotron-3 Super 120B.
Your task is to analyze biometric vocal parameters captured during an occupant&apos;s verbal query and correlate them with WiFi CSI spatial heart/respiration metrics for a multi-modal assessment.

Acoustic Features:
- Fundamental Frequency (F0): 242 Hz (normal baseline: 180-210 Hz, indicating acute vocal cord tension).
- Jitter (pitch instability): 1.45% (Elevated autonomic activation).
- Shimmer (amplitude perturbation): 4.2% (Moderate vocal tremor).
- Respiration Pause Rate: Gasps every 4-5 words (correlates with WiFi phase respiration dips).
- Autonomic Index: Significant high-frequency tremor indicating sympathetic nervous system activation.

TASK:
1. Explain the physiological link between autonomous nervous system (ANS) stress and the vocal tension observed in the pitch instability.
2. Cross-reference acoustic tremors with respiratory gasp rates to identify signs of physical distress (such as dyspnea or cardiac hyper-activation).
3. Deliver a clinical-grade Multi-Modal Autonomic Distress Index Report.
4. Suggest direct wellness and safety interventions (e.g., box breathing coaching, hydration, or medical evaluation if secondary CSI vitals spike).
            `}
          />
        )}
          </div>
        </div>
      </div>
    </div>
  </>
);
}
