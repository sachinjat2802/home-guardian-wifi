"use client";
import { useState, useEffect, useRef } from "react";
import { User, ShieldAlert, Cpu, Heart, Wind, Compass, Sparkles, Moon } from "lucide-react";

export default function PoseReconstructor({ entity, theme }) {
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

    // Helper to blend alpha safely with active CSS variables
    const parseAlpha = (colorStr, alphaVal) => {
      if (colorStr.startsWith("#")) {
        const hex = colorStr.replace("#", "");
        let r, g, b;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alphaVal})`;
      }
      return colorStr;
    };

    const bodyStyle = getComputedStyle(document.body);
    const accentColor = bodyStyle.getPropertyValue("--accent").trim() || "#06b6d4";
    const dangerColor = bodyStyle.getPropertyValue("--danger").trim() || "#ef4444";
    const purpleColor = bodyStyle.getPropertyValue("--purple").trim() || "#a855f7";

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

      // Oscillating Holographic Sweep Plane (sweeps head-to-toe in 3D space)
      const sweepPeriod = 4.0; // Seconds per sweep cycle
      const sweepY = Math.sin(t * (2 * Math.PI / sweepPeriod)) * 80;

      // Rotate and Project 3D Points
      const cosA = Math.cos(localAngle);
      const sinA = Math.sin(localAngle);

      // ─── 3D Perspective Floor Grid ─────────────────────────────
      ctx.strokeStyle = parseAlpha(accentColor, 0.07);
      ctx.lineWidth = 0.5;
      
      // Rotating Concentric Rings
      for (let r = 25; r <= 100; r += 25) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 70, r, r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spoke Radials slowly spinning
      const spokes = 8;
      for (let i = 0; i < spokes; i++) {
        const rad = (i * Math.PI) / (spokes / 2) + localAngle * 0.15;
        const gridX = Math.cos(rad) * 95;
        const gridZ = Math.sin(rad) * 95;
        
        const rx = gridX * cosA - gridZ * sinA;
        const rz = gridX * sinA + gridZ * cosA;
        const scale = focalLength / (focalLength + rz);
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 70);
        ctx.lineTo(centerX + rx * scale, centerY + 70 + (28 * scale));
        ctx.stroke();
      }
      
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

        // Check if slice plane is intersecting this point's vertical coordinate
        const isSwept = entity.type === "person" && Math.abs(py - sweepY) < 5;

        return { sx, sy, depth: rz, baseColor: p.baseColor, isSwept };
      });

      // Sort back-to-front
      projected.sort((a, b) => b.depth - a.depth);

      // Draw points
      projected.forEach((p) => {
        let size = Math.max(1, 2.5 * (focalLength / (focalLength + p.depth)));
        let alpha = 0.35 + (0.55 * (focalLength / (focalLength + p.depth)));
        
        if (p.isSwept) {
          size *= 2.2;
          alpha = 1.0;
        }

        let glowColor = parseAlpha(accentColor, alpha);
        if (p.isSwept) {
          glowColor = `rgba(34, 211, 238, ${alpha})`; // Glowing cyan laser sweep slice
        } else if (entity.type === "cow" || entity.type === "buffalo") {
          glowColor = `rgba(16, 185, 129, ${alpha})`;
        } else if (entity.status === "critical" || entity.type === "anomalous") {
          glowColor = parseAlpha(dangerColor, alpha);
        } else if (entity.status === "sleeping") {
          glowColor = parseAlpha(purpleColor, alpha);
        }

        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = p.isSwept ? size * 4 : size * 1.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // ─── Draw the Horizontal Sweep Plane Disk ──────────────────────
      if (entity.type === "person") {
        const sweepScale = focalLength / (focalLength);
        const sweepCenterY = centerY + sweepY * sweepScale;
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.12 + Math.abs(Math.sin(t * 2.5)) * 0.08})`;
        ctx.lineWidth = 0.75;
        ctx.fillStyle = `rgba(34, 211, 238, 0.02)`;
        ctx.beginPath();
        ctx.ellipse(centerX, sweepCenterY, 35 * sweepScale, 10 * sweepScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "6px monospace";
        ctx.fillStyle = "rgba(34, 211, 238, 0.55)";
        ctx.fillText(`SCAN_PLANE: ${Math.round(sweepY + 80)}`, centerX + 40 * sweepScale, sweepCenterY + 2);
      }

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
              ? parseAlpha(dangerColor, 0.45)
              : entity.status === "sleeping"
              ? parseAlpha(purpleColor, 0.45)
              : parseAlpha(accentColor, 0.45);
            ctx.stroke();
          }
        });

        // Draw Heart Rate Vitals Concentric Pulse Rings from chest node
        const chestNode = projJoints["chest"];
        if (chestNode && entity.vitals.heartRate > 0) {
          const beatDuration = 60 / entity.vitals.heartRate;
          const maxRadius = 32;
          
          // Ring 1
          const cycleProgress = (t % beatDuration) / beatDuration;
          const currentRadius = cycleProgress * maxRadius;
          const ringAlpha = (1.0 - cycleProgress) * 0.45;
          ctx.strokeStyle = entity.status === "critical"
            ? `rgba(239, 68, 68, ${ringAlpha})`
            : entity.status === "sleeping"
            ? `rgba(168, 85, 247, ${ringAlpha})`
            : `rgba(6, 182, 212, ${ringAlpha})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.ellipse(chestNode.x, chestNode.y, currentRadius, currentRadius * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Ring 2 (offset)
          const cycleProgress2 = ((t + beatDuration / 2) % beatDuration) / beatDuration;
          const currentRadius2 = cycleProgress2 * maxRadius;
          const ringAlpha2 = (1.0 - cycleProgress2) * 0.45;
          ctx.strokeStyle = entity.status === "critical"
            ? `rgba(239, 68, 68, ${ringAlpha2})`
            : entity.status === "sleeping"
            ? `rgba(168, 85, 247, ${ringAlpha2})`
            : `rgba(6, 182, 212, ${ringAlpha2})`;
          ctx.beginPath();
          ctx.ellipse(chestNode.x, chestNode.y, currentRadius2, currentRadius2 * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw joint nodes
        ctx.fillStyle = entity.status === "critical" ? dangerColor : entity.status === "sleeping" ? purpleColor : accentColor;
        Object.entries(projJoints).forEach(([name, joint]) => {
          const r = name === "head" ? 4 : 2.5;
          ctx.beginPath();
          ctx.arc(joint.x, joint.y, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // ─── 3D Fitted Bounding Box ────────────────────────────────────
        const bW = 28 * chestExp; 
        const bH = 80;          
        const bD = 18 * chestExp; 

        const corners = [
          { x: -bW, y: -bH, z: -bD },
          { x: bW, y: -bH, z: -bD },
          { x: bW, y: -bH, z: bD },
          { x: -bW, y: -bH, z: bD },
          { x: -bW, y: bH, z: -bD },
          { x: bW, y: bH, z: -bD },
          { x: bW, y: bH, z: bD },
          { x: -bW, y: bH, z: bD },
        ];

        const projCorners = corners.map(c => {
          const rx = c.x * cosA - c.z * sinA;
          const rz = c.x * sinA + c.z * cosA;
          const scale = focalLength / (focalLength + rz);
          return {
            x: centerX + rx * scale,
            y: centerY + c.y * scale,
          };
        });

        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0], // Top ring
          [4, 5], [5, 6], [6, 7], [7, 4], // Bottom ring
          [0, 4], [1, 5], [2, 6], [3, 7], // Verticals
        ];

        ctx.strokeStyle = parseAlpha(accentColor, 0.08);
        ctx.lineWidth = 0.5;
        edges.forEach(([from, to]) => {
          ctx.beginPath();
          ctx.moveTo(projCorners[from].x, projCorners[from].y);
          ctx.lineTo(projCorners[to].x, projCorners[to].y);
          ctx.stroke();
        });

        // Draw corner brackets
        ctx.strokeStyle = entity.status === "critical"
          ? parseAlpha(dangerColor, 0.45)
          : entity.status === "sleeping"
          ? parseAlpha(purpleColor, 0.45)
          : parseAlpha(accentColor, 0.45);
        ctx.lineWidth = 1;
        projCorners.forEach((c) => {
          const len = 5;
          ctx.beginPath();
          ctx.moveTo(c.x - len, c.y); ctx.lineTo(c.x + len, c.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(c.x, c.y - len); ctx.lineTo(c.x, c.y + len);
          ctx.stroke();
        });

        const tagCorner = projCorners[0];
        if (tagCorner) {
          ctx.font = "6px monospace";
          ctx.fillStyle = parseAlpha(accentColor, 0.6);
          ctx.fillText(`VOLUME: ${(0.32 + Math.sin(t) * 0.005).toFixed(3)} m³`, tagCorner.x + 8, tagCorner.y - 12);
          ctx.fillText(`FITTED_BOUNDS_LOCK`, tagCorner.x + 8, tagCorner.y - 4);
        }
      }

      // Live sweeping coordinate lock indicator (faded out to make room for floor grids)
      ctx.strokeStyle = parseAlpha(accentColor, 0.15);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 95, centerY + 70);
      ctx.lineTo(centerX + 95, centerY + 70);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 95);
      ctx.lineTo(centerX, centerY + 90);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [entity, theme]);

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
          <span className="text-[9px] font-mono bg-black/40 border border-[var(--border-glass)] px-2 py-0.5 rounded text-[var(--accent)]">
            Phase Coherence: {(0.85 + Math.sin(angle) * 0.05).toFixed(3)}
          </span>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 flex items-center justify-center relative">
          <canvas ref={canvasRef} width={280} height={240} className="max-w-full drop-shadow-[0_0_15px_var(--accent-glow)]" />
          
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
            <div className={`p-1.5 rounded-lg ${isSleeping ? "bg-purple-500/10 border border-purple-500/30 text-purple-400" : "bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]"}`}>
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
                  <span className="text-base font-bold text-[var(--cyan)] font-mono">{v.breathingRate} RPM (Stable)</span>
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
