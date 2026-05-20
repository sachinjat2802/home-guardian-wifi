const fs = require('fs');
let code = fs.readFileSync('app/page.js', 'utf8');

code = code.replace(
  /\/\/ Keep state variables synchronized when MQTT analysis updates\n  useEffect\(\(\) => \{\n    setHost\(activeMqtt\?\.host \?\? "mqtt:\/\/192\.168\.1\.150:1883"\);\n    setTopic\(activeMqtt\?\.topic \?\? "home\/guardian"\);\n    setPublishOccupancy\(activeMqtt\?\.publishOccupancy \?\? true\);\n    setPublishVitals\(activeMqtt\?\.publishVitals \?\? true\);\n    setPublishAlerts\(activeMqtt\?\.publishAlerts \?\? true\);\n  \}, \[\n    activeMqtt\?\.host,\n    activeMqtt\?\.topic,\n    activeMqtt\?\.publishOccupancy,\n    activeMqtt\?\.publishVitals,\n    activeMqtt\?\.publishAlerts\n  \]\);/g,
  `// Keep state variables synchronized when MQTT analysis updates
  const [prevActiveMqtt, setPrevActiveMqtt] = useState(activeMqtt);
  if (activeMqtt !== prevActiveMqtt) {
    setPrevActiveMqtt(activeMqtt);
    setHost(activeMqtt?.host ?? "mqtt://192.168.1.150:1883");
    setTopic(activeMqtt?.topic ?? "home/guardian");
    setPublishOccupancy(activeMqtt?.publishOccupancy ?? true);
    setPublishVitals(activeMqtt?.publishVitals ?? true);
    setPublishAlerts(activeMqtt?.publishAlerts ?? true);
  }`
);

fs.writeFileSync('app/page.js', code);
