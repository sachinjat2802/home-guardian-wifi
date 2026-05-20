const fs = require('fs');
let code = fs.readFileSync('app/components/RadarMap.js', 'utf8');

const regex = /const \[prevEntities, setPrevEntities\] = useState\(\[\]\);\n\n  if \(entities !== prevEntities\) \{\n    setPrevEntities\(entities\);\n    if \(entities && entities\.length > 0\) \{\n      const newTrails = \{ \.\.\.trails \};\n      entities\.forEach\(e => \{\n        if \(\!newTrails\[e\.id\]\) newTrails\[e\.id\] = \[\];\n        const lastPos = newTrails\[e\.id\]\[newTrails\[e\.id\]\.length - 1\];\n        if \(\!lastPos \|\| Math\.abs\(lastPos\.x - e\.x\) > 0\.5 \|\| Math\.abs\(lastPos\.y - e\.y\) > 0\.5\) \{\n          newTrails\[e\.id\]\.push\(\{ x: e\.x, y: e\.y, time: telemetry\?\.timestamp \|\| 0 \}\);\n          if \(newTrails\[e\.id\]\.length > 20\) newTrails\[e\.id\]\.shift\(\);\n        \}\n      \}\);\n      Object\.keys\(newTrails\)\.forEach\(id => \{\n        if \(\!entities\.find\(e => e\.id === id\)\) delete newTrails\[id\];\n      \}\);\n      setTrails\(newTrails\);\n    \}\n  \}/;

const replacement = `useEffect(() => {
    if (!entities || entities.length === 0) return;
    setTrails(prev => {
      const newTrails = { ...prev };
      entities.forEach(e => {
        if (!newTrails[e.id]) newTrails[e.id] = [];
        const lastPos = newTrails[e.id][newTrails[e.id].length - 1];
        if (!lastPos || Math.abs(lastPos.x - e.x) > 0.5 || Math.abs(lastPos.y - e.y) > 0.5) {
          newTrails[e.id] = [...newTrails[e.id], { x: e.x, y: e.y, time: telemetry?.timestamp || 0 }];
          if (newTrails[e.id].length > 20) newTrails[e.id] = newTrails[e.id].slice(1);
        }
      });
      Object.keys(newTrails).forEach(id => {
        if (!entities.find(e => e.id === id)) delete newTrails[id];
      });
      return newTrails;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities]);`;

code = code.replace(regex, replacement);

fs.writeFileSync('app/components/RadarMap.js', code);
