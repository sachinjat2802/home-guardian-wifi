const fs = require('fs');
let code = fs.readFileSync('app/page.js', 'utf8');

const regex = /\/\/ Keep state variables synchronized when MQTT analysis updates\n  const \[prevActiveMqtt, setPrevActiveMqtt\] = useState\(activeMqtt\);\n  if \(activeMqtt !== prevActiveMqtt\) \{\n    setPrevActiveMqtt\(activeMqtt\);\n    setHost\(activeMqtt\?\.host \?\? "mqtt:\/\/192\.168\.1\.150:1883"\);\n    setTopic\(activeMqtt\?\.topic \?\? "home\/guardian"\);\n    setPublishOccupancy\(activeMqtt\?\.publishOccupancy \?\? true\);\n    setPublishVitals\(activeMqtt\?\.publishVitals \?\? true\);\n    setPublishAlerts\(activeMqtt\?\.publishAlerts \?\? true\);\n  \}/;

const replacement = `// Keep state variables synchronized when MQTT analysis updates
  useEffect(() => {
    if (activeMqtt) {
      setHost(activeMqtt.host ?? "mqtt://192.168.1.150:1883");
      setTopic(activeMqtt.topic ?? "home/guardian");
      setPublishOccupancy(activeMqtt.publishOccupancy ?? true);
      setPublishVitals(activeMqtt.publishVitals ?? true);
      setPublishAlerts(activeMqtt.publishAlerts ?? true);
    }
  }, [activeMqtt]);`;

code = code.replace(regex, replacement);

fs.writeFileSync('app/page.js', code);
