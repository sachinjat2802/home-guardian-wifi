const fs = require('fs');
let code = fs.readFileSync('app/components/RadarMap.js', 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{\n    if \(\!entities \|\| entities\.length === 0\) return;\n    setTrails\(prev => \{/g,
  `useEffect(() => {
    if (!entities || entities.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrails(prev => {`
);

fs.writeFileSync('app/components/RadarMap.js', code);
