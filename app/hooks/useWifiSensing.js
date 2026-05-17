"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

  const addEvent = useCallback((msg, type = "info") => {
    setEvents((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket("ws://localhost:8080");
      wsRef.current = ws;

      ws.onopen = () => {
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
              setAnalysis(data);
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
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setMode("disconnected");
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, [addEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const requestScan = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "scan" }));
    }
  }, []);

  const armSecurity = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "arm" }));
      addEvent("Arm command sent to sensing server", "system");
    }
  }, [addEvent]);

  const disarmSecurity = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "disarm" }));
      addEvent("Disarm command sent to sensing server", "system");
    }
  }, [addEvent]);

  const triggerAlarm = useCallback((reason) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "trigger_alarm", reason: reason || "Manual Emergency Trigger" }));
      addEvent(`Emergency alarm trigger: ${reason || "Manual Trigger"}`, "alert");
    }
  }, [addEvent]);

  const changePreset = useCallback((preset) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "preset", preset }));
      addEvent(`Preset change: ${preset.toUpperCase()}`, "system");
    }
  }, [addEvent]);

  const changeMode = useCallback((newMode) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mode", mode: newMode }));
      addEvent(`Sensing mode toggle requested: ${newMode.toUpperCase()}`, "system");
    }
  }, [addEvent]);

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
  };
}
