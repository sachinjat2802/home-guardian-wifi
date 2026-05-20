const fs = require('fs');
let code = fs.readFileSync('app/components/Sidebar.js', 'utf8');

const replacement = `
        <div className={\`flex items-center gap-2 p-3 rounded-xl text-xs font-medium \${connected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}\`}>
          <ShieldCheck size={16} />
          {connected ? "Sensing Active" : "Disconnected"}
        </div>
        <button
          onClick={async () => {
            if (confirm('Are you sure you want to clear all historical database telemetry?')) {
              try {
                await fetch('/api/data', { method: 'DELETE' });
                alert('Local data cleared successfully.');
              } catch (e) {
                console.error(e);
              }
            }
          }}
          className="mt-4 flex items-center gap-2 p-3 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer w-full"
        >
          <Shield size={16} />
          Clear Local Data
        </button>`;

code = code.replace(
  /<div className=\{\`flex items-center gap-2 p-3 rounded-xl text-xs font-medium \$\{connected \? "bg-emerald-500\/10 text-emerald-400" : "bg-red-500\/10 text-red-400"\}\`\}>\n\s*<ShieldCheck size=\{16\} \/>\n\s*\{connected \? "Sensing Active" : "Disconnected"\}\n\s*<\/div>/g,
  replacement
);

fs.writeFileSync('app/components/Sidebar.js', code);
