import { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Wind, Moon, Home, Bell, Shield, Radio, ShieldCheck, AlertTriangle, Wifi, User, Cat, Bird, Bug, Ghost, Droplet, Thermometer, Terminal, Dog, Circle } from 'lucide-react';
import './App.css';
function App() {
  const [customMap, setCustomMap] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  const [subjects, setSubjects] = useState([
    { id: 1, type: 'human', name: 'Entity_Human_1', age: 32, mac: 'FA:3B:11:09:A2', room: 'Living Room', x: 30, y: 70, targetX: 40, targetY: 60, status: 'Walking', heartRate: 82, breathingRate: 16, hrv: 45, temp: 36.6, stress: 'Low', spo2: 98, bp: '120/80', posture: 'Upright' },
    { id: 2, type: 'human', name: 'Entity_Human_2', age: 45, mac: 'C2:90:BB:1A:33', room: 'Master Bedroom', x: 20, y: 25, targetX: 20, targetY: 25, status: 'Sleeping', heartRate: 58, breathingRate: 12, hrv: 65, temp: 36.4, stress: 'Relaxed', spo2: 99, bp: '110/70', posture: 'Lying' },
    { id: 7, type: 'human', name: 'Entity_Human_3', age: 12, mac: '00:1A:2B:3C:4D', room: 'Kitchen', x: 70, y: 70, targetX: 75, targetY: 75, status: 'Walking', heartRate: 90, breathingRate: 18, hrv: 40, temp: 36.8, stress: 'Low', spo2: 97, bp: '125/82', posture: 'Upright' },
    { id: 8, type: 'human', name: 'Entity_Human_4', age: 68, mac: 'AA:BB:CC:DD:EE', room: 'Guest Bedroom', x: 80, y: 30, targetX: 85, targetY: 35, status: 'Resting', heartRate: 65, breathingRate: 14, hrv: 55, temp: 36.5, stress: 'Low', spo2: 99, bp: '115/75', posture: 'Sitting' },
    { id: 9, type: 'human', name: 'Entity_Human_5', age: 27, mac: '11:22:33:44:55', room: 'Living Room', x: 35, y: 65, targetX: 30, targetY: 60, status: 'Walking', heartRate: 85, breathingRate: 17, hrv: 42, temp: 36.7, stress: 'Low', spo2: 98, bp: '118/78', posture: 'Upright' },
    { id: 10, type: 'human', name: 'Entity_Human_6', age: 8, mac: '66:77:88:99:00', room: 'Hallway', x: 50, y: 50, targetX: 55, targetY: 55, status: 'Walking', heartRate: 88, breathingRate: 16, hrv: 48, temp: 36.6, stress: 'Low', spo2: 98, bp: '122/80', posture: 'Upright' },
    { id: 3, type: 'cat', name: 'Feline_Signature', mac: 'Unknown', room: 'Living Room', x: 45, y: 75, targetX: 80, targetY: 90, status: 'Resting', heartRate: 120, breathingRate: 25, hrv: 30, temp: 38.5, stress: 'Low', spo2: 97, bp: 'N/A', posture: 'Curled' },
    { id: 4, type: 'bird', name: 'Avian_Signature', mac: 'Unknown', room: 'Kitchen', x: 80, y: 60, targetX: 20, targetY: 80, status: 'Flying', heartRate: 250, breathingRate: 50, hrv: 10, temp: 40.0, stress: 'Active', spo2: 95, bp: 'N/A', posture: 'Airborne' },
    { id: 5, type: 'lizard', name: 'Reptile_Sig_1', mac: 'Unknown', room: 'Hallway', x: 60, y: 40, targetX: 62, targetY: 42, status: 'Basking', heartRate: 60, breathingRate: 8, hrv: 5, temp: 32.0, stress: 'Relaxed', spo2: 90, bp: 'N/A', posture: 'Flat' },
    { id: 6, type: 'snake', name: 'Reptile_Sig_2', mac: 'Unknown', room: 'Guest Bedroom', x: 85, y: 20, targetX: 90, targetY: 30, status: 'Slithering', heartRate: 40, breathingRate: 4, hrv: 2, temp: 28.0, stress: 'Low', spo2: 85, bp: 'N/A', posture: 'Coiled' },
    { id: 11, type: 'dog', name: 'Canine_Signature', mac: 'Unknown', room: 'Yard', x: 80, y: 80, targetX: 85, targetY: 85, status: 'Walking', heartRate: 90, breathingRate: 20, hrv: 35, temp: 38.9, stress: 'Low', spo2: 98, bp: 'N/A', posture: 'Standing' },
    { id: 12, type: 'cow', name: 'Bovine_Signature_1', mac: 'Unknown', room: 'Yard', x: 10, y: 90, targetX: 12, targetY: 92, status: 'Grazing', heartRate: 60, breathingRate: 15, hrv: 40, temp: 38.6, stress: 'Low', spo2: 96, bp: 'N/A', posture: 'Standing' },
    { id: 13, type: 'buffalo', name: 'Bovine_Signature_2', mac: 'Unknown', room: 'Yard', x: 90, y: 10, targetX: 88, targetY: 12, status: 'Resting', heartRate: 50, breathingRate: 12, hrv: 45, temp: 38.2, stress: 'Low', spo2: 95, bp: 'N/A', posture: 'Lying' },
    { id: 14, type: 'ghost', name: 'Anomalous_Entity', mac: 'Unknown', room: 'Attic', x: 50, y: 20, targetX: 40, targetY: 30, status: 'Floating', heartRate: 0, breathingRate: 0, hrv: 0, temp: 15.0, stress: 'Unknown', spo2: 0, bp: 'N/A', posture: 'Hovering' },
  ]);

  const [events, setEvents] = useState([
    { id: 1, time: '2m ago', msg: 'Alice entered deep sleep phase', type: 'sleep' },
    { id: 2, time: '10m ago', msg: 'Guest device connected', type: 'info' },
    { id: 3, time: '3h ago', msg: 'System armed for night mode', type: 'system' },
  ]);

  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {
      console.log('Audio disabled or error:', e);
    }
  };

  const simulateIntruder = () => {
    playAlertSound();
    const newSubject = {
      id: Date.now(),
      type: 'human',
      name: 'Anomalous_Sig_1',
      age: '25-35',
      mac: 'DE:AD:BE:EF:00',
      room: 'Front Porch',
      x: 50,
      y: 95,
      targetX: 50,
      targetY: 50,
      status: 'Walking',
      heartRate: 95,
      breathingRate: 22,
      hrv: 25,
      temp: 37.1,
      stress: 'High',
      spo2: 96,
      bp: '135/85',
      posture: 'Walking'
    };
    setSubjects(prev => [...prev, newSubject]);
    setEvents(prev => [{ id: Date.now(), time: 'Just now', msg: 'Motion detected at Front Porch!', type: 'alert' }, ...prev]);
  };

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomMap(url);
    }
  };

  const [activePerson, setActivePerson] = useState(null);

  // Simulate real-time data fluctuations and movement with physics
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setSubjects(currentSubjects => 
        currentSubjects.map(subject => {
          let newX = subject.x;
          let newY = subject.y;
          let newTargetX = subject.targetX;
          let newTargetY = subject.targetY;
          let newStatus = subject.status;
          
          const timeOffset = frame * 0.1 + subject.id;
          
          // Movement algorithms based on entity type
          if (subject.type === 'bird' || subject.type === 'ghost') {
            // Birds and ghosts fly fast and erratically
            newX += (newTargetX - newX) * 0.1;
            newY += (newTargetY - newY) * 0.1;
            if (Math.abs(newTargetX - newX) < 2) {
              newTargetX = Math.max(10, Math.min(90, newX + (Math.random() * 60 - 30)));
              newTargetY = Math.max(10, Math.min(90, newY + (Math.random() * 60 - 30)));
            }
          } else if (subject.type === 'cat' || subject.type === 'dog' || subject.status === 'Walking') {
            // Cats, dogs, and walking humans move moderately and pick new points
            newX += (newTargetX - newX) * 0.05;
            newY += (newTargetY - newY) * 0.05;
            if (Math.abs(newTargetX - newX) < 2) {
              newTargetX = Math.max(10, Math.min(90, newX + (Math.random() * 40 - 20)));
              newTargetY = Math.max(10, Math.min(90, newY + (Math.random() * 40 - 20)));
            }
          } else if (subject.type === 'snake') {
            // Snakes slither slowly
            newX += (newTargetX - newX) * 0.01;
            newY += (newTargetY - newY) * 0.01;
            if (Math.abs(newTargetX - newX) < 1) {
              newTargetX = Math.max(10, Math.min(90, newX + (Math.random() * 20 - 10)));
              newTargetY = Math.max(10, Math.min(90, newY + (Math.random() * 20 - 10)));
            }
          } else if (subject.type === 'cow' || subject.type === 'buffalo') {
             // Cows and buffalos graze/move very slowly
            newX += (newTargetX - newX) * 0.005;
            newY += (newTargetY - newY) * 0.005;
            if (Math.abs(newTargetX - newX) < 1) {
              newTargetX = Math.max(10, Math.min(90, newX + (Math.random() * 10 - 5)));
              newTargetY = Math.max(10, Math.min(90, newY + (Math.random() * 10 - 5)));
            }
          } else {
            // Sleeping/Resting/Basking have tiny micromovements (breathing chest expansion)
            newX += Math.sin(timeOffset) * 0.05;
            newY += Math.cos(timeOffset) * 0.05;
          }

          // Calculate realistic sine-wave vital signs instead of random jumps
          const heartBase = subject.heartRate;
          const breathBase = subject.breathingRate;
          
          // Simulated telemetry data
          const rssi = -45 - Math.floor(Math.random() * 20);
          const csiVariance = (Math.random() * 0.5 + 0.1).toFixed(2);
          
          return {
            ...subject,
            x: newX,
            y: newY,
            targetX: newTargetX,
            targetY: newTargetY,
            status: newStatus,
            heartRate: Math.round(heartBase + Math.sin(timeOffset * 0.5) * 2),
            breathingRate: Math.round(breathBase + Math.cos(timeOffset * 0.2) * 1.5),
            hrv: Math.max(2, Math.round((subject.hrv || 50) + Math.sin(timeOffset * 0.8) * 3)),
            rssi: rssi,
            csi: csiVariance
          };
        })
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar glass-panel">
        <div className="brand">
          <Radio className="brand-icon" size={28} color="var(--accent-color)" />
          <h2>Home Guardian</h2>
        </div>
        <ul className="nav-links">
          <li className={activeTab === 'Dashboard' ? 'active' : ''} onClick={() => setActiveTab('Dashboard')} style={{ cursor: 'pointer' }}><Home size={20} /> Dashboard</li>
          <li className={activeTab === 'Vitals' ? 'active' : ''} onClick={() => setActiveTab('Vitals')} style={{ cursor: 'pointer' }}><Activity size={20} /> Vitals</li>
          <li className={activeTab === 'Sleep' ? 'active' : ''} onClick={() => setActiveTab('Sleep')} style={{ cursor: 'pointer' }}><Moon size={20} /> Sleep</li>
          <li className={activeTab === 'Security' ? 'active' : ''} onClick={() => setActiveTab('Security')} style={{ cursor: 'pointer' }}><Shield size={20} /> Security</li>
        </ul>
        <div className="system-status">
          <ShieldCheck size={18} color="var(--success-color)" />
          <span>WiFi Sensing Active</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <h2>Live Spatial Scan</h2>
          <div className="header-actions">
            <label className="upload-btn">
              Upload Real Map
              <input type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
            </label>
            <button className="simulate-btn" onClick={simulateIntruder}>
              <AlertTriangle size={16} /> Simulate Entry
            </button>
            <div className="user-profile">
              <Bell size={20} className="icon-btn" />
              <div className="avatar">JD</div>
            </div>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
        <div className="main-grid">
          {/* Floor Plan & Radar Map */}
          <section className="glass-panel card radar-section">
            <div className="section-header">
              <h3>Live House Map</h3>
              <div className="radar-legend">
                <span className="legend-item"><div className="legend-dot router-dot"></div> Router</span>
                <span className="legend-item"><div className="legend-dot person-dot"></div> Person</span>
              </div>
            </div>
            
            <div className="radar-map-container" style={{ backgroundImage: `url(${customMap || '/farm_satellite_blueprint.png'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {/* Overlay Grid for Tactical Look */}
              <div className="radar-grid-overlay"></div>
              
              {/* Outer Yard / WiFi Range Area */}
              <div className="yard-area" style={{ background: 'rgba(5, 8, 17, 0.4)' }}>
                <span className="yard-label">Full WiFi Scanning Range</span>
              </div>

              {/* Central WiFi Router with Radar Waves */}
              <div className="wifi-router-center">
                <div className="radar-wave wave-1"></div>
                <div className="radar-wave wave-2"></div>
                <div className="radar-wave wave-3"></div>
                <div className="radar-scanner"></div>
                <Wifi size={24} className="router-icon" />
              </div>

              {/* Detected Subjects */}
              {subjects.map(subject => {
                let Icon = User;
                if (subject.type === 'cat') Icon = Cat;
                if (subject.type === 'bird') Icon = Bird;
                if (subject.type === 'lizard') Icon = Bug;
                if (subject.type === 'snake') Icon = Activity; // Replaced snake icon to Activity as placeholder, Ghost is for ghosts
                if (subject.type === 'dog') Icon = Dog;
                if (subject.type === 'cow' || subject.type === 'buffalo') Icon = Circle; // Use circle or generic shape for bovines
                if (subject.type === 'ghost') Icon = Ghost;

                return (
                <div 
                  key={subject.id}
                  className={`person-marker ${activePerson === subject.id ? 'active' : ''}`}
                  style={{ left: `${subject.x}%`, top: `${subject.y}%` }}
                  onClick={() => setActivePerson(activePerson === subject.id ? null : subject.id)}
                >
                  <div className={`person-blip ${subject.type}`}></div>
                  <Icon size={16} className={`person-icon ${subject.type}`} />
                  
                  {/* Removed Tooltip to move stats to sidebar */}
                </div>
                );
              })}
            </div>
          </section>

          {/* Right Sidebar - Analytics or RuView DensePose */}
          <aside className="side-column">
            {activePerson ? (
              <div className="glass-panel card detailed-analysis">
                <div className="section-header">
                  <h3>Subject Analysis</h3>
                  <div className="pulse-indicator">Live</div>
                </div>
                
                {(() => {
                  const subject = subjects.find(s => s.id === activePerson);
                  if (!subject) return null;
                  return (
                    <div className="analysis-content">
                      <div className="densepose-viewer">
                        <div className="scan-line"></div>
                        <div className="densepose-label">WiFi-DensePose Reconstruction</div>
                        <div className="point-cloud">
                          {/* Fake point cloud generation based on type */}
                          {subject.type === 'human' ? (
                            <svg viewBox="0 0 100 150" className="wireframe-svg">
                              <circle cx="50" cy="20" r="12" fill="none" stroke="var(--accent-color)" strokeDasharray="2,2"/>
                              <line x1="50" y1="32" x2="50" y2="80" stroke="var(--accent-color)" strokeWidth="2"/>
                              <line x1="50" y1="40" x2="20" y2="70" stroke="var(--accent-color)" strokeWidth="2"/>
                              <line x1="50" y1="40" x2="80" y2="70" stroke="var(--accent-color)" strokeWidth="2"/>
                              <line x1="50" y1="80" x2="30" y2="140" stroke="var(--accent-color)" strokeWidth="2"/>
                              <line x1="50" y1="80" x2="70" y2="140" stroke="var(--accent-color)" strokeWidth="2"/>
                              {Array.from({length: 40}).map((_, i) => (
                                <circle key={i} cx={20 + Math.random()*60} cy={10 + Math.random()*130} r="1" fill="#06b6d4" opacity="0.6"/>
                              ))}
                            </svg>
                          ) : (
                            <div className="generic-point-cloud">
                              {Array.from({length: 60}).map((_, i) => (
                                <div key={i} className="cloud-dot" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()}s` }}></div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="csi-variance">Phase Variance: {subject.csi} | RSSI: {subject.rssi} dBm</p>
                      </div>

                      <div className="subject-meta">
                        <h4>{subject.name}</h4>
                        <p className="meta-sub">{subject.mac} • {subject.room}</p>
                        {subject.age && <p className="meta-highlight">Est. Age: {subject.age} yrs</p>}
                      </div>

                      <div className="vitals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                        <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                          <Heart size={14} color="var(--danger-color)" />
                          <div className="vital-val">{subject.heartRate} <small>BPM</small></div>
                        </div>
                        <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                          <Wind size={14} color="var(--accent-color)" />
                          <div className="vital-val">{subject.breathingRate} <small>RPM</small></div>
                        </div>
                        <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                          <Activity size={14} color="#a855f7" />
                          <div className="vital-val">{subject.hrv} <small>HRV</small></div>
                        </div>
                        <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                          <Thermometer size={14} color="var(--warning-color)" />
                          <div className="vital-val">{subject.temp}°C</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                <section className="glass-panel card event-log-section">
                  <h3>Recent Activity</h3>
                  <div className="event-list">
                    {events.map(event => (
                      <div key={event.id} className={`event-item ${event.type}`}>
                        <div className="event-icon">
                          {event.type === 'info' && <Activity size={16} />}
                          {event.type === 'sleep' && <Moon size={16} />}
                          {event.type === 'system' && <Shield size={16} />}
                          {event.type === 'alert' && <AlertTriangle size={16} />}
                        </div>
                        <div className="event-content">
                          <p className="event-msg">{event.msg}</p>
                          <span className="event-time">{event.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </aside>
        </div>
        )}

        {activeTab === 'Vitals' && (
          <div className="vitals-tab">
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h3>Comprehensive Household Vitals</h3>
            </div>
            <div className="vitals-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {subjects.map(subject => (
                <div key={subject.id} className="glass-panel card">
                  <h4>{subject.name} <span style={{float:'right', fontSize:'0.8em', color:'var(--accent-color)'}}>{subject.status}</span></h4>
                  <p style={{fontSize:'0.8em', color:'gray', marginBottom: '15px'}}>{subject.type.toUpperCase()} | {subject.room}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}><Heart size={14} color="var(--danger-color)" /> <span style={{marginLeft: '5px'}}>{subject.heartRate} BPM</span></div>
                    <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}><Wind size={14} color="var(--accent-color)" /> <span style={{marginLeft: '5px'}}>{subject.breathingRate} RPM</span></div>
                    <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}><Activity size={14} color="#a855f7" /> <span style={{marginLeft: '5px'}}>{subject.hrv} HRV</span></div>
                    <div className="vital-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}><Thermometer size={14} color="var(--warning-color)" /> <span style={{marginLeft: '5px'}}>{subject.temp}°C</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Sleep' && (
          <div className="sleep-tab glass-panel card">
            <div className="section-header">
              <h3>Sleep Staging Analysis</h3>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Continuous monitoring of REM, Light, and Deep sleep cycles via respiration and micromovement analysis.</p>
            <div style={{ marginTop: '20px' }}>
              {subjects.filter(s => s.status === 'Sleeping' || s.status === 'Resting').map(subject => (
                <div key={subject.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '10px' }}>
                  <h4>{subject.name} - {subject.room}</h4>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    <div><span style={{ color: 'gray' }}>Est. Phase: </span><span style={{ color: 'var(--accent-color)' }}>Deep Sleep</span></div>
                    <div><span style={{ color: 'gray' }}>Duration: </span><span>4h 12m</span></div>
                    <div><span style={{ color: 'gray' }}>Efficiency: </span><span style={{ color: 'var(--success-color)' }}>92%</span></div>
                  </div>
                </div>
              ))}
              {subjects.filter(s => s.status === 'Sleeping' || s.status === 'Resting').length === 0 && (
                <p style={{ color: 'gray', padding: '20px', textAlign: 'center' }}>No subjects currently detected in sleeping or resting states.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Security' && (
          <div className="security-tab glass-panel card">
            <div className="section-header">
              <h3>Security & Perimeter Monitoring</h3>
              <button className="simulate-btn" onClick={simulateIntruder}><AlertTriangle size={16} /> Force Alert</button>
            </div>
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: 'var(--danger-color)', marginBottom: '10px' }}>Intrusion & Alert Log</h4>
              <div className="events-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map(event => (
                  <div key={event.id} className={`event-item ${event.type}`} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <span className="event-time" style={{ marginRight: '15px', minWidth: '80px', color: 'var(--accent-color)' }}>{event.time}</span>
                    <span className="event-msg">{event.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
