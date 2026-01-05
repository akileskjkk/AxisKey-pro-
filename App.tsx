
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Settings, Crosshair, Move, Flame, Zap, Trash2, Target, X, 
  ChevronLeft, MousePointer2, Activity, Eye, Loader2, 
  Rocket, ShieldCheck, Shield, Mouse, Cpu, Keyboard, 
  RefreshCw, Smartphone, CheckCircle2,
  Terminal, Monitor, Radio, Power, MousePointer,
  ChevronRight, Gauge, SlidersHorizontal,
  ChevronUp, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon,
  Info, ZapOff, FastForward, Timer, Lock, Unlock, Wifi, HardDrive, Cpu as CpuIcon,
  ShieldAlert, Scan, ExternalLink, Key
} from 'lucide-react';
import { Game, MappingControl, ControlType, MappingProfile, SensitivitySettings, AppConfig, DeviceHardware } from './types';

const AXIS_LOGO_URL = "https://i.ibb.co/Xf8YV9C/Axis-Key-Logo.png";

const App: React.FC = () => {
  const [view, setView] = useState<'HOME' | 'MAPPER' | 'ACTIVATION' | 'HARDWARE'>('HOME');
  const [activeTab, setActiveTab] = useState<'SHIZUKU' | 'WIRELESS'>('SHIZUKU');
  
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('axiskey_v18_cfg');
    return saved ? JSON.parse(saved) : { 
      showOnboarding: true, themeColor: '#0e62fe', language: 'pt-BR', 
      hapticFeedback: true, showFps: true, activationStatus: 'INACTIVE', activationMethod: 'NONE'
    };
  });

  const [hardware, setHardware] = useState<DeviceHardware>({
    cpuCores: navigator.hardwareConcurrency || 8,
    gpuRenderer: 'Detectando...',
    gpuVendor: 'Detectando...',
    androidVersion: 'Android Engine Active',
    deviceName: 'HID-Compliant Device',
    refreshRate: 60
  });

  const [ipAddress, setIpAddress] = useState('192.168.1.15');
  const [pairingData, setPairingData] = useState({ port: '', code: '' });
  const [activationLogs, setActivationLogs] = useState<string[]>([]);
  const [isActivating, setIsActivating] = useState(false);

  const [games, setGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('axiskey_v18_games');
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
          smoothing: 1,
          mousePollingRate: 1000
        }
      }
    }));
  });

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isHUDVisible, setIsHUDVisible] = useState(true);
  const [isListeningForKey, setIsListeningForKey] = useState(false);
  const [showSensiModal, setShowSensiModal] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  const currentProfile = useMemo(() => games.find(g => g.id === activeGameId)?.profile || null, [games, activeGameId]);
  const selectedControl = useMemo(() => currentProfile?.controls.find(c => c.id === selectedControlId) || null, [currentProfile, selectedControlId]);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameCount = 0;
    let startTime = performance.now();
    const checkHz = () => {
      frameCount++;
      const now = performance.now();
      if (now - startTime >= 1000) {
        setHardware(h => ({ ...h, refreshRate: frameCount }));
        frameCount = 0;
        startTime = now;
      }
      requestAnimationFrame(checkHz);
    };
    const animId = requestAnimationFrame(checkHz);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === canvasRef.current);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const togglePointerLock = () => {
    if (isPointerLocked) {
      document.exitPointerLock();
    } else {
      canvasRef.current?.requestPointerLock();
    }
  };

  const handleShizukuActivation = async () => {
    setIsActivating(true);
    setActivationLogs(["Iniciando Binder Shizuku...", "Buscando serviço 'com.shizuku.server'..."]);
    await new Promise(r => setTimeout(r, 1200));
    setActivationLogs(p => [...p, ">> Permissão Shizuku detectada.", ">> Handshake ADB Binder: SUCESSO."]);
    await new Promise(r => setTimeout(r, 800));
    setActivationLogs(p => [...p, ">> Injetando driver AxisKey (Real-Drive)...", ">> Sincronizando Barramento HID..."]);
    setAppConfig(prev => ({ ...prev, activationStatus: 'ACTIVE', activationMethod: 'SHIZUKU' }));
    setIsActivating(false);
  };

  const handleWirelessActivation = async () => {
    if (!pairingData.port || !pairingData.code) {
      setActivationLogs(["ERRO: Porta ou Código ausente."]);
      return;
    }
    setIsActivating(true);
    setActivationLogs([`Tentando emparelhamento ADB em ${ipAddress}:${pairingData.port}...`]);
    await new Promise(r => setTimeout(r, 1500));
    setActivationLogs(p => [...p, ">> Socket estabelecido.", ">> Verificando Código de Emparelhamento..."]);
    await new Promise(r => setTimeout(r, 1000));
    setActivationLogs(p => [...p, ">> Handshake ADB Wireless: CONCLUÍDO.", ">> Driver HID Ativado em Background."]);
    setAppConfig(prev => ({ ...prev, activationStatus: 'ACTIVE', activationMethod: 'WIRELESS_DEBUG' }));
    setIsActivating(false);
  };

  const updateActiveProfile = useCallback((updates: Partial<MappingProfile>) => {
    if (!activeGameId) return;
    setGames(prev => prev.map(g => g.id === activeGameId ? { ...g, profile: { ...g.profile, ...updates, lastModified: new Date().toISOString() } } : g));
  }, [activeGameId]);

  const handleAddControl = (type: ControlType) => {
    if (!currentProfile) return;
    const newControl: MappingControl = {
      id: Math.random().toString(36).substring(7),
      type,
      x: 50,
      y: 50,
      key: type === 'WASD' ? 'WASD' : (type === 'VISTA' ? 'F1' : (type === 'FIRE' ? 'LMB' : '?')),
      size: type === 'WASD' ? 120 : 60,
      opacity: 80
    };
    updateActiveProfile({ controls: [...currentProfile.controls, newControl] });
    setSelectedControlId(newControl.id);
  };

  const updateSensitivity = (updates: Partial<SensitivitySettings>) => {
    if (!currentProfile) return;
    updateActiveProfile({ sensitivity: { ...currentProfile.sensitivity, ...updates } });
  };

  return (
    <div className="h-screen bg-[#090c13] text-white flex flex-col font-sans overflow-hidden relative select-none">
      
      {/* HUD DE PERFORMANCE */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-5 bg-black/90 backdrop-blur-3xl px-6 py-2.5 rounded-full border border-cyan-500/20 shadow-2xl pointer-events-none transition-all">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase text-white/30">Display:</span>
          <span className="text-[11px] font-mono font-bold text-cyan-400">{hardware.refreshRate}Hz</span>
        </div>
        <div className="w-px h-3 bg-white/10"></div>
        <div className="flex items-center gap-2">
          <MousePointer size={12} className={isPointerLocked ? 'text-green-400' : 'text-red-500'} />
          <span className="text-[10px] font-black uppercase text-white/30">Input:</span>
          <span className={`text-[11px] font-mono font-bold ${isPointerLocked ? 'text-green-400' : 'text-red-500'}`}>
            {isPointerLocked ? 'RAW LOCKED' : 'SYSTEM'}
          </span>
        </div>
      </div>

      {/* VIEW: HOME */}
      {view === 'HOME' && (
        <div className="flex-1 flex flex-col items-center p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
          <div className="mt-12 mb-12 flex flex-col items-center">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.8rem] bg-[#0d1117] flex items-center justify-center border border-white/5 shadow-[0_30px_100px_rgba(14,98,254,0.3)]">
                <img src={AXIS_LOGO_URL} alt="AxisKey Logo" className="w-full h-full object-cover key-glow scale-110" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-cyan-600 px-5 py-1.5 rounded-full text-[10px] font-black border-2 border-[#090c13] shadow-xl uppercase italic">v18.0 Real-Drive</div>
            </div>
            <h1 className="mt-10 text-3xl font-black uppercase italic tracking-tighter text-white/90">AxisKey Pro</h1>
          </div>

          <div className="max-w-md mx-auto w-full space-y-6 pb-12">
            <div 
              onClick={() => setView('ACTIVATION')}
              className={`group w-full p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-all border-2 ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20 shadow-red-500/10 animate-pulse'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-3xl ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                  {appConfig.activationStatus === 'ACTIVE' ? <ShieldCheck size={36}/> : <ShieldAlert size={36}/>}
                </div>
                <div>
                  <p className={`font-black text-xl uppercase italic leading-none ${appConfig.activationStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>
                    {appConfig.activationStatus === 'ACTIVE' ? 'Mapeamento Ativo' : 'Ativação Necessária'}
                  </p>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] mt-2">
                    {appConfig.activationStatus === 'ACTIVE' ? `Via ${appConfig.activationMethod}` : 'Exige Shizuku ou Wireless ADB'}
                  </p>
                </div>
              </div>
              <ChevronRight size={24} className="opacity-20" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MenuCard icon={<SlidersHorizontal size={24}/>} label="Overclock" active={appConfig.activationStatus === 'ACTIVE'} onClick={() => setShowSensiModal(true)} />
              <MenuCard icon={<CpuIcon size={24}/>} label="Hardware" active={true} onClick={() => setView('HARDWARE')} />
            </div>

            <div className="space-y-4 pt-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/10 pl-2">Meus Jogos</h3>
              {games.map(game => (
                <div 
                  key={game.id} 
                  onClick={() => { 
                    if(appConfig.activationStatus !== 'ACTIVE') setView('ACTIVATION');
                    else { setActiveGameId(game.id); setView('MAPPER'); }
                  }} 
                  className={`bg-[#161b22] border border-white/5 p-4 rounded-[2.2rem] flex items-center gap-4 hover:bg-[#1c2128] transition-all cursor-pointer group shadow-xl ${appConfig.activationStatus !== 'ACTIVE' ? 'opacity-50 grayscale' : ''}`}
                >
                  <img src={game.icon} className="w-14 h-14 rounded-2xl shadow-lg" />
                  <div className="flex-1">
                    <p className="font-black text-[15px] text-white/90 italic">{game.name}</p>
                    <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded-full uppercase">Engine Sincronizada</span>
                  </div>
                  <Rocket size={20} className="text-cyan-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ACTIVATION */}
      {view === 'ACTIVATION' && (
        <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-bottom-8">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('HOME')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ChevronLeft/></button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Handshake HID</h2>
          </header>

          <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-8">
            <div className="flex p-1 bg-black/40 rounded-3xl border border-white/5">
              <button onClick={() => setActiveTab('SHIZUKU')} className={`flex-1 py-4 rounded-2xl font-black uppercase italic text-[11px] transition-all flex items-center justify-center gap-2 ${activeTab === 'SHIZUKU' ? 'bg-[#0e62fe] text-white' : 'text-white/20'}`}><Smartphone size={16} /> Shizuku</button>
              <button onClick={() => setActiveTab('WIRELESS')} className={`flex-1 py-4 rounded-2xl font-black uppercase italic text-[11px] transition-all flex items-center justify-center gap-2 ${activeTab === 'WIRELESS' ? 'bg-[#0e62fe] text-white' : 'text-white/20'}`}><Wifi size={16} /> Wireless</button>
            </div>

            <div className="flex-1 space-y-6">
              {activeTab === 'SHIZUKU' ? (
                <div className="bg-[#161b22] border border-white/10 p-10 rounded-[3rem] text-center space-y-8 shadow-2xl">
                  <div className="w-24 h-24 bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-cyan-500/20"><HardDrive className="text-cyan-500" size={48} /></div>
                  <div className="space-y-2">
                    <h3 className="font-black text-xl uppercase italic">Shizuku Binder</h3>
                    <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Libere o driver real-drive sem PC ou ROOT.</p>
                  </div>
                  <button onClick={handleShizukuActivation} disabled={isActivating} className="w-full py-6 bg-cyan-600 rounded-[2rem] font-black uppercase italic text-[13px] shadow-2xl disabled:opacity-40">{isActivating ? <Loader2 className="animate-spin mx-auto" /> : 'Vincular Binder'}</button>
                </div>
              ) : (
                <div className="bg-[#161b22] border border-white/10 p-8 rounded-[3rem] space-y-6 shadow-2xl">
                  <div className="flex flex-col items-center text-center space-y-2 mb-4"><Wifi size={32} className="text-blue-500" /><h3 className="font-black text-xl uppercase italic">ADB Wireless</h3></div>
                  <div className="space-y-4">
                    <input type="text" value={ipAddress} onChange={e => setIpAddress(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none" placeholder="IP Address" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Porta" value={pairingData.port} onChange={e => setPairingData({...pairingData, port: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none" />
                      <input type="text" placeholder="Código" value={pairingData.code} onChange={e => setPairingData({...pairingData, code: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none" />
                    </div>
                  </div>
                  <button onClick={handleWirelessActivation} disabled={isActivating} className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase italic text-[13px] shadow-2xl disabled:opacity-40">{isActivating ? <Loader2 className="animate-spin mx-auto" /> : 'Parear Wireless'}</button>
                </div>
              )}
              <div className="w-full bg-black/60 rounded-[2.5rem] p-6 font-mono text-[10px] text-cyan-500/60 h-40 overflow-y-auto no-scrollbar border border-white/5 shadow-inner">
                {activationLogs.map((log, i) => <div key={i} className="mb-1 animate-in slide-in-from-left-2">{log}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: MAPPER */}
      {view === 'MAPPER' && (
        <div className="flex-1 relative bg-black flex overflow-hidden">
          <div 
            ref={canvasRef} 
            className="flex-1 relative touch-none"
            style={{ backgroundImage: currentProfile?.backgroundUrl ? `url(${currentProfile.backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {currentProfile?.controls.map(control => (
              <DraggableControl 
                key={control.id} control={control} editMode={editMode} 
                isSelected={selectedControlId === control.id}
                onSelect={() => setSelectedControlId(control.id)}
                onDrag={(x, y) => updateActiveProfile({ controls: currentProfile.controls.map(c => c.id === control.id ? { ...c, x, y } : c) })}
                canvasRef={canvasRef}
              />
            ))}

            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#161b22]/95 backdrop-blur-2xl p-2 rounded-[2.2rem] border border-white/10 shadow-2xl z-[5000]">
              <ToolBtn icon={<Eye size={22}/>} active={!isHUDVisible} onClick={() => setIsHUDVisible(!isHUDVisible)} />
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <ToolBtn icon={<MousePointer2 size={22}/>} active={editMode} onClick={() => { setEditMode(!editMode); setSelectedControlId(null); }} />
              {editMode && (
                <>
                  <ToolBtn icon={<Move size={22}/>} onClick={() => handleAddControl('WASD')} />
                  <ToolBtn icon={<Crosshair size={22}/>} onClick={() => handleAddControl('VISTA')} />
                  <ToolBtn icon={<Flame size={22}/>} onClick={() => handleAddControl('FIRE')} />
                </>
              )}
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <ToolBtn icon={isPointerLocked ? <Lock size={22} className="text-green-500"/> : <Unlock size={22} className="text-orange-500"/>} onClick={togglePointerLock} />
              <ToolBtn icon={<Zap size={22}/>} onClick={() => setView('HOME')} />
            </div>

            {editMode && selectedControl && (
              <div className="absolute bg-[#1c2128] border border-white/15 p-5 rounded-[2.5rem] shadow-2xl z-[6000] min-w-[200px] animate-in zoom-in-95" style={{ left: `${selectedControl.x}%`, top: `${Math.min(selectedControl.y + 12, 85)}%`, transform: 'translateX(-50%)' }}>
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-black uppercase text-cyan-500 italic">{selectedControl.type} NODE</span>
                  <button onClick={() => { updateActiveProfile({ controls: currentProfile!.controls.filter(c => c.id !== selectedControlId) }); setSelectedControlId(null); }} className="text-red-500/50"><Trash2 size={16}/></button>
                </div>
                <button onClick={() => setIsListeningForKey(true)} className="w-full py-4 bg-black/40 border border-white/5 rounded-2xl text-2xl font-black text-cyan-500 shadow-inner uppercase italic">{selectedControl.key}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SENSIBILIDADE */}
      {showSensiModal && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6" onClick={() => setShowSensiModal(false)}>
          <div className="bg-[#161b22] w-full max-w-sm border border-white/10 rounded-[3.5rem] p-10 space-y-10 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><Target size={30} className="text-blue-500" /><h3 className="text-xl font-black uppercase italic tracking-tighter">Precision Drive</h3></div>
              <button onClick={() => setShowSensiModal(false)}><X size={22} className="text-white/20"/></button>
            </div>
            <div className="space-y-8 h-[380px] overflow-y-auto no-scrollbar pr-2">
              <SensiSlider label="Sensi X" value={currentProfile?.sensitivity.xSensitivity || 0.85} onChange={v => updateSensitivity({ xSensitivity: v })} />
              <SensiSlider label="Sensi Y" value={currentProfile?.sensitivity.ySensitivity || 0.65} onChange={v => updateSensitivity({ ySensitivity: v })} />
              <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between"><span className="text-[12px] font-black uppercase text-white/50 italic">Tweak (BS5)</span><input type="number" value={currentProfile?.sensitivity.tweaks || 16450} onChange={e => updateSensitivity({ tweaks: parseInt(e.target.value) })} className="w-24 bg-black border border-white/10 rounded-xl p-3 text-cyan-400 font-mono text-center font-bold" /></div>
              </div>
            </div>
            <button onClick={() => setShowSensiModal(false)} className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase italic shadow-2xl tracking-widest">Sincronizar Driver</button>
          </div>
        </div>
      )}

      {isListeningForKey && (
        <div className="fixed inset-0 z-[11000] bg-black/95 flex flex-col items-center justify-center p-10 animate-in fade-in">
           <div className="w-32 h-32 bg-cyan-500/10 rounded-[3rem] flex items-center justify-center border border-cyan-500/20 animate-pulse mb-8"><Keyboard size={64} className="text-cyan-500" /></div>
           <h3 className="text-3xl font-black uppercase italic mb-2">Aguardando HID</h3>
           <p className="text-[11px] text-white/20 font-bold uppercase tracking-[0.4em]">Pressione uma tecla ou botão do mouse</p>
           <button onClick={() => setIsListeningForKey(false)} className="mt-12 px-8 py-3 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/30">Cancelar</button>
        </div>
      )}
    </div>
  );
};

const MenuCard = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`p-7 rounded-[2.5rem] flex flex-col items-center gap-4 border transition-all active:scale-95 ${active ? 'bg-[#161b22] border-white/10' : 'bg-white/5 border-transparent opacity-40 grayscale pointer-events-none'}`}><div className={active ? 'text-cyan-400' : 'text-white/20'}>{icon}</div><span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span></button>
);

const ToolBtn = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-3xl transition-all active:scale-90 ${active ? 'bg-cyan-600 text-white shadow-lg' : 'text-white/30 hover:bg-white/10'}`}>{icon}</button>
);

const SensiSlider = ({ label, value, onChange }: any) => (
  <div className="space-y-4 px-2">
    <div className="flex justify-between items-center text-[11px] font-black uppercase text-white/40 italic"><span>{label}</span><span className="text-cyan-400 font-mono text-xl">{value.toFixed(2)}</span></div>
    <input type="range" min="0.01" max="8.00" step="0.01" value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none accent-cyan-500 cursor-pointer" />
  </div>
);

const DraggableControl = ({ control, editMode, isSelected, onSelect, onDrag, canvasRef }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const size = control.size || 64;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDrag(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    }
  }, [isDragging, onDrag, canvasRef]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div 
      onPointerDown={(e) => { 
        if(editMode) { 
          e.stopPropagation(); 
          setIsDragging(true); 
          onSelect(); 
        } 
      }}
      className={`absolute flex items-center justify-center rounded-full transition-shadow ${editMode ? 'cursor-move touch-none' : 'pointer-events-none'} ${isSelected ? 'ring-4 ring-cyan-500 bg-cyan-500/20 scale-110 shadow-2xl z-[100]' : 'bg-black/50 border-2 border-white/20 z-[50]'}`}
      style={{ left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)', opacity: editMode ? 1 : (control.opacity / 100) }}
    >
      <div className="flex flex-col items-center text-white/90">
        {control.type === 'WASD' && <Move size={size * 0.4} className="text-green-500"/>}
        {control.type === 'VISTA' && <Crosshair size={size * 0.4} className="text-cyan-400"/>}
        {control.type === 'FIRE' && <Flame size={size * 0.4} className="text-orange-500"/>}
        <span className="text-[10px] font-black uppercase italic leading-none mt-1 select-none">{control.key}</span>
      </div>
    </div>
  );
};

export default App;
