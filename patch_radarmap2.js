const fs = require('fs');
let code = fs.readFileSync('app/components/RadarMap.js', 'utf8');

code = code.replace(
  /newTrails\[e\.id\]\.push\(\{ x: e\.x, y: e\.y, time: Date\.now\(\) \}\);/g,
  `newTrails[e.id].push({ x: e.x, y: e.y, time: telemetry?.timestamp || 0 });`
);

fs.writeFileSync('app/components/RadarMap.js', code);
