const fs = require('fs');
let code = fs.readFileSync('app/page.js', 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{\n    if \(activeMqtt\) \{\n      setHost\(activeMqtt\.host \?\? "mqtt:\/\/192\.168\.1\.150:1883"\);/g,
  `useEffect(() => {
    if (activeMqtt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHost(activeMqtt.host ?? "mqtt://192.168.1.150:1883");`
);

fs.writeFileSync('app/page.js', code);
