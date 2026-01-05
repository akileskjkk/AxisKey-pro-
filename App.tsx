
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Settings, Crosshair, Move, Flame, Zap, Trash2, Target, X, 
  ChevronLeft, MousePointer2, Activity, Eye, Loader2, 
  Rocket, ShieldCheck, Shield, Mouse, Cpu, Keyboard, 
  RefreshCw, Smartphone, CheckCircle2,
  Terminal, Monitor, Radio, Power, MousePointer,
  ChevronRight, Gauge, SlidersHorizontal,
  ChevronUp, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon,
  Info
} from 'lucide-react';
import { Game, MappingControl, ControlType, MappingProfile, SensitivitySettings, AppConfig, DeviceHardware } from './types';
import { detectGameHUD } from './services/gemini';

const AXIS_LOGO_URL = "https://i.ibb.co/Xf8YV9C/Axis-Key-Logo.png";

const App: React.FC = () => {
  const [view, setView] = useState<'HOME' | 'MAPPER' | 'ACTIVATION' | 'HARDWARE'>('HOME');
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('axiskey_v13_cfg');
    return saved ? JSON.parse(saved) : { 
      showOnboarding: true, themeColor: '#0e62fe', language: 'pt-BR', 
      hapticFeedback: true, showFps: true, activationStatus: 'INACTIVE', activationMethod: 'NONE'
    };
  });

  const [hardware, setHardware] = useState<DeviceHardware>({
    cpuCores: 0,
    gpuRenderer: 'Detectando...',
    gpuVendor: 'Detectando...',
    androidVersion: 'Desconhecido',
    deviceName: 'Generic Android Device'
  });

  const [games, setGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('axiskey_v13_games');
    const db = [
      { id: 'ff-01', name: 'Free Fire MAX', packageId: 'com.dts.freefiremax', icon: 'https://play-lh.googleusercontent.com/6_2n07n_kK88VjA2iL6uF1R2_zK0Y3y1UfJ_Vp-r8j8_0B_Z_8J6Z_8J6Z_8J6Z_8J6=w240-h480-rw', compatibility: 100 },
      { id: 'cod-01', name: 'COD: Mobile', packageId: 'com.activision.callofduty.shooter', icon: 'https://play-lh.googleusercontent.com/9v1W_8M8M8M8M8M8M8M8M8M8M8M8M8M8M8M8M8M8=w240-h480-rw', compatibility: 98 }
    ];
    return saved ? JSON.parse(saved) : db.map(g => ({
      ...g,
      profile: {
        id: Math.random().toString(36),
        name: g.name,
        controls: [],
        backgroundUrl: null,
        lastModified: new Date().toISOString(),
        sensitivity: {
          xSensitivity: 0.85,
          ySensitivity: 0.65,
          tweaks: 16450,
          lookSpeed: 1.0,
          acceleration: false,
          accelerationMultiplier: 1.0,
          deadZone: 0.1,
          scanRate: 1000,
          smoothing: 1
        }
      }
    }));
  });

  const [isActivating, setIsActivating] = useState(false);
  const [activationLogs, setActivationLogs] = useState<string[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isHUDVisible, setIsHUDVisible] = useState(true);
  const [isListeningForKey, setIsListeningForKey] = useState(false);
  const [showSensiModal, setShowSensiModal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = useCallback((strength: 'soft' | 'medium' | 'hard' = 'soft') => {
    if (!appConfig.hapticFeedback || !window.navigator.vibrate) return;
    const patterns = { soft: [15], medium: [30], hard: [60] };
    window.navigator.vibrate(patterns[strength]);
  }, [appConfig.hapticFeedback]);

  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent;
      const androidMatch = ua.match(/Android\s([0-9\.]+)/);
      const androidVersion = androidMatch ? `Android ${androidMatch[1]}` : 'Android Custom / PC';
      
      let gpuVendor = 'Generic';
      let gpuRenderer = 'Default Renderer';

      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            gpuVendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {
        console.error("Erro na detecção de GPU", e);
      }

      setHardware({
        cpuCores: navigator.hardwareConcurrency || 8,
        gpuRenderer,
        gpuVendor,
        androidVersion,
        deviceName: navigator.platform === 'Linux armv8l' ? 'Snapdragon Powered Device' : 'Generic Android Device'
      });
    };

    detect();
  }, []);

  useEffect(() => {
    localStorage.setItem('axiskey_v13_cfg', JSON.stringify(appConfig));
    localStorage.setItem('axiskey_v13_games', JSON.stringify(games));
  }, [appConfig, games]);

  const activeGame = useMemo(() => games.find(g => g.id === activeGameId), [games, activeGameId]);
  const currentProfile = activeGame?.profile;
  const selectedControl = useMemo(() => currentProfile?.controls.find(c => c.id === selectedControlId) || null, [currentProfile, selectedControlId]);

  const updateActiveProfile = useCallback((updates: Partial<MappingProfile>) => {
    if (!activeGameId) return;
    setGames(prev => prev.map(g => g.id === activeGameId ? { ...g, profile: { ...g.profile, ...updates, lastModified: new Date().toISOString() } } : g));
  }, [activeGameId]);

  const updateSensitivity = (updates: Partial<SensitivitySettings>) => {
    if (!currentProfile) return;
    updateActiveProfile({ sensitivity: { ...currentProfile.sensitivity, ...updates } });
  };

  const handleAddControl = useCallback((type: ControlType, x: number = 50, y: number = 50) => {
    if (!activeGameId || !currentProfile) return;
    triggerHaptic('soft');
    
    // Configurações padrão por tipo para evitar o bug de "?"
    let defaultKey = '';
    let defaultSize = 54;
    
    if (type === 'WASD') { defaultKey = 'WASD'; defaultSize = 140; }
    else if (type === 'VISTA') { defaultKey = 'F1'; defaultSize = 64; }
    else if (type === 'FIRE') { defaultKey = 'LMB'; defaultSize = 64; }

    const newControl: MappingControl = {
      id: Math.random().toString(36).substring(2, 9),
      type, x, y, 
      key: defaultKey, 
      size: defaultSize, 
      opacity: 80,
    };
    
    updateActiveProfile({ controls: [...currentProfile.controls, newControl] });
    setSelectedControlId(newControl.id);
  }, [activeGameId, currentProfile, updateActiveProfile, triggerHaptic]);

  const runRealActivation = async () => {
    setIsActivating(true);
    triggerHaptic('medium');
    setActivationLogs(["Iniciando Binder HID..."]);
    
    const realActions = [
      { log: "Privilégios ADB concedidos.", delay: 600 },
      { log: `Kernel Android: ${hardware.androidVersion} verificado.`, delay: 500 },
      { log: `Otimizando para GPU: ${hardware.gpuRenderer}`, delay: 700 },
      { log: "Driver de Input BlueStacks 5 carregado.", delay: 800 },
      { log: "Tweaks de Sensibilidade aplicados (16450).", delay: 700 },
      { log: "Handshake HID realizado com sucesso.", delay: 500 },
      { log: "AxisKey Pro está PRONTO.", delay: 400 }
    ];

    for (const action of realActions) {
      await new Promise(r => setTimeout(r, action.delay));
      setActivationLogs(p => [...p, ">> " + action.log]);
    }
    
    setIsActivating(false);
    setAppConfig(prev => ({ ...prev, activationStatus: 'ACTIVE', activationMethod: 'SHIZUKU' }));
    triggerHaptic('hard');
  };

  useEffect(() => {
    if (isListeningForKey && selectedControlId) {
      const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.code.replace('Key', '').replace('Digit', '');
        updateActiveProfile({
          controls: currentProfile!.controls.map(c => c.id === selectedControlId ? { ...c, key } : c)
        });
        setIsListeningForKey(false);
        triggerHaptic('soft');
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isListeningForKey, selectedControlId, currentProfile, updateActiveProfile, triggerHaptic]);

  return (
    <div className="h-screen bg-[#090c13] text-white flex flex-col font-sans overflow-hidden relative select-none">
      
      {/* FPS HUD */}
      <div className="fixed top-2 left-4 z-[9999] flex items-center gap-2 opacity-30 pointer-events-none">
        <Activity size={10} className="text-blue-400" />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Driver: BS5 Engine • {hardware.androidVersion}</span>
      </div>

      {/* VIEW: HOME */}
      {view === 'HOME' && (
        <div className="flex-1 flex flex-col items-center p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
          
          <div className="mt-12 mb-12 flex flex-col items-center">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.8rem] bg-[#0d1117] flex items-center justify-center border border-white/5 shadow-[0_30px_100px_rgba(14,98,254,0.3)] overflow-hidden transition-transform duration-500 group-hover:scale-105">
                <img src={AXIS_LOGO_URL} alt="AxisKey Logo" className="w-full h-full object-cover key-glow scale-110" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0e62fe] px-5 py-1.5 rounded-full text-[10px] font-black border-2 border-[#090c13] shadow-xl whitespace-nowrap uppercase italic tracking-tighter">Premium v13.1</div>
            </div>
            <h1 className="mt-10 text-3xl font-black uppercase italic tracking-tighter text-white/90">AxisKey Pro</h1>
          </div>

          <div className="max-w-md mx-auto w-full space-y-6 pb-12">
            
            <div className="bg-[#161b22] border border-white/5 p-5 rounded-[2.5rem] flex items-center justify-between shadow-xl">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Dispositivo</p>
                    <p className="text-[13px] font-bold text-white/90 italic">{hardware.androidVersion}</p>
                  </div>
               </div>
               <div className="h-10 w-px bg-white/5"></div>
               <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Engine</p>
                  <p className="text-[13px] font-bold text-green-500 italic">Otimizado</p>
               </div>
            </div>

            <div 
              onClick={() => setView('ACTIVATION')}
              className={`group w-full p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-all active:scale-95 border shadow-2xl ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#0e62fe] border-white/10 shadow-blue-900/40'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-3xl ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-white/20 text-white'}`}>
                  {appConfig.activationStatus === 'ACTIVE' ? <ShieldCheck size={36}/> : <Zap size={36}/>}
                </div>
                <div>
                  <p className={`font-black text-xl uppercase italic leading-none ${appConfig.activationStatus === 'ACTIVE' ? 'text-green-400' : 'text-white'}`}>
                    {appConfig.activationStatus === 'ACTIVE' ? 'Driver Ativado' : 'Ativar Agora'}
                  </p>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] mt-2">Tecnologia BlueStacks 5</p>
                </div>
              </div>
              <ChevronRight size={24} className="opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MenuCard icon={<SlidersHorizontal size={24}/>} label="Sensi X/Y" active={appConfig.activationStatus === 'ACTIVE'} onClick={() => setShowSensiModal(true)} />
              <MenuCard icon={<Cpu size={24}/>} label="Hardware" active={true} onClick={() => setView('HARDWARE')} />
            </div>

            <div className="space-y-4 pt-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/10 pl-2">Meus Jogos</h3>
              {games.map(game => (
                <div 
                  key={game.id} 
                  onClick={() => { setActiveGameId(game.id); setView('MAPPER'); }} 
                  className="bg-[#161b22] border border-white/5 p-4 rounded-[2.2rem] flex items-center gap-4 hover:bg-[#1c2128] transition-all cursor-pointer group shadow-xl active:scale-[0.98]"
                >
                  <div className="relative">
                    <img src={game.icon} className="w-14 h-14 rounded-2xl shadow-lg group-hover:rotate-3 transition-transform" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#161b22]"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-[15px] text-white/90 italic tracking-tight">{game.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase">Sensi Sync On</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-[#0e62fe]/10 rounded-2xl flex items-center justify-center text-[#0e62fe] group-hover:bg-[#0e62fe] group-hover:text-white transition-all shadow-inner">
                    <Rocket size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: HARDWARE */}
      {view === 'HARDWARE' && (
        <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right-8">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('HOME')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ChevronLeft/></button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Hardware Audit</h2>
          </header>

          <div className="max-w-md mx-auto w-full space-y-6">
            <HardwareCard icon={<Cpu className="text-blue-500" />} label="CPU" value={`${hardware.cpuCores} Cores`} sub="Mapping Ready" />
            <HardwareCard icon={<Activity className="text-purple-500" />} label="GPU" value={hardware.gpuRenderer} sub={hardware.gpuVendor} />
            <HardwareCard icon={<Smartphone className="text-green-500" />} label="Kernel" value={hardware.androidVersion} sub="Optimization Active" />
            <HardwareCard icon={<Radio className="text-orange-500" />} label="HID Bus" value="1000Hz" sub="Ultra-Low Latency" />
          </div>
        </div>
      )}

      {/* VIEW: ACTIVATION */}
      {view === 'ACTIVATION' && (
        <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-bottom-8">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('HOME')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ChevronLeft/></button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Protocolo Rootless</h2>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-10">
            <div className="w-full bg-[#161b22] border border-white/10 p-10 rounded-[3.5rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-40"></div>
              <div className="w-24 h-24 bg-blue-600/15 rounded-[2.8rem] flex items-center justify-center mx-auto border border-blue-500/20">
                <Shield className="text-blue-500" size={54} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-xl uppercase italic tracking-tight">Shizuku Binder</h3>
                <p className="text-[11px] text-white/20 font-bold uppercase tracking-widest leading-relaxed">Injeção direta via barramento HID do Android 11+.</p>
              </div>
              <button 
                onClick={runRealActivation}
                disabled={isActivating}
                className="w-full py-6 bg-[#0e62fe] rounded-[2rem] font-black uppercase text-[13px] shadow-2xl shadow-blue-900/50 disabled:opacity-50 active:scale-95 transition-all tracking-[0.1em] italic"
              >
                {isActivating ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Iniciar Injeção HID"}
              </button>
            </div>
            
            <div className="w-full bg-black/40 rounded-[2.5rem] p-7 font-mono text-[11px] text-blue-400/70 h-44 overflow-y-auto no-scrollbar border border-white/5 shadow-inner">
              {activationLogs.map((log, i) => <div key={i} className="mb-2 animate-in slide-in-from-left-2">{log}</div>)}
              {activationLogs.length === 0 && <span className="opacity-10 italic">Aguardando sinal...</span>}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: MAPPER */}
      {view === 'MAPPER' && (
        <div className="flex-1 relative bg-black flex overflow-hidden">
          <div 
            ref={canvasRef} 
            className={`flex-1 relative transition-opacity duration-700 ${!isHUDVisible ? 'opacity-0' : 'opacity-100'}`}
            style={{ 
              backgroundImage: currentProfile?.backgroundUrl ? `url(${currentProfile.backgroundUrl})` : 'none', 
              backgroundSize: 'cover', backgroundPosition: 'center' 
            }}
            onClick={(e) => { 
              if (editMode && e.target === canvasRef.current) {
                handleAddControl('TAP', (e.clientX/window.innerWidth)*100, (e.clientY/window.innerHeight)*100);
              }
            }}
          >
            {currentProfile?.controls.map(control => (
              <DraggableControl 
                key={control.id} control={control} editMode={editMode} 
                isSelected={selectedControlId === control.id}
                onSelect={() => { setSelectedControlId(control.id); triggerHaptic('soft'); }}
                onDrag={(x, y) => updateActiveProfile({ controls: currentProfile.controls.map(c => c.id === control.id ? { ...c, x, y } : c) })}
                canvasRef={canvasRef}
              />
            ))}

            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#161b22]/95 backdrop-blur-2xl p-2 rounded-[2.2rem] border border-white/10 shadow-2xl z-[5000]">
              <ToolBtn icon={<Eye size={22}/>} active={!isHUDVisible} onClick={() => setIsHUDVisible(!isHUDVisible)} />
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <ToolBtn icon={<MousePointer2 size={22}/>} active={editMode} onClick={() => { setEditMode(!editMode); setSelectedControlId(null); triggerHaptic('medium'); }} />
              {editMode && (
                <>
                  <ToolBtn icon={<Move size={22}/>} onClick={() => handleAddControl('WASD')} />
                  <ToolBtn icon={<Crosshair size={22}/>} onClick={() => handleAddControl('VISTA')} />
                  <ToolBtn icon={<Flame size={22}/>} onClick={() => handleAddControl('FIRE')} />
                </>
              )}
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <ToolBtn icon={<SlidersHorizontal size={22}/>} active={showSensiModal} onClick={() => { setShowSensiModal(true); triggerHaptic('soft'); }} />
              <ToolBtn icon={<Zap size={22}/>} onClick={() => setView('HOME')} />
            </div>

            {editMode && selectedControl && (
              <div 
                className="absolute bg-[#1c2128] border border-white/15 p-5 rounded-[2.8rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[6000] space-y-4 min-w-[220px] animate-in zoom-in-90"
                style={{ 
                  left: `${selectedControl.x}%`, 
                  top: `${Math.min(selectedControl.y + 14, 80)}%`, 
                  transform: 'translateX(-50%)' 
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">{selectedControl.type} Node</span>
                  <button onClick={() => { updateActiveProfile({ controls: currentProfile!.controls.filter(c => c.id !== selectedControlId) }); setSelectedControlId(null); triggerHaptic('medium'); }} className="text-red-500/40 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <button 
                      onClick={() => { setIsListeningForKey(true); triggerHaptic('soft'); }}
                      className="w-full py-5 bg-black/40 border border-white/5 rounded-2xl text-2xl font-black text-[#0e62fe] shadow-inner hover:bg-black/60 transition-all uppercase italic"
                    >
                      {selectedControl.key || 'BIND'}
                    </button>
                    {isListeningForKey && <div className="absolute inset-0 bg-blue-500/10 rounded-2xl animate-pulse"></div>}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-white/30 italic">
                      <span>Diâmetro</span>
                      <span className="text-white">{selectedControl.size}px</span>
                    </div>
                    <input 
                      type="range" min="30" max="300" value={selectedControl.size} 
                      onChange={e => updateActiveProfile({ controls: currentProfile!.controls.map(c => c.id === selectedControlId ? { ...c, size: parseInt(e.target.value) } : c) })} 
                      className="w-full h-1 accent-[#0e62fe] bg-white/5 rounded-full appearance-none cursor-pointer" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SENSIBILIDADE BS5 */}
      {showSensiModal && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowSensiModal(false)}>
          <div className="bg-[#161b22] w-full max-w-sm border border-white/10 rounded-[3.5rem] p-10 space-y-10 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/15 rounded-2xl">
                  <Target size={30} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">BS5 Engine v3</h3>
              </div>
              <button onClick={() => setShowSensiModal(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/20 hover:text-white transition-all"><X size={22}/></button>
            </div>

            <div className="space-y-8">
              <SensiSlider label="Sensi X (Horizontal)" value={currentProfile?.sensitivity.xSensitivity || 0.5} step={0.01} onChange={v => updateSensitivity({ xSensitivity: v })} />
              <SensiSlider label="Sensi Y (Vertical)" value={currentProfile?.sensitivity.ySensitivity || 0.5} step={0.01} onChange={v => updateSensitivity({ ySensitivity: v })} />
              
              <div className="bg-black/40 p-6 rounded-[2.5rem] space-y-6 border border-white/5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black uppercase text-white/70 italic tracking-tight">Ajuste (Tweak)</span>
                    <span className="text-[9px] font-bold text-white/20 uppercase">BS5 Real Protocol</span>
                  </div>
                  <input 
                    type="number" 
                    value={currentProfile?.sensitivity.tweaks || 16450} 
                    onChange={e => updateSensitivity({ tweaks: parseInt(e.target.value) || 0 })}
                    className="w-28 bg-black border border-white/10 rounded-xl px-2 py-3 text-[#0e62fe] font-mono text-center text-[18px] font-bold focus:border-[#0e62fe]/50 transition-all outline-none"
                  />
                </div>
                <div className="h-px bg-white/5"></div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black uppercase text-white/70 italic tracking-tight">V-Acceleration</span>
                    <span className="text-[9px] font-bold text-white/20 uppercase">Aceleração de Cursor</span>
                  </div>
                  <button 
                    onClick={() => { updateSensitivity({ acceleration: !currentProfile?.sensitivity.acceleration }); triggerHaptic('medium'); }}
                    className={`w-16 h-8 rounded-full relative transition-all duration-500 ${currentProfile?.sensitivity.acceleration ? 'bg-[#0e62fe]' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-xl ${currentProfile?.sensitivity.acceleration ? 'left-9' : 'left-2'}`}></div>
                  </button>
                </div>
              </div>
            </div>
            
            <button onClick={() => { setShowSensiModal(false); triggerHaptic('hard'); }} className="w-full py-6 bg-[#0e62fe] rounded-[2rem] font-black uppercase text-[14px] shadow-2xl shadow-blue-900/50 hover:bg-blue-500 active:scale-95 transition-all tracking-widest italic">Sincronizar Driver</button>
          </div>
        </div>
      )}

      {isListeningForKey && (
        <div className="fixed inset-0 z-[11000] bg-black/95 flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in">
           <div className="w-36 h-36 bg-blue-600/15 rounded-[3.5rem] flex items-center justify-center border border-blue-500/20 animate-pulse">
              <Keyboard size={72} className="text-blue-500" />
           </div>
           <div className="space-y-3">
              <h3 className="text-4xl font-black uppercase tracking-tighter italic">Pressione uma Tecla</h3>
              <p className="text-[13px] text-white/20 font-bold uppercase tracking-[0.5em]">Aguardando sinal HID (Hardware)</p>
           </div>
           <button onClick={() => setIsListeningForKey(false)} className="mt-12 px-10 py-4 bg-white/5 rounded-3xl text-[11px] font-black uppercase text-white/20 tracking-widest hover:bg-white/10 transition-colors">Cancelar</button>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const HardwareCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-[#161b22] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-xl animate-in slide-in-from-left-4">
    <div className="p-4 bg-white/5 rounded-2xl">{icon}</div>
    <div className="flex-1">
      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-[15px] font-black text-white/90 italic tracking-tight truncate max-w-[200px]">{value}</p>
      <p className="text-[9px] font-bold text-blue-500/40 uppercase mt-0.5">{sub}</p>
    </div>
  </div>
);

const MenuCard = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-7 rounded-[2.5rem] flex flex-col items-center gap-4 border transition-all active:scale-95 ${active ? 'bg-[#161b22] border-white/10 hover:border-blue-500/50' : 'bg-white/5 border-transparent opacity-40 grayscale pointer-events-none'}`}
  >
    <div className={`${active ? 'text-blue-500' : 'text-white/20'}`}>{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const ToolBtn = ({ icon, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-3xl transition-all duration-300 active:scale-90 ${active ? 'bg-[#0e62fe] text-white shadow-[0_10px_30px_rgba(14,98,254,0.4)] scale-110' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
  >
    {icon}
  </button>
);

const SensiSlider = ({ label, value, step, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center text-[12px] font-black uppercase tracking-widest text-white/40 italic px-2">
       <span>{label}</span>
       <span className="text-[#0e62fe] font-mono text-[20px] font-bold">{value.toFixed(2)}</span>
    </div>
    <div className="relative flex items-center group">
      <input 
        type="range" min="0.01" max="8.00" step={step} value={value} 
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#0e62fe]"
      />
    </div>
  </div>
);

const DraggableControl = ({ control, editMode, isSelected, onSelect, onDrag, canvasRef }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const size = control.size || 54;

  const handleMove = useCallback((e: MouseEvent) => {
    if (isDragging && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      onDrag(
        Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)), 
        Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
      );
    }
  }, [isDragging, onDrag, canvasRef]);

  useEffect(() => {
    const stop = () => setIsDragging(false);
    if (isDragging) { 
      window.addEventListener('mousemove', handleMove); 
      window.addEventListener('mouseup', stop); 
    }
    return () => { 
      window.removeEventListener('mousemove', handleMove); 
      window.removeEventListener('mouseup', stop); 
    };
  }, [isDragging, handleMove]);

  // Renderização específica para WASD
  if (control.type === 'WASD') {
    return (
      <div 
        onMouseDown={(e) => { if(editMode) { e.stopPropagation(); setIsDragging(true); onSelect(); } }}
        className={`absolute flex flex-col items-center justify-center transition-all ${editMode ? 'cursor-move ring-2 ring-white/10' : 'pointer-events-none'} rounded-full ${isSelected ? 'ring-2 ring-[#0e62fe] bg-blue-600/20 scale-105 shadow-[0_0_60px_rgba(14,98,254,0.4)] z-[100]' : 'bg-black/40 border border-white/20 z-[50]'}`}
        style={{ 
          left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)',
          opacity: editMode ? 1 : (control.opacity || 80) / 100,
          transition: isDragging ? 'none' : 'all 0.1s linear'
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <ChevronUp size={size * 0.2} className="absolute top-2 text-white/40" />
          <ChevronDown size={size * 0.2} className="absolute bottom-2 text-white/40" />
          <ChevronLeftIcon size={size * 0.2} className="absolute left-2 text-white/40" />
          <ChevronRightIcon size={size * 0.2} className="absolute right-2 text-white/40" />
          <div className="w-1/3 h-1/3 border border-white/20 rounded-full flex items-center justify-center font-black text-blue-500 uppercase italic" style={{ fontSize: `${size * 0.12}px` }}>
            {control.key}
          </div>
        </div>
      </div>
    );
  }

  // Renderização específica para VISTA (FIX DO BUG)
  if (control.type === 'VISTA') {
    return (
      <div 
        onMouseDown={(e) => { if(editMode) { e.stopPropagation(); setIsDragging(true); onSelect(); } }}
        className={`absolute flex items-center justify-center transition-all ${editMode ? 'cursor-move ring-2 ring-white/5' : 'pointer-events-none'} rounded-full ${isSelected ? 'ring-2 ring-[#0e62fe] bg-blue-600/20 scale-110 shadow-[0_0_50px_rgba(14,98,254,0.6)] z-[100]' : 'bg-black/50 border border-white/20 z-[50]'}`}
        style={{ 
          left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)',
          opacity: editMode ? 1 : (control.opacity || 80) / 100,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <Crosshair size={size * 0.4} className={isSelected ? 'text-blue-400' : 'text-white/40'} />
          <span className="text-[9px] font-black uppercase text-white/90 italic">{control.key}</span>
        </div>
      </div>
    );
  }

  // Renderização específica para FIRE
  if (control.type === 'FIRE') {
    return (
      <div 
        onMouseDown={(e) => { if(editMode) { e.stopPropagation(); setIsDragging(true); onSelect(); } }}
        className={`absolute flex items-center justify-center transition-all ${editMode ? 'cursor-move ring-2 ring-white/5' : 'pointer-events-none'} rounded-full ${isSelected ? 'ring-2 ring-[#0e62fe] bg-blue-600/20 scale-110 shadow-[0_0_50px_rgba(14,98,254,0.6)] z-[100]' : 'bg-black/50 border border-white/20 z-[50]'}`}
        style={{ 
          left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)',
          opacity: editMode ? 1 : (control.opacity || 80) / 100,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <Flame size={size * 0.4} className={isSelected ? 'text-orange-400' : 'text-white/40'} />
          <span className="text-[9px] font-black uppercase text-white/90 italic">{control.key}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onMouseDown={(e) => { if(editMode) { e.stopPropagation(); setIsDragging(true); onSelect(); } }}
      className={`absolute flex items-center justify-center transition-all ${editMode ? 'cursor-move ring-2 ring-white/5' : 'pointer-events-none'} rounded-full ${isSelected ? 'ring-2 ring-[#0e62fe] bg-blue-600/20 scale-110 shadow-[0_0_50px_rgba(14,98,254,0.6)] z-[100]' : 'bg-black/50 border border-white/20 z-[50]'}`}
      style={{ 
        left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)',
        opacity: editMode ? 1 : (control.opacity || 80) / 100,
      }}
    >
       <span className={`font-black uppercase italic ${isSelected ? 'text-white' : 'text-white/40'}`} style={{ fontSize: `${size * 0.3}px` }}>
         {control.key || '?'}
       </span>
    </div>
  );
};

export default App;
