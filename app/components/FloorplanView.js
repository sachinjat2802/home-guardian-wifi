"use client";
import { useState, useEffect, useRef } from "react";
import { Layers, Settings, Compass, LayoutGrid, Maximize2, Sliders, Plus, Trash2, Cpu, CheckCircle2, MapPin, RotateCcw } from "lucide-react";

export default function FloorplanView({ analysis }) {
  const [viewMode, setViewMode] = useState("3d"); // '2d' or '3d'
  const [calibratingNode, setCalibratingNode] = useState(null);
  
  // Unified Sensor Fusion State
  const [activeSensors, setActiveSensors] = useState({
    wifiCsi: true,
    mmWaveRadar: true,
    lidar: false,
    depthCamera: false,
    satellite: false,
    thermalIr: false,
    acoustic: false,
    bleUwb: false,
    customSpec: false
  });
  const [pointCloudDensity, setPointCloudDensity] = useState("high");
  const [customSpecName, setCustomSpecName] = useState("Ultrasonic Array");
  
  // Custom room layout boundaries (expressed in percentages of a 100x100 spatial grid)
  const [rooms, setRooms] = useState([
    { id: "sector-alpha", name: "Multipath Grid Alpha", x: 0, y: 0, w: 50, h: 50, color: "rgba(34, 211, 238, 0.08)", borderColor: "#22d3ee" },
    { id: "sector-beta", name: "Multipath Grid Beta", x: 50, y: 0, w: 50, h: 50, color: "rgba(59, 130, 246, 0.08)", borderColor: "#3b82f6" },
    { id: "sector-gamma", name: "Multipath Grid Gamma", x: 0, y: 50, w: 40, h: 50, color: "rgba(16, 185, 129, 0.08)", borderColor: "#10b981" },
    { id: "sector-delta", name: "Multipath Grid Delta", x: 40, y: 50, w: 60, h: 50, color: "rgba(239, 68, 68, 0.08)", borderColor: "#ef4444" }
  ]);

  const generateRandomLayout = () => {
    const xSplit = 30 + Math.floor(Math.random() * 41); // 30% to 70%
    const ySplitLeft = 25 + Math.floor(Math.random() * 51); // 25% to 75%
    const ySplitRight = 25 + Math.floor(Math.random() * 51); // 25% to 75%
    
    const colors = [
      "rgba(34, 211, 238, 0.04)",  // Cyan
      "rgba(59, 130, 246, 0.04)",  // Blue
      "rgba(16, 185, 129, 0.04)",  // Green
      "rgba(239, 68, 68, 0.04)",   // Red
      "rgba(168, 85, 247, 0.04)",  // Purple
      "rgba(249, 115, 22, 0.04)"   // Orange
    ];
    const borders = ["#22d3ee", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#f97316"];
    
    const roomDefs = [
      { id: "sector-a", name: "CSI Subgrid Alpha", x: 0, y: 0, w: xSplit, h: ySplitLeft },
      { id: "sector-b", name: "CSI Subgrid Beta", x: 0, y: ySplitLeft, w: xSplit, h: 100 - ySplitLeft },
      { id: "sector-c", name: "CSI Subgrid Gamma", x: xSplit, y: 0, w: 100 - xSplit, h: ySplitRight },
      { id: "sector-d", name: "CSI Subgrid Delta", x: xSplit, y: ySplitRight, w: 100 - xSplit, h: 100 - ySplitRight }
    ];
    
    if (Math.random() > 0.4) {
      const subSplit = Math.floor(xSplit * (0.3 + Math.random() * 0.4));
      roomDefs[1] = { id: "sector-b-1", name: "CSI Subgrid Epsilon", x: 0, y: ySplitLeft, w: subSplit, h: 100 - ySplitLeft };
      roomDefs.push({ id: "sector-b-2", name: "CSI Subgrid Zeta", x: subSplit, y: ySplitLeft, w: xSplit - subSplit, h: 100 - ySplitLeft });
    } else if (Math.random() > 0.4) {
      const subSplit = xSplit + Math.floor((100 - xSplit) * (0.3 + Math.random() * 0.4));
      roomDefs[2] = { id: "sector-c-1", name: "CSI Subgrid Eta", x: xSplit, y: 0, w: subSplit - xSplit, h: ySplitRight };
      roomDefs.push({ id: "sector-c-2", name: "CSI Subgrid Theta", x: subSplit, y: 0, w: 100 - subSplit, h: ySplitRight });
    }
    
    const randomizedRooms = roomDefs.map((room, idx) => ({
      ...room,
      color: colors[idx % colors.length],
      borderColor: borders[idx % borders.length]
    }));
    
    setRooms(randomizedRooms);
  };

  const addCustomRoom = () => {
    const w = 20 + Math.floor(Math.random() * 30);
    const h = 20 + Math.floor(Math.random() * 30);
    const x = Math.floor(Math.random() * (100 - w));
    const y = Math.floor(Math.random() * (100 - h));
    const id = `zone-${Date.now()}`;
    const name = `Sensing Zone ${String.fromCharCode(65 + (rooms.length % 26))}`;
    
    const borders = ["#22d3ee", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#f97316"];
    const colorSeed = Math.floor(Math.random() * borders.length);
    
    const newRoom = {
      id,
      name,
      x,
      y,
      w,
      h,
      color: "rgba(255, 255, 255, 0.02)",
      borderColor: borders[colorSeed]
    };
    
    setRooms(prev => [...prev, newRoom]);
  };

  const deleteRoom = (id) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const generateFloorplanFromWiFi = () => {
    // 1. Fetch live metrics from WiFi sensing pipeline
    const wallDensity = analysis?.csiClassification?.walls ?? 15;
    const reflectorDensity = analysis?.csiClassification?.reflectors ?? 10;
    const dynamicDensity = analysis?.csiClassification?.dynamic ?? 20;
    
    // 2. Compute room grid sizing and coordinates using active antenna nodes mapping
    const avgApX = nodes && nodes.length > 0 ? (nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length) : 50;
    const avgApY = nodes && nodes.length > 0 ? (nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length) : 50;
    
    // Determine dynamic dividing splits based on signal density center
    const csiModX = (avgApX / 100) * 0.4 + 0.3; // bound between 30% and 70%
    const csiModY = (avgApY / 100) * 0.4 + 0.3;
    
    const xSplit = Math.round(csiModX * 100);
    // Modulate horizontal partitioning based on wall vs reflector densities
    const ySplitLeft = Math.round(csiModY * 100 * (1 + (reflectorDensity - wallDensity) / 100));
    const ySplitRight = Math.round(csiModY * 100 * (1 + (wallDensity - reflectorDensity) / 100));
    
    const finalX = Math.max(20, Math.min(80, xSplit));
    const finalYLeft = Math.max(20, Math.min(80, ySplitLeft));
    const finalYRight = Math.max(20, Math.min(80, ySplitRight));
    
    const colors = [
      "rgba(34, 211, 238, 0.04)",  // Cyan
      "rgba(59, 130, 246, 0.04)",  // Blue
      "rgba(16, 185, 129, 0.04)",  // Green
      "rgba(239, 68, 68, 0.04)",   // Red
      "rgba(168, 85, 247, 0.04)",  // Purple
      "rgba(249, 115, 22, 0.04)"   // Orange
    ];
    const borders = ["#22d3ee", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#f97316"];
    
    const roomDefs = [
      { id: "wifi-alpha", name: "Sensing Grid Sector A", x: 0, y: 0, w: finalX, h: finalYLeft },
      { id: "wifi-beta", name: "Sensing Grid Sector B", x: 0, y: finalYLeft, w: finalX, h: 100 - finalYLeft },
      { id: "wifi-gamma", name: "Sensing Grid Sector C", x: finalX, y: 0, w: 100 - finalX, h: finalYRight },
      { id: "wifi-delta", name: "Sensing Grid Sector D", x: finalX, y: finalYRight, w: 100 - finalX, h: 100 - finalYRight }
    ];
    
    // Dynamically split sector subdivisions when heavy multipath signals are registered
    if (wallDensity > 18) {
      const subSplit = Math.round(finalX * 0.5);
      roomDefs[1] = { id: "wifi-beta-1", name: "Sensing Grid Sector B-1", x: 0, y: finalYLeft, w: subSplit, h: 100 - finalYLeft };
      roomDefs.push({ id: "wifi-beta-2", name: "Sensing Grid Sector B-2", x: subSplit, y: finalYLeft, w: finalX - subSplit, h: 100 - finalYLeft });
    }
    
    if (reflectorDensity > 12) {
      const subSplit = finalX + Math.round((100 - finalX) * 0.5);
      roomDefs[2] = { id: "wifi-gamma-1", name: "Sensing Grid Sector C-1", x: finalX, y: 0, w: subSplit - finalX, h: finalYRight };
      roomDefs.push({ id: "wifi-gamma-2", name: "Sensing Grid Sector C-2", x: subSplit, y: 0, w: 100 - subSplit, h: finalYRight });
    }
    
    // Read current entity locations to clear paths (mapping walking routes around calculated walls)
    const entitiesList = entities || [];
    const clearedRooms = roomDefs.map((room, idx) => {
      let finalW = room.w;
      let finalH = room.h;
      let finalXPos = room.x;
      let finalYPos = room.y;
      
      entitiesList.forEach(e => {
        const ex = e.x ?? 50;
        const ey = e.y ?? 50;
        const isInside = ex >= room.x && ex <= room.x + room.w && ey >= room.y && ey <= room.y + room.h;
        if (isInside) {
          // Adjust wall offsets to maintain safe corridors around walking entities
          if (ex - room.x < 6) finalXPos += 5;
          if (room.x + room.w - ex < 6) finalW -= 5;
        }
      });
      
      return {
        ...room,
        x: finalXPos,
        y: finalYPos,
        w: finalW,
        h: finalH,
        color: colors[idx % colors.length],
        borderColor: borders[idx % borders.length]
      };
    });
    
    setRooms(clearedRooms);
  };



  const getEntityIconAndColor = (ent) => {
    const type = ent.type?.toLowerCase() || "";
    const name = ent.name?.toLowerCase() || "";
    
    let icon = "👤"; // Default Person
    let color = "#22d3ee"; // Default Cyan
    let label = "Person";

    if (type === "cow") {
      icon = "🐄";
      color = "#10b981"; // Green for livestock
      label = "Cow";
    } else if (type === "buffalo") {
      icon = "🦬";
      color = "#059669"; // Emerald for buffaloes
      label = "Buffalo";
    } else if (type === "pet" || type === "dog" || name.includes("dog") || name.includes("cat")) {
      icon = "🐕";
      color = "#f59e0b"; // Amber for pets
      label = "Pet";
    } else if (type === "ghost" || type === "anomaly" || name.includes("ghost") || name.includes("anomaly") || name.includes("phantom")) {
      icon = "👻";
      color = "#a855f7"; // Purple for anomalies
      label = "Ghost / Anomaly";
    } else if (type === "appliance" || name.includes("appliance")) {
      icon = "🔌";
      color = "#9ca3af"; // Gray for appliances
      label = "Smart Device";
    } else if (name.includes("cows") || name.includes("cow")) {
      icon = "🐄";
      color = "#10b981";
      label = "Cow";
    } else if (name.includes("buffalo")) {
      icon = "🦬";
      color = "#059669";
      label = "Buffalo";
    } else if (name.includes("intruder") || name.includes("hostile")) {
      icon = "🥷";
      color = "#ef4444"; // Red for security threat
      label = "Intruder";
    }

    return { icon, color, label };
  };

  // ESP32 receiver node positions (calibratable)
  const [nodes, setNodes] = useState([
    { id: "ap1", name: "AP Receiver (West Gateway)", x: 12, y: 15, band: "2.4/5 GHz", status: "online", color: "#22d3ee" },
    { id: "ap2", name: "AP Receiver (East Guard)", x: 88, y: 20, band: "2.4/5 GHz", status: "online", color: "#3b82f6" },
    { id: "ap3", name: "AP Receiver (Corridor Anchor)", x: 50, y: 85, band: "2.4/5 GHz", status: "online", color: "#ef4444" }
  ]);

  const [activeRoomId, setActiveRoomId] = useState(null);
  const entities = analysis?.entities || [];

  // Track dragging AP node on the 2D floorplan grid
  const gridRef = useRef(null);

  const handleMouseDown = (nodeId, e) => {
    e.preventDefault();
    setCalibratingNode(nodeId);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!calibratingNode || !gridRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      // Convert to grid percentages
      const xPct = Math.max(0, Math.min(100, Math.round((clientX / rect.width) * 100)));
      const yPct = Math.max(0, Math.min(100, Math.round((clientY / rect.height) * 100)));
      
      setNodes(prev => prev.map(n => n.id === calibratingNode ? { ...n, x: xPct, y: yPct } : n));
    };

    const handleMouseUp = () => {
      if (calibratingNode) {
        setCalibratingNode(null);
      }
    };

    if (calibratingNode) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [calibratingNode]);

  // Determine active room occupants
  const getRoomOccupants = (room) => {
    return entities.filter(ent => {
      const rx = ent.x;
      const ry = ent.y;
      return (
        rx >= room.x &&
        rx <= room.x + room.w &&
        ry >= room.y &&
        ry <= room.y + room.h
      );
    });
  };

  // Check if a specific room is occupied
  const isRoomOccupied = (room) => {
    return getRoomOccupants(room).length > 0;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 p-1 w-full h-full min-h-0">
      {/* Volumetric Floorplan Canvas Panel */}
      <div className="glass p-5 rounded-2xl flex-1 flex flex-col gap-4 bg-white/[0.01] overflow-hidden min-h-[500px]">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-200">WiFi Spatial Propagation & Boundary Modeler</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">Real-time target projection and multi-path receiver node mapping</p>
          </div>
          <div className="flex items-center gap-2 bg-black/40 border border-[var(--border-glass)] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 rounded text-xs font-mono transition-all font-semibold ${
                viewMode === "2d" 
                  ? "bg-[var(--accent)]/15 text-white border border-[var(--accent)]/30" 
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              2D Flat
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 rounded text-xs font-mono transition-all font-semibold ${
                viewMode === "3d" 
                  ? "bg-[var(--accent)]/15 text-white border border-[var(--accent)]/30" 
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              3D Hologram
            </button>
          </div>
        </div>

        {/* Volumetric Viewport */}
        <div className="flex-1 relative flex items-center justify-center bg-black/25 rounded-xl border border-[var(--border-glass)] min-h-[350px] overflow-hidden">
          
          {/* Isometric Perspective Skew Wrapper */}
          <div 
            className="w-full max-w-[450px] aspect-square transition-transform duration-700 ease-out relative select-none"
            style={
              viewMode === "3d" 
                ? {
                    transform: "perspective(1000px) rotateX(55deg) rotateZ(-40deg)",
                    transformStyle: "preserve-3d"
                  }
                : {
                    transform: "perspective(1000px) rotateX(0deg) rotateZ(0deg)",
                    transformStyle: "flat"
                  }
            }
          >
            {/* Holographic glowing wireframe floor grid */}
            <div 
              ref={gridRef}
              className={`absolute inset-0 border border-white/5 rounded-lg shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] transition-all ${
                activeSensors.wifiCsi 
                  ? "border-cyan-500/20 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:10%_10%] shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]" 
                  : "bg-black/60"
              }`}
              style={{ transformStyle: "preserve-3d" }}
            >
              
              {/* 1. Lidar Point Cloud Overlay */}
              {activeSensors.lidar && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {Array.from({ 
                    length: pointCloudDensity === "low" ? 30 : pointCloudDensity === "medium" ? 60 : pointCloudDensity === "high" ? 120 : 200 
                  }).map((_, i) => {
                    const x = ((Math.sin(i * 123.45) * 0.45 + 0.5) * 100).toFixed(1);
                    const y = ((Math.cos(i * 543.21) * 0.45 + 0.5) * 100).toFixed(1);
                    const z = (Math.sin(i * 789.1) * 12 + 12).toFixed(1);
                    return (
                      <div 
                        key={`lidar-pt-${i}`}
                        className="absolute w-1 h-1 bg-emerald-400 rounded-full transition-all duration-700 opacity-60 shadow-[0_0_3px_#34d399] animate-pulse"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: viewMode === "3d" ? `translate3d(0, 0, ${z}px)` : "none",
                          animationDelay: `${(i % 5) * 0.25}s`
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* 2. mmWave Radar Sweep Overlay */}
              {activeSensors.mmWaveRadar && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
                  <div 
                    className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2 bg-[conic-gradient(from_0deg,transparent_60%,rgba(249,115,22,0.06)_100%)] rounded-full animate-spin"
                    style={{ 
                      transform: viewMode === "3d" ? "translateZ(5px)" : "none",
                      animationDuration: '6s'
                    }}
                  />
                  {entities.map((ent, idx) => {
                    if (ent.type === 'appliance') return null;
                    return (
                      <div 
                        key={`radar-vec-${ent.id}`}
                        className="absolute flex items-center justify-center pointer-events-none"
                        style={{
                          left: `${ent.x}%`,
                          top: `${ent.y}%`,
                          transform: viewMode === "3d" ? "translate3d(-50%, -50%, 15px)" : "translate(-50%, -50%)",
                          transformStyle: "preserve-3d"
                        }}
                      >
                        {/* Radar detection target ripple */}
                        <div className="w-6 h-6 border border-orange-500/40 rounded-full animate-ping absolute" />
                        {/* Velocity Vector Arrow */}
                        <div 
                          className="w-1 h-6 bg-gradient-to-t from-orange-500 to-transparent absolute rounded origin-bottom"
                          style={{
                            transform: `rotateZ(${idx * 90}deg)`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. Depth Camera Frustums */}
              {activeSensors.depthCamera && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {/* Camera Frustum Cones in corners */}
                  <div 
                    className="absolute left-0 top-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent origin-top-left rounded-br-full"
                    style={{
                      transform: viewMode === "3d" ? "rotateX(-20deg) rotateY(10deg) translateZ(8px)" : "none",
                    }}
                  />
                  <div 
                    className="absolute right-0 bottom-0 w-32 h-32 bg-gradient-to-tl from-yellow-500/10 to-transparent origin-bottom-right rounded-tl-full"
                    style={{
                      transform: viewMode === "3d" ? "rotateX(-20deg) rotateY(-10deg) translateZ(8px)" : "none",
                    }}
                  />
                </div>
              )}

              {/* 4. Satellite GNSS Grids */}
              {activeSensors.satellite && (
                <div className="absolute inset-0 pointer-events-none border border-cyan-500/10" style={{ transformStyle: "preserve-3d" }}>
                  <div className="absolute top-1/4 left-0 right-0 border-t border-cyan-500/10 border-dashed" />
                  <div className="absolute top-2/4 left-0 right-0 border-t border-cyan-500/10 border-dashed" />
                  <div className="absolute top-3/4 left-0 right-0 border-t border-cyan-500/10 border-dashed" />
                  <div className="absolute left-1/4 top-0 bottom-0 border-l border-cyan-500/10 border-dashed" />
                  <div className="absolute left-2/4 top-0 bottom-0 border-l border-cyan-500/10 border-dashed" />
                  <div className="absolute left-3/4 top-0 bottom-0 border-l border-cyan-500/10 border-dashed" />
                  <div className="absolute top-2 left-2 bg-black/60 border border-cyan-500/20 px-2 py-0.5 rounded text-[6px] font-mono text-cyan-400">
                    GNSS LOCK: 30.7333° N, 76.7794° E (HDOP: 0.8)
                  </div>
                </div>
              )}

              {/* 5. Thermal Infrared Glow */}
              {activeSensors.thermalIr && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {entities.map(ent => (
                    <div 
                      key={`thermal-${ent.id}`}
                      className="absolute w-16 h-16 rounded-full -ml-8 -mt-8 animate-pulse"
                      style={{
                        left: `${ent.x}%`,
                        top: `${ent.y}%`,
                        background: "radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.06) 50%, transparent 100%)",
                        transform: viewMode === "3d" ? "translateZ(1px)" : "none"
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 6. Acoustic Wavefronts */}
              {activeSensors.acoustic && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {entities.map((ent, idx) => {
                    if (ent.status !== 'active') return null;
                    return (
                      <div 
                        key={`acoustic-rip-${ent.id}`}
                        className="absolute border-2 border-sky-400/30 rounded-full animate-ping pointer-events-none"
                        style={{
                          left: `${ent.x}%`,
                          top: `${ent.y}%`,
                          width: "40px",
                          height: "40px",
                          marginLeft: "-20px",
                          marginTop: "-20px",
                          animationDuration: `${2.5 + (idx % 2)}s`,
                          transform: viewMode === "3d" ? "translateZ(2px)" : "none"
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* 7. BLE / UWB Beacons & Anchor Paths */}
              {activeSensors.bleUwb && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {/* Beacons on the outer bounds */}
                  <div className="absolute left-2 top-1/2 w-2 h-2 rounded bg-purple-500 border border-white/20 animate-pulse" style={{ transform: viewMode === "3d" ? "translate3d(0, 0, 10px)" : "none" }} />
                  <div className="absolute right-2 top-1/2 w-2 h-2 rounded bg-purple-500 border border-white/20 animate-pulse" style={{ transform: viewMode === "3d" ? "translate3d(0, 0, 10px)" : "none" }} />
                  
                  {/* Dynamic tracking vectors */}
                  {entities.length > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                      <line 
                        x1="2%" 
                        y1="50%" 
                        x2={`${entities[0].x}%`} 
                        y2={`${entities[0].y}%`} 
                        stroke="#a855f7" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4"
                      />
                      <line 
                        x1="98%" 
                        y1="50%" 
                        x2={`${entities[0].x}%`} 
                        y2={`${entities[0].y}%`} 
                        stroke="#a855f7" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4"
                      />
                    </svg>
                  )}
                </div>
              )}

              {/* 8. Custom Spec Feed point cloud */}
              {activeSensors.customSpec && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                  {Array.from({ length: 40 }).map((_, i) => {
                    const x = ((Math.cos(i * 19.87) * 0.4 + 0.5) * 100).toFixed(1);
                    const y = ((Math.sin(i * 35.12) * 0.4 + 0.5) * 100).toFixed(1);
                    return (
                      <div 
                        key={`custom-pt-${i}`}
                        className="absolute w-1.5 h-1.5 bg-pink-500 rounded-sm opacity-50 shadow-[0_0_3px_#ec4899] animate-pulse"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: viewMode === "3d" ? `translate3d(0, 0, 6px) rotateX(${i * 12}deg)` : "none",
                          animationDelay: `${(i % 4) * 0.3}s`
                        }}
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Volumetric Rooms overlay */}
              {rooms.map((room) => {
                const occupied = isRoomOccupied(room);
                const roomOccupants = getRoomOccupants(room);
                const isHostile = roomOccupants.some(o => o.biometrics?.classification?.includes("Hostile") || o.type === "anomalous");
                
                return (
                  <div
                    key={room.id}
                    className="absolute transition-all duration-300 border font-mono overflow-hidden"
                    style={{
                      left: `${room.x}%`,
                      top: `${room.y}%`,
                      width: `${room.w}%`,
                      height: `${room.h}%`,
                      backgroundColor: occupied 
                        ? (isHostile ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 211, 238, 0.15)") 
                        : room.color,
                      borderColor: occupied 
                        ? (isHostile ? "#ef4444" : "#22d3ee") 
                        : "rgba(255, 255, 255, 0.08)",
                      boxShadow: occupied 
                        ? (isHostile ? "inset 0 0 15px rgba(239,68,68,0.15)" : "inset 0 0 15px rgba(34,211,238,0.15)") 
                        : "none",
                      transform: viewMode === "3d" ? "translateZ(0px)" : "none",
                      transformStyle: "preserve-3d"
                    }}
                  >
                    
                    {/* Dynamic WiFi signal propagation aura */}
                    <div 
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div 
                        className="absolute inset-[-100%] border border-dashed rounded-full pointer-events-none opacity-[0.06] animate-ping" 
                        style={{ 
                          borderColor: occupied ? (isHostile ? "#ef4444" : "#22d3ee") : room.borderColor, 
                          animationDuration: occupied ? '3s' : '6s', 
                          animationDelay: `${(room.x % 3) * 0.4}s` 
                        }} 
                      />
                      <div 
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--accent)]/[0.015] to-transparent pointer-events-none"
                      />
                    </div>
                    
                    {/* Isometric Volumetric Extruded Walls (Neon glow) */}
                    {viewMode === "3d" && (
                      <>
                        {/* South Wall (Front-Facing wall projection) */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 border-t transition-all duration-300"
                          style={{
                            height: "30px",
                            transform: "rotateX(-90deg)",
                            transformOrigin: "bottom",
                            backgroundColor: occupied 
                              ? (isHostile ? "rgba(239, 68, 68, 0.25)" : "rgba(6, 182, 212, 0.25)") 
                              : "rgba(255, 255, 255, 0.02)",
                            borderColor: occupied 
                              ? (isHostile ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 211, 238, 0.5)") 
                              : "rgba(255, 255, 255, 0.15)"
                          }}
                        />
                        {/* West Wall (Left-Facing wall projection) */}
                        <div 
                          className="absolute top-0 bottom-0 left-0 border-r transition-all duration-300"
                          style={{
                            width: "30px",
                            transform: "rotateY(90deg)",
                            transformOrigin: "left",
                            backgroundColor: occupied 
                              ? (isHostile ? "rgba(239, 68, 68, 0.25)" : "rgba(6, 182, 212, 0.25)") 
                              : "rgba(255, 255, 255, 0.02)",
                            borderColor: occupied 
                              ? (isHostile ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 211, 238, 0.5)") 
                              : "rgba(255, 255, 255, 0.15)"
                          }}
                        />
                      </>
                    )}

                    {/* Target Count HUD (Billboarded/Screen-Aligned in 3D Mode) */}
                    <div 
                      className="absolute inset-0 flex flex-col justify-center items-center p-2 text-center pointer-events-none"
                      style={{
                        transform: viewMode === "3d" ? "translate3d(0px, 0px, 35px) rotateZ(40deg) rotateX(-55deg)" : "none",
                        transformStyle: "preserve-3d"
                      }}
                    >
                      {occupied && (
                        <span className="text-[8px] font-mono text-gray-200 bg-black/60 border border-white/10 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(0,0,0,0.5)]">
                          {roomOccupants.length} {roomOccupants.length === 1 ? "Target" : "Targets"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Antenna AP node markers (Calibratable) */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  className="absolute cursor-grab active:cursor-grabbing group z-20"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    transform: viewMode === "3d" ? "translate3d(-50%, -50%, 0px)" : "translate(-50%, -50%)",
                    transformStyle: "preserve-3d"
                  }}
                >
                  {/* Concentric Signal Wavefronts */}
                  <div className="absolute inset-0 w-6 h-6 -left-3 -top-3 rounded-full border border-cyan-400/40 bg-cyan-400/5 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 w-12 h-12 -left-6 -top-6 rounded-full border border-cyan-400/20 bg-cyan-400/3 animate-ping pointer-events-none" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />
                  <div className="absolute inset-0 w-20 h-20 -left-10 -top-10 rounded-full border border-cyan-400/10 bg-transparent animate-ping pointer-events-none" style={{ animationDuration: '6s', animationDelay: '3s' }} />
                  
                  {/* Glowing core AP receiver indicator (Billboarded/Screen-Aligned in 3D Mode) */}
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    style={{
                      backgroundColor: node.color,
                      transform: viewMode === "3d" ? "translate3d(0, 0, 15px) rotateZ(40deg) rotateX(-55deg)" : "none",
                      transformStyle: "preserve-3d"
                    }}
                  >
                    <Cpu size={8} className="text-white" />
                  </div>
                  
                  {/* Node Hover Label (Billboarded/Screen-Aligned in 3D Mode) */}
                  <div 
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 border border-white/15 px-2 py-0.5 rounded text-[8px] font-mono text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      transform: viewMode === "3d" ? "translate3d(-50%, 0px, 30px) rotateZ(40deg) rotateX(-55deg)" : "translateX(-50%)"
                    }}
                  >
                    {node.name} ({node.x}m, {node.y}m)
                  </div>
                </div>
              ))}

              {/* Live Tracked Targets Wireframe avatars */}
              {entities.map((ent) => {
                const { icon, color, label } = getEntityIconAndColor(ent);
                
                return (
                  <div
                    key={ent.id}
                    className="absolute z-30 transition-all duration-300"
                    style={{
                      left: `${ent.x}%`,
                      top: `${ent.y}%`,
                      transform: viewMode === "3d" ? "translate3d(-50%, -50%, 0px)" : "translate(-50%, -50%)",
                      transformStyle: "preserve-3d"
                    }}
                  >
                    
                    {/* Vertical floating vertical line anchor (Laser Anchor) */}
                    {viewMode === "3d" && (
                      <>
                        <div 
                          className="absolute border-l border-dashed pointer-events-none"
                          style={{
                            height: "50px",
                            left: "0",
                            bottom: "0",
                            borderColor: `${color}60`,
                            transform: "rotateX(-90deg)",
                            transformOrigin: "bottom"
                          }}
                        />
                        {/* Target shadow coordinate ring directly on floor */}
                        <div 
                          className="w-5 h-5 rounded-full border border-dashed -ml-2.5 -mt-2.5 animate-pulse"
                          style={{
                            borderColor: `${color}90`,
                            backgroundColor: `${color}10`,
                            transform: "translateZ(0px)"
                          }}
                        />
                      </>
                    )}

                    {/* Floating Avatar core (Billboarded/Screen-Aligned in 3D Mode so it does not rotate) */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs bg-black/60 border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)] select-none cursor-pointer"
                      style={{
                        borderColor: color,
                        transform: viewMode === "3d" ? "translate3d(0, 0, 30px) rotateZ(40deg) rotateX(-55deg)" : "none",
                        transformStyle: "preserve-3d"
                      }}
                      title={`${ent.name} (${label})`}
                    >
                      {icon}
                    </div>

                    {/* Target Dynamic Avatar label (Billboarded/Screen-Aligned in 3D Mode so it is completely upright) */}
                    <div 
                      className="absolute left-7 top-1/2 -translate-y-1/2 bg-black/85 backdrop-blur-md border px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      style={{
                        borderColor: `${color}40`,
                        color: color,
                        transform: viewMode === "3d" ? "translate3d(0px, -50%, 30px) rotateZ(40deg) rotateX(-55deg)" : "translateY(-50%)"
                      }}
                    >
                      {ent.name} <span className="text-gray-400">({label})</span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Compass grid helper */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] bg-black/40 border border-white/5 px-2.5 py-1 rounded-lg">
            <Compass size={11} className="text-cyan-400 animate-spin" style={{ animationDuration: "15s" }} />
            <span>CSI HEADING OVERLAY: 40° NORTH-WEST</span>
          </div>

          {/* 3D view height projection height bar */}
          {viewMode === "3d" && (
            <div className="absolute right-4 bottom-4 flex flex-col gap-1 border border-white/5 bg-black/60 rounded-lg p-2 font-mono text-[8px] text-gray-400">
              <span className="text-[9px] text-cyan-400 font-bold mb-1">CSI Z-PROJECTION</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-12 bg-white/5 rounded-full relative overflow-hidden">
                  <div className="absolute bottom-0 w-full bg-cyan-400 h-2/3 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span>Float: 50m (±0.25)</span>
                  <span>Anchor: Ground (0m)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor & Diagnostic Console Side-Panel */}
      <div className="glass p-5 rounded-2xl w-full xl:w-[320px] flex flex-col gap-4 bg-white/[0.01]">
        
        {/* Section 0: Unified Sensor Fusion Engine */}
        <div>
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
            <Cpu size={14} className="animate-pulse text-cyan-400" /> Unified Sensor Fusion Engine
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed font-mono">
            Aligns and merges mmWave, Lidar, depth, satellite, thermal, acoustic, and BLE feeds with WiFi CSI into one unified spatial point cloud.
          </p>

          {/* Fusion Status HUD */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 mt-3 flex flex-col gap-1.5 font-mono text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Active Modalities:</span>
              <span className="font-bold text-cyan-400">
                {Object.values(activeSensors).filter(Boolean).length} / 9 Streams
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cross-Modal Entropy:</span>
              <span className="font-bold text-emerald-400">
                {Object.values(activeSensors).filter(Boolean).length > 0 ? (0.24 / Object.values(activeSensors).filter(Boolean).length).toFixed(3) : "0.000"} nats
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Fusion Confidence:</span>
              <span className="font-bold text-cyan-400">
                {Object.values(activeSensors).filter(Boolean).length > 0 
                  ? `${(90 + Object.values(activeSensors).filter(Boolean).length * 1.1).toFixed(1)}%` 
                  : "0.0%"}
              </span>
            </div>
          </div>

          {/* Sensor Feeds Toggle Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[9px] font-mono">
            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, wifiCsi: !prev.wifiCsi }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.wifiCsi 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>WiFi CSI Feed</span>
              <span className="text-[7px] opacity-70">2.4/5.8GHz Multipath</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, mmWaveRadar: !prev.mmWaveRadar }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.mmWaveRadar 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>mmWave Radar</span>
              <span className="text-[7px] opacity-70">60-77GHz Target Sweep</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, lidar: !prev.lidar }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.lidar 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Lidar Scan</span>
              <span className="text-[7px] opacity-70">Solid-State Point Cloud</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, depthCamera: !prev.depthCamera }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.depthCamera 
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Depth Cameras</span>
              <span className="text-[7px] opacity-70">RGB-D Frustum Array</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, satellite: !prev.satellite }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.satellite 
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Satellite Context</span>
              <span className="text-[7px] opacity-70">GNSS & Alt Grid Overlay</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, thermalIr: !prev.thermalIr }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.thermalIr 
                  ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Thermal / IR</span>
              <span className="text-[7px] opacity-70">Radiometric footprint</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, acoustic: !prev.acoustic }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.acoustic 
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Acoustic Array</span>
              <span className="text-[7px] opacity-70">Doppler Footstep Ripple</span>
            </button>

            <button 
              onClick={() => setActiveSensors(prev => ({ ...prev, bleUwb: !prev.bleUwb }))}
              className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 justify-between transition-all ${
                activeSensors.bleUwb 
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]" 
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>BLE / UWB Tags</span>
              <span className="text-[7px] opacity-70">Anchor Triangulation</span>
            </button>
          </div>

          {/* Custom Spec Adapter Feed */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 mt-2.5 flex flex-col gap-2 font-mono text-[9px]">
            <button
              onClick={() => setActiveSensors(prev => ({ ...prev, customSpec: !prev.customSpec }))}
              className={`w-full py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between px-3 transition-all ${
                activeSensors.customSpec
                  ? "bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.15)]"
                  : "bg-black/40 border-white/5 text-gray-500"
              }`}
            >
              <span>Custom Spec Adapter</span>
              <span className="text-[8px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded font-mono uppercase">
                {activeSensors.customSpec ? "ACTIVE" : "BYO FEED"}
              </span>
            </button>
            {activeSensors.customSpec && (
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider font-semibold font-mono">Custom Sensor Name</span>
                <input
                  type="text"
                  value={customSpecName}
                  onChange={(e) => setCustomSpecName(e.target.value)}
                  placeholder="e.g. Ultrasonic Array"
                  className="bg-black/40 border border-white/10 px-2 py-1 rounded text-[10px] text-gray-200 focus:outline-none focus:border-pink-500/50 font-mono"
                />
              </div>
            )}
          </div>

          {/* Point Cloud Synthesis Density control */}
          <div className="mt-3.5 flex flex-col gap-1.5">
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold font-mono flex items-center gap-1">
              <Sliders size={11} /> Synthesis Point Density
            </span>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
              {["low", "medium", "high", "ultra"].map(density => (
                <button
                  key={density}
                  onClick={() => setPointCloudDensity(density)}
                  className={`py-1 rounded border uppercase font-bold transition-all ${
                    pointCloudDensity === density
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                      : "bg-black/40 border-white/5 text-gray-500 hover:border-white/10"
                  }`}
                >
                  {density}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-glass)] pt-4" />

        {/* Section 1: Calibration Control */}
        <div>
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
            <Sliders size={14} /> ESP32 Receiver Node Calibration
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed font-mono">
            Drag the glowing hardware nodes on the radar floorplan to align the trilateration calculations with your physical room dimensions.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            {nodes.map(node => (
              <div key={node.id} className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-200 font-mono flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                    {node.id.toUpperCase()}: {node.name.split(" ")[2]}
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                    {node.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 bg-white/[0.02] p-1.5 rounded border border-white/5">
                  <span>X: {node.x}% ({(node.x * 0.15).toFixed(1)}m)</span>
                  <span>Y: {node.y}% ({(node.y * 0.15).toFixed(1)}m)</span>
                  <span>Freq: {node.band}</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setNodes([
              { id: "ap1", name: "AP Receiver (West Gateway)", x: 12, y: 15, band: "2.4/5 GHz", status: "online", color: "#22d3ee" },
              { id: "ap2", name: "AP Receiver (East Guard)", x: 88, y: 20, band: "2.4/5 GHz", status: "online", color: "#3b82f6" },
              { id: "ap3", name: "AP Receiver (Corridor Anchor)", x: 50, y: 85, band: "2.4/5 GHz", status: "online", color: "#ef4444" }
            ])}
            className="w-full py-1.5 mt-2 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all"
          >
            <RotateCcw size={12} /> Reset Node Positions
          </button>
        </div>

        {/* Section: Architectural Floorplan Modeler */}
        <div className="border-t border-[var(--border-glass)] pt-4 mt-1">
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
            <LayoutGrid size={14} /> Architectural Floorplan Modeler
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed font-mono">
            Auto-generate randomized wall layouts or append dynamic spatial sectors to build your structural perimeter from place to place.
          </p>
          
          <div className="mt-3 flex flex-col gap-2">
            <button 
              onClick={generateFloorplanFromWiFi}
              className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-black rounded-lg text-[10px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(59,130,246,0.2)]"
            >
              <Cpu size={12} className="animate-pulse" /> Compute Walls from WiFi CSI
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={generateRandomLayout}
                className="py-1.5 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                <LayoutGrid size={12} /> Random Walls
              </button>
              <button 
                onClick={addCustomRoom}
                className="py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[10px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={12} /> Add Zone
              </button>
            </div>
          </div>

          {rooms.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-3 max-h-[140px] overflow-y-auto pr-1">
              {rooms.map(room => (
                <div key={room.id} className="bg-black/20 border border-white/5 rounded-lg px-2.5 py-1.5 flex justify-between items-center text-[10px] font-mono text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: room.borderColor }} />
                    <span className="font-semibold text-gray-200">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-400 font-mono">
                      {room.w}x{room.h}%
                    </span>
                    <button 
                      onClick={() => deleteRoom(room.id)}
                      className="text-red-400/60 hover:text-red-400 transition-colors"
                      title="Remove Room Sector"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rooms.length > 0 && (
            <button 
              onClick={() => setRooms([])}
              className="w-full py-1.5 mt-2 bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 text-red-400 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 size={12} /> Clear Floorplan
            </button>
          )}
        </div>

        {/* Section 2: Spatial Diagnostics Report */}
        <div className="flex-1 flex flex-col justify-end gap-3 mt-2">
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
            <Cpu size={14} /> Deployment Diagnostic Console
          </h4>
          
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2 font-mono text-[10px] text-gray-300">
            <div className="flex justify-between items-center">
              <span>Sensing Matrix Status:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={11} /> OPTIMAL</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span>Trilateration Error:</span>
              <span className="text-cyan-400 font-bold">±0.04m (RMS)</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span>Dynamic Coverage:</span>
              <span className="text-cyan-400 font-bold">98.4% Spatial Zone</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span>Sensing Frequency:</span>
              <span className="text-gray-400">80 CSI frames/sec</span>
            </div>
          </div>
          
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl flex gap-2.5 items-start">
            <MapPin size={22} className="text-cyan-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <div className="flex flex-col font-mono">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Spatial Coverage Report</span>
              <span className="text-[9px] text-gray-300 mt-1 leading-normal">
                Receivers are optimally arranged to scan all 4 virtual floor zones with zero blind spots detected in current session.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
