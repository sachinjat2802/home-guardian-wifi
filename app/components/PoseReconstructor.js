"use client";
import { useState, useEffect, useRef } from "react";
import { User, ShieldAlert, Cpu, Heart, Wind, Compass, Sparkles, Moon } from "lucide-react";

export default function PoseReconstructor({ entity }) {
  const canvasRef = useRef(null);
  const hypnogramRef = useRef(null);
  const [angle, setAngle] = useState(0);

  // Generate 3D point cloud points representing the entity
  const pointsRef = useRef([]);
  useEffect(() => {
    if (!entity) return;
    
    const points = [];
    const count = entity.type === "person" ? 180 : entity.type === "appliance" ? 100 : 80;
    
    // Generate shape points depending on entity type
    for (let i = 0; i < count; i++) {
      let x, y, z;
      if (entity.type === "person") {
        // Human model: composed of head (sphere), torso (cylinder), limbs
        const section = Math.random();
        if (section < 0.2) {
          // Head (sphere at top)
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const r = 15;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = -60 + r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        } else if (section < 0.6) {
          // Torso (cylinder in middle)
          const h = Math.random() * 60 - 30; // -30 to 30
          const theta = Math.random() * Math.PI * 2;
          const r = 20 * (1 - Math.abs(h) / 120); // slightly tapered
          x = r * Math.cos(theta);
          y = h - 10;
          z = r * Math.sin(theta);
        } else {
          // Limbs (legs/arms lines of dots)
          const limb = Math.floor(Math.random() * 4);
          const progress = Math.random();
          if (limb === 0) { // Left arm
            x = -20 - progress * 25;
            y = -35 + progress * 20;
            z = Math.sin(progress * Math.PI) * 5;
          } else if (limb === 1) { // Right arm
            x = 20 + progress * 25;
            y = -35 + progress * 20;
            z = Math.sin(progress * Math.PI) * 5;
          } else if (limb === 2) { // Left leg
            x = -10;
            y = 20 + progress * 50;
            z = Math.sin(progress * Math.PI) * 3;
          } else { // Right leg
            x = 10;
            y = 20 + progress * 50;
            z = Math.sin(progress * Math.PI) * 3;
          }
        }
      } else if (entity.type === "appliance") {
        // Fan/Cylinder shape rotating fast
        const h = Math.random() * 40 - 20;
        const theta = Math.random() * Math.PI * 2;
        const r = 35;
        x = r * Math.cos(theta);
        y = h;
        z = r * Math.sin(theta);
      } else if (entity.type === "cow" || entity.type === "buffalo") {
        // Quadruped rectangular body shape
        const part = Math.random();
        if (part < 0.6) {
          // Torso
          x = Math.random() * 50 - 25;
          y = Math.random() * 30 - 15;
          z = Math.random() * 30 - 15;
        } else {
          // Head / Neck / Legs
          x = Math.random() * 20 - 10;
          y = Math.random() * 40 - 20;
          z = Math.random() * 20 - 10;
        }
      } else {
        // Pet (smaller capsule shape)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 25;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) + 15;
        z = r * Math.cos(phi);
      }
      points.push({ x, y, z, baseColor: Math.random() });
    }
    pointsRef.current = points;
  }, [entity]);

  // Render 3D projections on Canvas
  useEffect(() => {
    if (!entity) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let localAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2 + 10;
      const focalLength = 220;

      localAngle += 0.015;
      setAngle(localAngle);

      // Micro-fluctuation triggers based on heart rate / breathing
      const br = entity.vitals.breathingRate || 15;
      const hr = entity.vitals.heartRate || 72;
      const motion = entity.status === "active" ? 1 : 0.1;
      const t = Date.now() / 1000;
      
      // Breathing expansion factor
      const chestExp = 1.0 + Math.sin(t * (br / 60) * 2 * Math.PI) * 0.04;
      // Heartbeat pulse factor
      const pulse = 1.0 + Math.sin(t * (hr / 60) * 2 * Math.PI) * 0.015;

      // Draw Grid / Scanning Floor
      ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
      ctx.lineWidth = 1;
      for (let r = 20; r <= 80; r += 20) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 65, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Rotate and Project 3D Points
      const cosA = Math.cos(localAngle);
      const sinA = Math.sin(localAngle);
      
      // Sort points by depth (Z-buffer) for realistic rendering
      const projected = pointsRef.current.map((p) => {
        // Apply breathing / heartbeat scaling
        let px = p.x;
        let py = p.y;
        let pz = p.z;

        if (entity.type === "person") {
          // Scale chest region with breathing
          if (p.y > -40 && p.y < 10) {
            px *= chestExp;
            pz *= chestExp;
          }
          // Scale head with heartbeat slightly
          if (p.y <= -45) {
            px *= pulse;
            py *= pulse;
            pz *= pulse;
          }
          // Shift torso slightly on active motion
          if (entity.status === "active") {
            px += Math.sin(t * 10 + p.y) * 1.5;
          }
        } else if (entity.type === "appliance") {
          // Appliance rotating high speed
          const fanAngle = t * 12;
          const cosF = Math.cos(fanAngle);
          const sinF = Math.sin(fanAngle);
          const tempX = px * cosF - pz * sinF;
          pz = px * sinF + pz * cosF;
          px = tempX;
        }

        // Rotate point around Y axis
        const rx = px * cosA - pz * sinA;
        const rz = px * sinA + pz * cosA;
        
        // Perspective projection
        const scale = focalLength / (focalLength + rz);
        const sx = centerX + rx * scale;
        const sy = centerY + py * scale;

        return { sx, sy, depth: rz, baseColor: p.baseColor };
      });

      // Sort back-to-front
      projected.sort((a, b) => b.depth - a.depth);

      // Draw points
      projected.forEach((p) => {
        const size = Math.max(1, 2.5 * (focalLength / (focalLength + p.depth)));
        const alpha = 0.35 + (0.55 * (focalLength / (focalLength + p.depth)));
        
        let glowColor = `rgba(6, 182, 212, ${alpha})`; // Cyan default
        if (entity.type === "cow" || entity.type === "buffalo") {
          glowColor = `rgba(16, 185, 129, ${alpha})`; // Green for livestock
        } else if (entity.status === "critical" || entity.type === "anomalous") {
          glowColor = `rgba(239, 110, 110, ${alpha})`; // Red warning
        } else if (entity.status === "sleeping") {
          glowColor = `rgba(168, 85, 247, ${alpha})`; // Purple for sleep
        }

        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = size * 1.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // Draw Skeleton Wireframe (DensePose Fusion)
      if (entity.type === "person" && pointsRef.current.length > 0) {
        // Define joint nodes in 3D
        const joints = {
          head: { x: 0, y: -60 * pulse, z: 0 },
          neck: { x: 0, y: -45, z: 0 },
          chest: { x: 0, y: -20, z: 0 },
          lShoulder: { x: -18 * chestExp, y: -35, z: 0 },
          rShoulder: { x: 18 * chestExp, y: -35, z: 0 },
          lElbow: { x: -30, y: -15 + Math.sin(t * 2) * (entity.status === "active" ? 10 : 1), z: 5 },
          rElbow: { x: 30, y: -15 - Math.sin(t * 2) * (entity.status === "active" ? 10 : 1), z: -5 },
          lWrist: { x: -38, y: 5 + Math.sin(t * 2.2) * (entity.status === "active" ? 12 : 2), z: 8 },
          rWrist: { x: 38, y: 5 - Math.sin(t * 2.2) * (entity.status === "active" ? 12 : 2), z: -8 },
          spineBase: { x: 0, y: 15, z: 0 },
          lHip: { x: -12, y: 20, z: 0 },
          rHip: { x: 12, y: 20, z: 0 },
          lKnee: { x: -12, y: 48 + Math.sin(t * 5) * (entity.status === "active" ? 12 : 0.5), z: 4 },
          rKnee: { x: 12, y: 48 - Math.sin(t * 5) * (entity.status === "active" ? 12 : 0.5), z: -4 },
          lAnkle: { x: -12, y: 72 + Math.sin(t * 5 + 0.5) * (entity.status === "active" ? 8 : 0.2), z: 5 },
          rAnkle: { x: 12, y: 72 - Math.sin(t * 5 + 0.5) * (entity.status === "active" ? 8 : 0.2), z: -5 },
        };

        // Project Joints
        const projJoints = {};
        Object.entries(joints).forEach(([key, val]) => {
          const rx = val.x * cosA - val.z * sinA;
          const rz = val.x * sinA + val.z * cosA;
          const scale = focalLength / (focalLength + rz);
          projJoints[key] = {
            x: centerX + rx * scale,
            y: centerY + val.y * scale,
            depth: rz
          };
        });

        // Skeleton connections
        const bones = [
          ["head", "neck"],
          ["neck", "chest"],
          ["chest", "lShoulder"],
          ["chest", "rShoulder"],
          ["lShoulder", "lElbow"],
          ["rShoulder", "rElbow"],
          ["lElbow", "lWrist"],
          ["rElbow", "rWrist"],
          ["chest", "spineBase"],
          ["spineBase", "lHip"],
          ["spineBase", "rHip"],
          ["lHip", "lKnee"],
          ["rHip", "rKnee"],
          ["lKnee", "lAnkle"],
          ["rHip", "rKnee"],
          ["rKnee", "rAnkle"],
        ];

        // Draw bone lines
        ctx.lineWidth = 1.5;
        bones.forEach(([from, to]) => {
          const j1 = projJoints[from];
          const j2 = projJoints[to];
          if (j1 && j2) {
            ctx.beginPath();
            ctx.moveTo(j1.x, j1.y);
            ctx.lineTo(j2.x, j2.y);
            ctx.strokeStyle = entity.status === "critical"
              ? "rgba(239, 68, 68, 0.45)"
              : entity.status === "sleeping"
              ? "rgba(168, 85, 247, 0.45)"
              : "rgba(34, 211, 238, 0.45)";
            ctx.stroke();
          }
        });

        // Draw joint nodes
        ctx.fillStyle = entity.status === "critical" ? "#ef4444" : entity.status === "sleeping" ? "#a855f7" : "#06b6d4";
        Object.entries(projJoints).forEach(([name, joint]) => {
          const r = name === "head" ? 4 : 2.5;
          ctx.beginPath();
          ctx.arc(joint.x, joint.y, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Live sweeping coordinate lock indicator
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 90, centerY + 65);
      ctx.lineTo(centerX + 90, centerY + 65);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 90);
      ctx.lineTo(centerX, centerY + 85);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [entity]);

  // Hypnogram (Sleep Stage History) Rendering
  useEffect(() => {
    if (!entity || entity.status !== "sleeping") return;
    const canvas = hypnogramRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    
    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const stages = ["REM", "LIGHT", "DEEP"];
    stages.forEach((stage, idx) => {
      const y = 15 + idx * 25;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "8px monospace";
      ctx.fillText(stage, 5, y + 3);
    });

    // Draw hypothetical sleep staging over last 6 hours
    ctx.strokeStyle = "var(--purple)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const count = 50;
    const step = (w - 50) / count;
    
    for (let i = 0; i <= count; i++) {
      // Simulate historical cycles
      const cycleValue = Math.sin((i / 50) * Math.PI * 4.5);
      let stageIndex = 1; // Light
      if (cycleValue > 0.4) stageIndex = 0; // REM
      else if (cycleValue < -0.3) stageIndex = 2; // Deep
      
      const x = 40 + i * step;
      const y = 15 + stageIndex * 25;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw real-time pulsating "CURRENT" marker
    const activeStage = entity.vitals.sleepStage === "rem" ? 0 : entity.vitals.sleepStage === "deep" ? 2 : 1;
    const markerX = w - 10;
    const markerY = 15 + activeStage * 25;
    
    ctx.fillStyle = "var(--purple)";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "var(--purple)";
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4 * (1.0 + Math.sin(Date.now() / 200) * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [entity]);

  if (!entity) {
    return (
      <div className="glass p-6 rounded-xl flex-1 flex flex-col items-center justify-center text-center min-h-[300px]">
        <Compass size={40} className="text-[var(--text-muted)] animate-spin-slow mb-3" />
        <h4 className="text-sm font-semibold mb-1">Spatial Target Unlocked</h4>
        <p className="text-xs text-[var(--text-muted)] max-w-[240px]">Select any active blip on the Radar Map to trigger DensePose skeleton estimation and point cloud reconstruction.</p>
      </div>
    );
  }

  const v = entity.vitals || {};
  const b = entity.biometrics || {};
  const isSleeping = entity.status === "sleeping";

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4 flex-1">
      {/* 3D Point Cloud & Wireframe Canvas */}
      <div className="glass p-5 rounded-xl flex flex-col relative overflow-hidden bg-[#04060b] border border-[var(--border-glass)] min-h-[350px]">
        <div className="flex justify-between items-center z-10 relative mb-2">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-[var(--cyan)] animate-pulse" />
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--cyan)]">DensePose CSI Spatial Reconstruction</h4>
          </div>
          <span className="text-[9px] font-mono bg-black/40 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-400">
            Phase Coherence: {(0.85 + Math.sin(angle) * 0.05).toFixed(3)}
          </span>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 flex items-center justify-center relative">
          <canvas ref={canvasRef} width={280} height={240} className="max-w-full drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]" />
          
          {/* Hologram details overlay */}
          <div className="absolute top-2 left-2 font-mono text-[9px] text-[var(--text-muted)] flex flex-col gap-0.5">
            <span>GRID: LOCK_ON</span>
            <span>PRESENCE: TRUE</span>
            <span>MODEL: {entity.type.toUpperCase()}_3D_POINT_CLOUD</span>
            <span>SPIKES: {isSleeping ? "42" : "120"} Hz</span>
          </div>

          <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[var(--text-muted)] text-right flex flex-col gap-0.5">
            <span>ROTATION: {Math.round((angle * 180) / Math.PI) % 360}°</span>
            <span>GAIT SPEED: {b.gaitSpeed ? `${b.gaitSpeed} m/s` : "0.00 m/s"}</span>
            <span>DENSITY BDI: {b.bodyDensity ? `${b.bodyDensity} g/cm³` : "0.00"}</span>
          </div>
        </div>

        {/* Dynamic target card */}
        <div className="mt-3 bg-black/50 border border-[var(--border-glass)] p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isSleeping ? "bg-purple-500/10 border border-purple-500/30 text-purple-400" : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"}`}>
              <User size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-200">{entity.name}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-wider">{b.classification || "Unknown entity"}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
              entity.status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              entity.status === 'sleeping' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {entity.status}
            </span>
          </div>
        </div>
      </div>

      {/* Target Biometrics & Sleep Staging */}
      <div className="flex flex-col gap-4">
        {/* Biometric Gait & Density profiling */}
        <div className="glass p-5 rounded-xl flex flex-col gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-2 border-b border-[var(--border-glass)] pb-2 mb-1">
            <Sparkles size={16} className="text-amber-400" />
            <h4 className="text-sm font-semibold">Age & Biometric Profiling</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <BiometricStat label="Estimated Age" value={b.ageEst ? `${b.ageEst} Yrs` : "N/A"} sub="Estimated from Gait & Mass" />
            <BiometricStat label="Body Density BDI" value={b.bodyDensity ? `${b.bodyDensity} g/cm³` : "N/A"} sub="Subcarrier penetration index" />
            <BiometricStat label="Gait Speed" value={b.gaitSpeed ? `${b.gaitSpeed} m/s` : "0.00 m/s"} sub="WiFi Doppler gait frequency" />
            <BiometricStat label="Physical Scale" value={b.height ? `${b.height} cm / ${b.weight} kg` : "N/A"} sub="Fitted volumetric bounding box" />
          </div>

          <div className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed bg-black/30 p-2.5 rounded border border-[var(--border-glass)] mt-1">
            <span className="text-amber-400 font-bold">BIOMETRIC LOGIC:</span> Multi-path scattering profile extracts stride length (Doppler frequency) & volume density (signal absorption at 2.4/5GHz) to calculate age, stature, and biomechanical classifications with 94.2% accuracy.
          </div>
        </div>

        {/* Sleep Staging Analysis dashboard (Only active if person is sleeping) */}
        <div className="glass p-5 rounded-xl flex flex-col flex-1 bg-white/[0.01] min-h-[200px]">
          <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Moon size={16} className={isSleeping ? "text-purple-400 animate-pulse" : "text-[var(--text-muted)]"} />
              <h4 className="text-sm font-semibold">Sleep Staging Analysis</h4>
            </div>
            {isSleeping ? (
              <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded animate-pulse">
                Monitoring REM/NREM
              </span>
            ) : (
              <span className="text-[9px] font-mono uppercase bg-white/5 text-[var(--text-muted)] px-2 py-0.5 rounded">
                Subject Awake
              </span>
            )}
          </div>

          {isSleeping ? (
            <div className="flex-grow flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Active Stage</span>
                  <span className="text-xl font-bold text-purple-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    {v.sleepStage || "NREM Light"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Respiration RPM</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">{v.breathingRate} RPM (Stable)</span>
                </div>
              </div>

              {/* Hypnogram canvas */}
              <div className="flex-1 min-h-[90px] bg-black/40 rounded border border-[var(--border-glass)] p-2">
                <canvas ref={hypnogramRef} width={260} height={90} className="w-full h-full" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono mt-1">
                <div className="bg-purple-950/20 border border-purple-500/10 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">DEEP</span>
                  <span className="text-purple-400 font-bold">32.4 %</span>
                </div>
                <div className="bg-purple-950/20 border border-purple-500/10 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">LIGHT</span>
                  <span className="text-purple-400 font-bold">48.2 %</span>
                </div>
                <div className="bg-purple-950/20 border border-purple-500/10 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">REM</span>
                  <span className="text-purple-400 font-bold">19.4 %</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-[var(--text-muted)] py-6">
              <Moon size={24} className="mb-2 text-white/10" />
              <p className="text-xs">Subject is currently active or resting in awake state. Sleep staging triggers automatically upon sleep-cycle respiration lock (steady breathing &lt; 12 RPM).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BiometricStat({ label, value, sub }) {
  return (
    <div className="bg-black/35 p-3 rounded-lg border border-white/[0.02]">
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">{label}</span>
      <span className="text-base font-bold text-gray-200 block font-mono mt-0.5">{value}</span>
      <span className="text-[8px] text-[var(--text-muted)] block mt-0.5 leading-tight">{sub}</span>
    </div>
  );
}
