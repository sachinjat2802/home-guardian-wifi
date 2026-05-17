const { exec } = require('child_process');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log("📡 Home Guardian Local WiFi RSSI Server Started on port 8080");
console.log("Listening to physical Windows WiFi Adapter for interference...");

let lastRssi = null;
let baselineRssi = null;
const HISTORY_SIZE = 10;
let history = [];

function getWiFiSignal() {
  exec('netsh wlan show interfaces', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    
    // Parse the Signal percentage from the output
    const match = stdout.match(/Signal\s*:\s*(\d+)%/);
    if (match && match[1]) {
      const signal = parseInt(match[1]);
      
      // Keep track of recent history for baseline calculation
      history.push(signal);
      if (history.length > HISTORY_SIZE) history.shift();
      
      // Calculate baseline (average of recent signals)
      baselineRssi = history.reduce((a, b) => a + b, 0) / history.length;
      
      let motionDetected = false;
      let motionSeverity = 'low';
      
      // If signal drops suddenly compared to baseline, it indicates physical interference (motion)
      if (baselineRssi > 0 && lastRssi > 0) {
        const drop = baselineRssi - signal;
        if (drop >= 3) { // 3% sudden drop means something blocked the waves
          motionDetected = true;
          motionSeverity = drop > 8 ? 'critical' : (drop > 5 ? 'high' : 'medium');
          console.log(`🚨 MOTION DETECTED! Signal drop: ${drop}% (Severity: ${motionSeverity})`);
        }
      }
      
      lastRssi = signal;
      
      // Broadcast to all connected frontend clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'telemetry',
            signal: signal,
            baseline: baselineRssi,
            motion: motionDetected,
            severity: motionSeverity,
            timestamp: Date.now()
          }));
        }
      });
      
    } else {
      console.log("Could not find WiFi signal. Make sure WiFi is connected.");
    }
  });
}

// Poll the WiFi adapter every 500ms
setInterval(getWiFiSignal, 500);

wss.on('connection', (ws) => {
  console.log('✅ Frontend UI Connected to Live Radar');
});
