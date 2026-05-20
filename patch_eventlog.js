const fs = require('fs');
let code = fs.readFileSync('app/components/EventLog.js', 'utf8');

const replacement = `
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "event_log.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <section className="glass p-5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Event Log</h3>
        <button onClick={handleExport} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors text-gray-300">
          Export JSON
        </button>
      </div>`;

code = code.replace(
  /return \(\n    <section className="glass p-5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">\n      <h3 className="text-sm font-semibold mb-3">Event Log<\/h3>/g,
  replacement
);

fs.writeFileSync('app/components/EventLog.js', code);
