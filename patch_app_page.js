const fs = require('fs');
let code = fs.readFileSync('app/page.js', 'utf8');

const replacement = `  const [sirenEnabled, setSirenEnabled] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audioRef.current.loop = true;
    }
    if (security.triggered && sirenEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [security.triggered, sirenEnabled]);

  useEffect(() => {`;

code = code.replace(/  useEffect\(\(\) => \{/g, (match, offset) => {
  if (offset === code.indexOf('  useEffect(() => {')) return replacement;
  return match;
});

const toggleReplacement = `
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={sirenEnabled}
              onChange={(e) => setSirenEnabled(e.target.checked)}
              className="accent-[var(--danger)]"
            />
            <span className={sirenEnabled ? "text-red-400 font-medium" : ""}>Siren Sound</span>
          </label>
          <PipelineSelector mode={sensing.mode} onModeChange={sensing.changeMode} />
        </div>
      </header>`;

code = code.replace(/        <PipelineSelector mode=\{sensing\.mode\} onModeChange=\{sensing\.changeMode\} \/>\n      <\/header>/, toggleReplacement);

fs.writeFileSync('app/page.js', code);
