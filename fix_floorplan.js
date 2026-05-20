const fs = require('fs');
let code = fs.readFileSync('app/components/FloorplanView.js', 'utf8');

code = code.replace(
  /transform: \\`rotateZ\(\\\$\\{idx \* 90\\}deg\)\\`,/g,
  "transform: `rotateZ(${idx * 90}deg)`,"
);

fs.writeFileSync('app/components/FloorplanView.js', code);
