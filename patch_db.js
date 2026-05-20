const fs = require('fs');
let code = fs.readFileSync('app/sensing/db.js', 'utf8');
code = code.replace(/\\`/g, "`");
fs.writeFileSync('app/sensing/db.js', code);
