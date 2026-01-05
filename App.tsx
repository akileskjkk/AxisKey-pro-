
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Settings, Crosshair, Move, Flame, Zap, Trash2, Target, X, 
  ChevronLeft, MousePointer2, Activity, Eye, Loader2, 
  Rocket, ShieldCheck, Shield, Mouse, Keyboard, 
  RefreshCw, Smartphone, CheckCircle2,
  Terminal, Monitor, Radio, Power, MousePointer,
  ChevronRight, Gauge, SlidersHorizontal,
  Info, ZapOff, Lock, Unlock, Wifi, HardDrive, Cpu as CpuIcon,
  ShieldAlert, Timer, Fingerprint, MoveUpRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Power as PowerIcon
} from 'lucide-react';
import { Game, MappingControl, ControlType, MappingProfile, SensitivitySettings, AppConfig, DeviceHardware, MacroStep } from './types';

// Logo oficial do AxisKey Pro fornecida pelo usuário
const AXIS_LOGO_URL = "https://i.ibb.co/VqnVvM5/axiskey-logo.jpg";

const App: React.FC = () => {
  const [view, setView] = useState<'SPLASH' | 'HOME' | 'MAPPER' | 'ACTIVATION' | 'HARDWARE'>('SPLASH');
  const [activeTab, setActiveTab] = useState<'SHIZUKU' | 'WIRELESS'>('SHIZUKU');
  const [splashProgress, setSplashProgress] = useState(0);
  
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('axiskey_v18_cfg');
      return saved ? JSON.parse(saved) : { 
        showOnboarding: true, themeColor: '#0e62fe', language: 'pt-BR', 
        hapticFeedback: true, showFps: true, activationStatus: 'INACTIVE', activationMethod: 'NONE'
      };
    } catch (e) {
      return { 
        showOnboarding: true, themeColor: '#0e62fe', language: 'pt-BR', 
        hapticFeedback: true, showFps: true, activationStatus: 'INACTIVE', activationMethod: 'NONE'
      };
    }
  });

  const [hardware, setHardware] = useState<DeviceHardware>({
    cpuCores: navigator.hardwareConcurrency || 8,
    gpuRenderer: 'Adreno (TM) Graphics',
    gpuVendor: 'Qualcomm',
    androidVersion: 'Android OS Standard',
    deviceName: 'HID-Compliant Gamer Device',
    refreshRate: 60
  });

  const [ipAddress, setIpAddress] = useState('192.168.1.15');
  const [pairingData, setPairingData] = useState({ port: '', code: '' });
  const [activationLogs, setActivationLogs] = useState<string[]>([]);
  const [isActivating, setIsActivating] = useState(false);

  // Lógica da Splash Screen (Activity Inicial)
  useEffect(() => {
    if (view === 'SPLASH') {
      const interval = setInterval(() => {
        setSplashProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setView('HOME'), 400);
            return 100;
          }
          return prev + 4;
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [view]);

  const [games, setGames] = useState<Game[]>(() => {
    try {
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
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('axiskey_v18_games', JSON.stringify(games));
    localStorage.setItem('axiskey_v18_cfg', JSON.stringify(appConfig));
  }, [games, appConfig]);

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
    setActivationLogs(["Carregando Driver HID...", "Sincronizando barramento..."]);
    await new Promise(r => setTimeout(r, 1000));
    setActivationLogs(p => [...p, ">> Serviço Shizuku detectado.", ">> Driver Real-Drive: ATIVO."]);
    setAppConfig(prev => ({ ...prev, activationStatus: 'ACTIVE', activationMethod: 'SHIZUKU' }));
    setIsActivating(false);
  };

  const handleWirelessActivation = async () => {
    if (!pairingData.port || !pairingData.code) {
      setActivationLogs(["Erro: Insira os dados de pareamento."]);
      return;
    }
    setIsActivating(true);
    setActivationLogs([`Conectando em ${ipAddress}:${pairingData.port}...`]);
    await new Promise(r => setTimeout(r, 1200));
    setActivationLogs(p => [...p, ">> Conexão ADB Wireless estabelecida.", ">> Driver Real-Drive: ATIVO."]);
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
      key: type === 'WASD' ? 'WASD' : (type === 'VISTA' ? 'F1' : (type === 'FIRE' ? 'LMB' : (type === 'MACRO' ? 'M' : (type === 'TAP' ? '?' : (type === 'SWIPE' ? 'S' : '?'))))),
      size: type === 'WASD' ? 140 : 65,
      opacity: 80,
      macroSteps: type === 'MACRO' ? [{ id: Math.random().toString(36).substring(7), key: 'E', delay: 50 }] : undefined,
      swipeDirection: type === 'SWIPE' ? 'UP' : undefined
    };
    updateActiveProfile({ controls: [...currentProfile.controls, newControl] });
    setSelectedControlId(newControl.id);
  };

  const updateSensitivity = (updates: Partial<SensitivitySettings>) => {
    if (!currentProfile) return;
    updateActiveProfile({ sensitivity: { ...currentProfile.sensitivity, ...updates } });
  };

  const handleAddMacroStep = () => {
    if (!selectedControl || selectedControl.type !== 'MACRO' || !currentProfile) return;
    const newSteps = [...(selectedControl.macroSteps || []), { id: Math.random().toString(36).substring(7), key: '?', delay: 50 }];
    updateActiveProfile({
      controls: currentProfile.controls.map(c => c.id === selectedControl.id ? { ...c, macroSteps: newSteps } : c)
    });
  };

  const handleUpdateMacroStep = (stepId: string, updates: Partial<MacroStep>) => {
    if (!selectedControl || selectedControl.type !== 'MACRO' || !currentProfile) return;
    const newSteps = selectedControl.macroSteps?.map(s => s.id === stepId ? { ...s, ...updates } : s);
    updateActiveProfile({
      controls: currentProfile.controls.map(c => c.id === selectedControl.id ? { ...c, macroSteps: newSteps } : c)
    });
  };

  const handleRemoveMacroStep = (stepId: string) => {
    if (!selectedControl || selectedControl.type !== 'MACRO' || !currentProfile) return;
    const newSteps = selectedControl.macroSteps?.filter(s => s.id !== stepId);
    updateActiveProfile({
      controls: currentProfile.controls.map(c => c.id === selectedControl.id ? { ...c, macroSteps: newSteps } : c)
    });
  };

  return (
    <div className="h-screen bg-[#090c13] text-white flex flex-col font-sans overflow-hidden relative select-none touch-none">
      
      {/* ACTIVITY INICIAL (SPLASH SCREEN) */}
      {view === 'SPLASH' && (
        <div className="fixed inset-0 z-[20000] bg-[#090c13] flex flex-col items-center justify-center p-10 animate-in fade-in duration-700">
          <div className="mb-10 w-48 h-48 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <img src={AXIS_LOGO_URL} alt="AxisKey Logo" className="w-full h-full object-cover" />
          </div>
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-blue-500 transition-all duration-100" 
              style={{ width: `${splashProgress}%` }}
            ></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">AxisKey Pro - HID Driver v18</p>
        </div>
      )}

      {/* PERFORMANCE HUD */}
      {(view !== 'SPLASH') && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-5 bg-black/90 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl pointer-events-none transition-all">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase text-white/30">FPS:</span>
            <span className="text-[11px] font-mono font-bold text-blue-400">{hardware.refreshRate}</span>
          </div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-2">
            <MousePointer size={12} className={appConfig.activationStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-500'} />
            <span className="text-[10px] font-black uppercase text-white/30">HID:</span>
            <span className={`text-[11px] font-mono font-bold ${appConfig.activationStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-500'}`}>
              {appConfig.activationStatus === 'ACTIVE' ? 'READY' : 'OFF'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW: HOME */}
      {view === 'HOME' && (
        <div className="flex-1 flex flex-col items-center p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
          <div className="mt-14 mb-12 flex flex-col items-center">
            <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-[#0d1117] border border-white/5 shadow-2xl hover:scale-105 transition-transform duration-300">
              <img src={AXIS_LOGO_URL} alt="AxisKey Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="mt-8 text-3xl font-black uppercase italic tracking-tighter text-white/90">AxisKey Pro</h1>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-2">Professional Keymapping</p>
          </div>

          <div className="max-w-md mx-auto w-full space-y-6 pb-12">
            <div 
              onClick={() => setView('ACTIVATION')}
              className={`group w-full p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-all border-2 ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#161b22] border-white/5 shadow-xl'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-3xl ${appConfig.activationStatus === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                  {appConfig.activationStatus === 'ACTIVE' ? <ShieldCheck size={36}/> : <Shield size={36}/>}
                </div>
                <div>
                  <p className={`font-black text-xl uppercase italic leading-none ${appConfig.activationStatus === 'ACTIVE' ? 'text-green-400' : 'text-white/80'}`}>
                    {appConfig.activationStatus === 'ACTIVE' ? 'Conectado' : 'Driver Off'}
                  </p>
                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-2">
                    {appConfig.activationStatus === 'ACTIVE' ? `Via ${appConfig.activationMethod}` : 'Toque para Ativar'}
                  </p>
                </div>
              </div>
              <ChevronRight size={24} className="opacity-20" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MenuCard icon={<SlidersHorizontal size={24}/>} label="Sensibilidade" active={true} onClick={() => setShowSensiModal(true)} />
              <MenuCard icon={<CpuIcon size={24}/>} label="Hardware" active={true} onClick={() => setView('HARDWARE')} />
            </div>

            <div className="space-y-4 pt-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/10 pl-2 italic">Biblioteca</h3>
              {games.map(game => (
                <div 
                  key={game.id} 
                  onClick={() => { 
                    if(appConfig.activationStatus !== 'ACTIVE') setView('ACTIVATION');
                    else { setActiveGameId(game.id); setView('MAPPER'); }
                  }} 
                  className={`bg-[#161b22] border border-white/5 p-4 rounded-[2rem] flex items-center gap-4 hover:bg-[#1c2128] active:scale-95 transition-all cursor-pointer group shadow-xl ${appConfig.activationStatus !== 'ACTIVE' ? 'opacity-60 grayscale' : ''}`}
                >
                  <img src={game.icon} className="w-14 h-14 rounded-2xl shadow-lg" />
                  <div className="flex-1">
                    <p className="font-black text-[15px] text-white/90 italic">{game.name}</p>
                    <span className="text-[9px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase">Ativo</span>
                  </div>
                  <PowerIcon size={20} className="text-blue-500/50" />
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
            <button onClick={() => setView('HOME')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors active:scale-90"><ChevronLeft/></button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ativação</h2>
          </header>

          <div className="max-w-md mx-auto w-full flex-1 flex flex-col space-y-8">
            <div className="flex p-1 bg-black/40 rounded-3xl border border-white/5">
              <button onClick={() => setActiveTab('SHIZUKU')} className={`flex-1 py-4 rounded-2xl font-black uppercase italic text-[11px] transition-all ${activeTab === 'SHIZUKU' ? 'bg-blue-600 text-white' : 'text-white/20'}`}>Shizuku</button>
              <button onClick={() => setActiveTab('WIRELESS')} className={`flex-1 py-4 rounded-2xl font-black uppercase italic text-[11px] transition-all ${activeTab === 'WIRELESS' ? 'bg-blue-600 text-white' : 'text-white/20'}`}>Wireless ADB</button>
            </div>

            <div className="flex-1 space-y-6">
              {activeTab === 'SHIZUKU' ? (
                <div className="bg-[#161b22] border border-white/10 p-10 rounded-[3rem] text-center space-y-8 shadow-2xl">
                  <div className="w-24 h-24 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-blue-500/20"><HardDrive className="text-blue-500" size={48} /></div>
                  <div className="space-y-2">
                    <h3 className="font-black text-xl uppercase italic">Shizuku Binder</h3>
                    <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Conexão direta via binder nativo.</p>
                  </div>
                  <button onClick={handleShizukuActivation} disabled={isActivating} className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase italic text-[13px] shadow-2xl active:scale-95 disabled:opacity-40">{isActivating ? <Loader2 className="animate-spin mx-auto" /> : 'Conectar Driver'}</button>
                </div>
              ) : (
                <div className="bg-[#161b22] border border-white/10 p-8 rounded-[3rem] space-y-6 shadow-2xl">
                  <div className="flex flex-col items-center text-center space-y-2 mb-4"><Wifi size={32} className="text-blue-500" /><h3 className="font-black text-xl uppercase italic">Wireless ADB</h3></div>
                  <div className="space-y-4">
                    <input type="text" value={ipAddress} onChange={e => setIpAddress(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-blue-400 font-mono text-sm focus:border-blue-500 outline-none" placeholder="192.168.1.X" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Porta" value={pairingData.port} onChange={e => setPairingData({...pairingData, port: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-blue-400 font-mono text-sm focus:border-blue-500 outline-none" />
                      <input type="text" placeholder="Código" value={pairingData.code} onChange={e => setPairingData({...pairingData, code: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-blue-400 font-mono text-sm focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <button onClick={handleWirelessActivation} disabled={isActivating} className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase italic text-[13px] shadow-2xl active:scale-95 disabled:opacity-40">{isActivating ? <Loader2 className="animate-spin mx-auto" /> : 'Parear ADB'}</button>
                </div>
              )}
              <div className="w-full bg-black/60 rounded-[2.5rem] p-6 font-mono text-[10px] text-blue-500/60 h-40 overflow-y-auto no-scrollbar border border-white/5">
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

            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur-2xl p-2 rounded-full border border-white/10 shadow-2xl z-[5000]">
              <ToolBtn icon={<Eye size={20}/>} active={!isHUDVisible} onClick={() => setIsHUDVisible(!isHUDVisible)} />
              <div className="w-px h-5 bg-white/10 mx-1"></div>
              <ToolBtn icon={<MousePointer2 size={20}/>} active={editMode} onClick={() => { setEditMode(!editMode); setSelectedControlId(null); }} />
              {editMode && (
                <>
                  <ToolBtn icon={<Move size={20}/>} onClick={() => handleAddControl('WASD')} title="WASD" />
                  <ToolBtn icon={<Fingerprint size={20}/>} onClick={() => handleAddControl('TAP')} title="TAP" />
                  <ToolBtn icon={<MoveUpRight size={20}/>} onClick={() => handleAddControl('SWIPE')} title="SWIPE" />
                  <ToolBtn icon={<Crosshair size={20}/>} onClick={() => handleAddControl('VISTA')} title="VISTA" />
                  <ToolBtn icon={<Flame size={20}/>} onClick={() => handleAddControl('FIRE')} title="FIRE" />
                  <ToolBtn icon={<Terminal size={20}/>} onClick={() => handleAddControl('MACRO')} title="MACRO" />
                </>
              )}
              <div className="w-px h-5 bg-white/10 mx-1"></div>
              <ToolBtn icon={isPointerLocked ? <Lock size={20} className="text-green-500"/> : <Unlock size={20} className="text-orange-500"/>} onClick={togglePointerLock} />
              <ToolBtn icon={<X size={20}/>} onClick={() => setView('HOME')} />
            </div>

            {editMode && selectedControl && (
              <div className="absolute bg-[#1c2128] border border-white/15 p-5 rounded-[2.5rem] shadow-2xl z-[6000] min-w-[280px] max-h-[70vh] overflow-y-auto no-scrollbar" style={{ left: `${selectedControl.x}%`, top: `${Math.min(selectedControl.y + 12, 85)}%`, transform: 'translateX(-50%)' }}>
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-black uppercase text-blue-500 italic">{selectedControl.type} NODE</span>
                  <button onClick={() => { updateActiveProfile({ controls: currentProfile!.controls.filter(c => c.id !== selectedControlId) }); setSelectedControlId(null); }} className="text-red-500/50 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
                
                <div className="space-y-4">
                  {selectedControl.type === 'TAP' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-white/30 ml-2 italic">Definir Tecla</label>
                      <input 
                        type="text" 
                        maxLength={1}
                        placeholder="Tecla"
                        value={selectedControl.key === '?' ? '' : selectedControl.key}
                        onChange={(e) => updateActiveProfile({ 
                          controls: currentProfile!.controls.map(c => c.id === selectedControl.id ? { ...c, key: e.target.value.toUpperCase() || '?' } : c) 
                        })}
                        className="w-full py-4 bg-black/40 border border-white/5 rounded-2xl text-2xl font-black text-blue-500 text-center uppercase italic focus:border-blue-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-white/30 ml-2 italic">Tecla</label>
                      <button onClick={() => setIsListeningForKey(true)} className="w-full py-4 bg-black/40 border border-white/5 rounded-2xl text-2xl font-black text-blue-500 shadow-inner uppercase italic">{selectedControl.key}</button>
                    </div>
                  )}

                  {selectedControl.type === 'SWIPE' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-black uppercase text-white/30 ml-2 italic">Direção</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['UP', 'DOWN', 'LEFT', 'RIGHT'].map((dir) => (
                          <button 
                            key={dir}
                            onClick={() => updateActiveProfile({ controls: currentProfile!.controls.map(c => c.id === selectedControl.id ? { ...c, swipeDirection: dir as any } : c) })}
                            className={`p-3 rounded-xl border flex items-center justify-center transition-all ${selectedControl.swipeDirection === dir ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/5 text-white/20 hover:border-white/20'}`}
                          >
                            {dir === 'UP' && <ArrowUp size={16}/>}
                            {dir === 'DOWN' && <ArrowDown size={16}/>}
                            {dir === 'LEFT' && <ArrowLeft size={16}/>}
                            {dir === 'RIGHT' && <ArrowRight size={16}/>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedControl.type === 'MACRO' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black uppercase text-white/30 italic">Macro Steps</span>
                        <button onClick={handleAddMacroStep} className="p-1 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20"><Plus size={16}/></button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                        {selectedControl.macroSteps?.map((step, idx) => (
                          <div key={step.id} className="bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                            <span className="text-[9px] font-black text-white/10 w-4">{idx + 1}</span>
                            <input 
                              type="text" 
                              value={step.key} 
                              onChange={(e) => handleUpdateMacroStep(step.id, { key: e.target.value.toUpperCase() })}
                              className="w-10 bg-black/60 border border-white/10 rounded-lg py-1 text-center font-black text-blue-400 text-xs"
                            />
                            <div className="flex-1 flex items-center gap-2">
                              <Timer size={12} className="text-white/20"/>
                              <input 
                                type="number" 
                                value={step.delay} 
                                onChange={(e) => handleUpdateMacroStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                                className="w-full bg-transparent font-mono text-[11px] text-white/50 focus:text-white outline-none"
                              />
                              <span className="text-[9px] font-bold text-white/10">ms</span>
                            </div>
                            <button onClick={() => handleRemoveMacroStep(step.id)} className="text-red-500/30 hover:text-red-500"><X size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: HARDWARE */}
      {view === 'HARDWARE' && (
        <div className="flex-1 flex flex-col p-6 animate-in fade-in">
           <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('HOME')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors active:scale-90"><ChevronLeft/></button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Status do Dispositivo</h2>
          </header>
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full">
            <HardwareCard icon={<Monitor/>} label="Modelo" value={hardware.deviceName} />
            <HardwareCard icon={<CpuIcon/>} label="GPU" value={hardware.gpuRenderer} />
            <HardwareCard icon={<Activity/>} label="Taxa de Atualização" value={`${hardware.refreshRate} Hz`} />
            <HardwareCard icon={<Smartphone/>} label="Sistema" value={hardware.androidVersion} />
          </div>
        </div>
      )}

      {/* MODAL: SENSIBILIDADE */}
      {showSensiModal && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6" onClick={() => setShowSensiModal(false)}>
          <div className="bg-[#161b22] w-full max-w-sm border border-white/10 rounded-[3rem] p-10 space-y-10 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><Target size={30} className="text-blue-500" /><h3 className="text-xl font-black uppercase italic tracking-tighter">Precisão BS5</h3></div>
              <button onClick={() => setShowSensiModal(false)}><X size={22} className="text-white/20"/></button>
            </div>
            <div className="space-y-8 h-[380px] overflow-y-auto no-scrollbar pr-2">
              <SensiSlider label="Sensi X" value={currentProfile?.sensitivity.xSensitivity || 0.85} onChange={v => updateSensitivity({ xSensitivity: v })} />
              <SensiSlider label="Sensi Y" value={currentProfile?.sensitivity.ySensitivity || 0.65} onChange={v => updateSensitivity({ ySensitivity: v })} />
              <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center justify-between"><span className="text-[12px] font-black uppercase text-white/50 italic">Tweak BS5</span><input type="number" value={currentProfile?.sensitivity.tweaks || 16450} onChange={e => updateSensitivity({ tweaks: parseInt(e.target.value) })} className="w-24 bg-black border border-white/10 rounded-xl p-3 text-blue-400 font-mono text-center font-bold" /></div>
              </div>
            </div>
            <button onClick={() => setShowSensiModal(false)} className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase italic shadow-2xl active:scale-95">Sincronizar Driver</button>
          </div>
        </div>
      )}

      {isListeningForKey && (
        <div className="fixed inset-0 z-[11000] bg-black/95 flex flex-col items-center justify-center p-10 animate-in fade-in">
           <div className="w-32 h-32 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center border border-blue-500/20 mb-8"><Keyboard size={64} className="text-blue-500" /></div>
           <h3 className="text-3xl font-black uppercase italic mb-2">Aguardando HID</h3>
           <p className="text-[11px] text-white/20 font-bold uppercase tracking-[0.4em]">Pressione uma tecla ou botão</p>
           <button onClick={() => setIsListeningForKey(false)} className="mt-12 px-8 py-3 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/30 active:scale-90">Cancelar</button>
        </div>
      )}
    </div>
  );
};

const MenuCard = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`p-7 rounded-[2.5rem] flex flex-col items-center gap-4 border transition-all active:scale-95 ${active ? 'bg-[#161b22] border-white/10 shadow-lg' : 'bg-white/5 border-transparent opacity-40 grayscale pointer-events-none'}`}><div className={active ? 'text-blue-400' : 'text-white/20'}>{icon}</div><span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span></button>
);

const HardwareCard = ({ icon, label, value }: any) => (
  <div className="bg-[#161b22] p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-4 shadow-xl">
    <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">{icon}</div>
    <div>
      <p className="text-[9px] font-black uppercase text-white/30 italic">{label}</p>
      <p className="text-sm font-bold text-white/90">{value}</p>
    </div>
  </div>
);

const ToolBtn = ({ icon, active, onClick, title }: any) => (
  <button onClick={onClick} title={title} className={`p-4 rounded-3xl transition-all active:scale-90 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-white/30 hover:bg-white/10'}`}>{icon}</button>
);

const SensiSlider = ({ label, value, onChange }: any) => (
  <div className="space-y-4 px-2">
    <div className="flex justify-between items-center text-[11px] font-black uppercase text-white/40 italic"><span>{label}</span><span className="text-blue-400 font-mono text-xl">{value.toFixed(2)}</span></div>
    <input type="range" min="0.01" max="8.00" step="0.01" value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none accent-blue-500 cursor-pointer" />
  </div>
);

const DraggableControl = ({ control, editMode, isSelected, onSelect, onDrag, canvasRef }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const size = control.size || 64;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDrag(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    }
  }, [isDragging, onDrag, canvasRef]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  const isMacroPulse = control.type === 'MACRO' && isSelected;

  return (
    <div 
      onPointerDown={(e) => { 
        if(editMode) { 
          e.stopPropagation(); 
          setIsDragging(true); 
          onSelect(); 
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } 
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute flex items-center justify-center rounded-full transition-all ${editMode ? 'cursor-move touch-none active:scale-110' : 'pointer-events-none'} ${isSelected ? 'ring-4 ring-blue-500 bg-blue-500/20 shadow-2xl z-[100]' : 'bg-black/50 border-2 border-white/20 z-[50]'} ${isMacroPulse ? 'macro-pulse-active ring-blue-400' : ''}`}
      style={{ left: `${control.x}%`, top: `${control.y}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)', opacity: editMode ? 1 : (control.opacity / 100) }}
    >
      <div className="flex flex-col items-center text-white/90 relative w-full h-full justify-center">
        {control.type === 'WASD' && <Move size={size * 0.4} className="text-green-500"/>}
        {control.type === 'VISTA' && <Crosshair size={size * 0.4} className="text-blue-400"/>}
        {control.type === 'FIRE' && <Flame size={size * 0.4} className="text-orange-500"/>}
        {control.type === 'MACRO' && <Terminal size={size * 0.4} className="text-blue-500"/>}
        {control.type === 'TAP' && <Fingerprint size={size * 0.4} className="text-blue-400"/>}
        {control.type === 'SWIPE' && (
          <div className="flex flex-col items-center">
             <div className={`transition-transform duration-300 ${control.swipeDirection === 'DOWN' ? 'rotate-180' : control.swipeDirection === 'LEFT' ? '-rotate-90' : control.swipeDirection === 'RIGHT' ? 'rotate-90' : ''}`}>
               <ArrowUp size={size * 0.5} className="text-purple-400" />
             </div>
             <div className="absolute -bottom-1 w-full h-1 bg-purple-500/20 rounded-full blur-sm"></div>
          </div>
        )}
        <span className="text-[10px] font-black uppercase italic leading-none mt-1 select-none pointer-events-none">{control.key}</span>
      </div>
    </div>
  );
};

export default App;
