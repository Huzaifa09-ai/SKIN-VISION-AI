
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeSkin } from './services/geminiService';
import { SkinVisionResult, ScreenID, User, TierID, SensitivityLevel } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';

const ADMIN_CREDENTIALS = {
  email: "huzifawork099@gmail.com",
  password: "000000"
};

const OWNER_PAYMENT_NUMBER = "03290144760";

const TIER_CONFIG: Record<TierID, { scans: number; uploads: number; name: string; price: string }> = {
  FREE: { scans: 3, uploads: 2, name: "Free Tier", price: "Rs 0" },
  BASIC: { scans: 15, uploads: 10, name: "Basic Plan", price: "Rs 500" },
  PRO: { scans: 50, uploads: 50, name: "Pro Plan", price: "Rs 1,500" },
  ELITE: { scans: 500, uploads: 500, name: "Elite Plan", price: "Rs 3,000" },
};

const App: React.FC = () => {
  // --- STATE INITIALIZATION WITH SAFETY DEFAULTS ---
  const [isAppReady, setIsAppReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenID>('onboarding');
  const [result, setResult] = useState<SkinVisionResult | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI States
  const [analysisStatus, setAnalysisStatus] = useState("Initializing...");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- BOOT SEQUENCE (PREVENTS WHITE SCREEN) ---
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('skin_vision_users');
      const savedCurrent = localStorage.getItem('skin_vision_current_user');
      const savedAdmin = localStorage.getItem('skin_vision_is_admin');
      const savedScreen = localStorage.getItem('skin_vision_active_screen');
      const savedResult = localStorage.getItem('skin_vision_last_result');

      if (savedUsers) setRegisteredUsers(JSON.parse(savedUsers));
      if (savedCurrent) setCurrentUser(JSON.parse(savedCurrent));
      if (savedAdmin === 'true') setIsAdmin(true);
      if (savedResult) setResult(JSON.parse(savedResult));
      
      // Screen selection logic
      if (savedCurrent) {
        setActiveScreen((savedScreen as ScreenID) || 'home');
      } else {
        setActiveScreen('onboarding');
      }
      
      setIsAppReady(true);
    } catch (err) {
      console.error("Boot Error:", err);
      setActiveScreen('onboarding');
      setIsAppReady(true);
    }
  }, []);

  // --- GLOBAL ERROR MONITOR ---
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Global Error Caught:", e);
      setRuntimeError(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // --- PERSISTENCE SYNC ---
  useEffect(() => {
    if (!isAppReady) return;
    localStorage.setItem('skin_vision_users', JSON.stringify(registeredUsers));
    localStorage.setItem('skin_vision_active_screen', activeScreen);
    localStorage.setItem('skin_vision_is_admin', isAdmin.toString());
    if (currentUser) {
      localStorage.setItem('skin_vision_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('skin_vision_current_user');
    }
  }, [registeredUsers, activeScreen, isAdmin, currentUser, isAppReady]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleLogout = () => {
    stopCamera();
    localStorage.clear();
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveScreen('onboarding');
    window.location.reload(); // Hard reset for clean state
  };

  const Logo = ({ light = false }: { light?: boolean }) => (
    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveScreen(currentUser ? 'home' : 'onboarding')}>
      <div className={`w-11 h-11 ${light ? 'bg-white text-emerald-600' : 'bg-slate-900 text-emerald-400'} rounded-2xl flex items-center justify-center shadow-2xl transition-all group-hover:scale-105 group-hover:rotate-6`}>
        <i className="fa-solid fa-microscope text-lg"></i>
      </div>
      <span className={`text-2xl font-black tracking-tighter ${light ? 'text-white' : 'text-slate-900'}`}>
        Elite<span className="text-emerald-500">Vision</span>
      </span>
    </div>
  );

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === 'signup') {
      if (authPassword !== authConfirmPassword) { setAuthError("Passwords do not match."); return; }
      if (registeredUsers.some(u => u.email === authEmail)) { setAuthError("User ID occupied."); return; }
      const newUser: User = { 
        name: authName, email: authEmail, password: authPassword, 
        tier: 'FREE', scansPerformed: 0, uploadsPerformed: 0, sensitivity: 'Balanced' 
      };
      setRegisteredUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setActiveScreen('home');
    } else {
      const user = registeredUsers.find(u => u.email === authEmail && u.password === authPassword);
      if (user) { setCurrentUser(user); setActiveScreen('home'); }
      else { setAuthError("Verification Failed."); }
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === ADMIN_CREDENTIALS.email && adminPassword === ADMIN_CREDENTIALS.password) {
      setIsAdmin(true);
      setActiveScreen('admin_dashboard');
    } else { alert("Access Denied."); }
  };

  const approveUser = (email: string) => {
    setRegisteredUsers(prev => prev.map(u => {
      if (u.email === email && u.pendingTier) {
        const updated = { ...u, tier: u.pendingTier, pendingTier: undefined };
        if (currentUser?.email === email) setCurrentUser(updated);
        return updated;
      }
      return u;
    }));
    alert("Authorization Verified.");
  };

  const performAnalysis = async (base64: string, mode: 'scan' | 'upload') => {
    stopCamera();
    setActiveScreen('analyzing');
    setAnalysisStatus("Synthesizing Bio-Markers...");
    try {
      const data = await analyzeSkin(base64, result?.skin_analysis?.skin_score, currentUser?.sensitivity);
      if (!data?.is_valid_face) { 
        alert(data?.validation_error || "Bio-Map Error: Detect clear face."); 
        setActiveScreen('home'); 
        return; 
      }
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          scansPerformed: mode === 'scan' ? currentUser.scansPerformed + 1 : currentUser.scansPerformed,
          uploadsPerformed: mode === 'upload' ? currentUser.uploadsPerformed + 1 : currentUser.uploadsPerformed
        };
        setCurrentUser(updatedUser);
      }
      setResult(data);
      setActiveScreen('report');
    } catch { 
      alert("Network Sync Failed."); 
      setActiveScreen('home'); 
    }
  };

  const renderScreen = () => {
    if (runtimeError) {
      return (
        <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-12 text-center text-white">
           <i className="fa-solid fa-triangle-exclamation text-5xl text-amber-500 mb-6"></i>
           <h2 className="text-2xl font-black mb-2 uppercase">System Disruption</h2>
           <p className="text-slate-400 text-xs mb-10 leading-relaxed font-bold">Node error detected. To protect your analysis data, please reboot the session.</p>
           <button onClick={handleLogout} className="px-10 py-5 bg-emerald-500 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl">Reboot Node</button>
        </div>
      );
    }

    if (!isAppReady) {
      return (
        <div className="h-screen flex items-center justify-center">
           <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    const user = (currentUser ? registeredUsers.find(u => u.email === currentUser.email) : null) || currentUser;

    switch (activeScreen) {
      case 'onboarding':
        return (
          <div className="h-screen bg-white flex flex-col items-center justify-between p-10 text-center animate-in">
            <button onClick={() => setActiveScreen('admin_login')} className="self-start text-slate-100 hover:text-emerald-500"><i className="fa-solid fa-fingerprint"></i></button>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl animate-pulse">
                <i className="fa-solid fa-shield-dna text-4xl text-white"></i>
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">Elite<br/><span className="text-emerald-500">Vision AI</span></h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Professional Bio-Mapping</p>
            </div>
            <button onClick={() => setActiveScreen('auth')} className="w-full py-5 bg-slate-900 text-white rounded-[32px] font-black text-lg shadow-2xl active:scale-95 transition-all">Start Analysis</button>
          </div>
        );

      case 'auth':
        return (
          <div className="min-h-screen bg-slate-50 p-10 flex flex-col items-center justify-center animate-in">
            <Logo />
            <h2 className="text-3xl font-black mt-12 mb-2 text-slate-900 tracking-tight">{authMode === 'login' ? 'Verification' : 'Registration'}</h2>
            <p className="text-slate-400 text-[10px] font-black mb-8 uppercase tracking-widest">Global Identity Link</p>
            <form onSubmit={handleAuth} className="w-full space-y-4">
              {authError && <div className="p-4 bg-red-50 text-red-500 text-[10px] font-black rounded-2xl border border-red-100 uppercase">{authError}</div>}
              {authMode === 'signup' && (
                <input type="text" required placeholder="Display Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              )}
              <input type="email" required placeholder="Email Address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              <input type="password" required placeholder="Passcode" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              {authMode === 'signup' && (
                <input type="password" required placeholder="Verify Passcode" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              )}
              <button className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4 uppercase tracking-[0.1em]">
                {authMode === 'login' ? 'Authorize' : 'Register'}
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-emerald-500 transition-colors">
              {authMode === 'login' ? "Need Access Point?" : "Existing Node?"}
            </button>
          </div>
        );

      case 'home':
        if (!user) return null;
        const tier = TIER_CONFIG[user.tier];
        return (
          <div className="p-8 pb-32 animate-in bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center mb-10">
              <button onClick={() => setActiveScreen('premium')} className="px-4 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-2 group hover:border-emerald-200 transition-all">
                <i className="fa-solid fa-crown text-amber-400"></i>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-700">Elite</span>
              </button>
              <Logo />
              <button onClick={handleLogout} className="w-11 h-11 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 hover:text-red-400 shadow-sm"><i className="fa-solid fa-power-off"></i></button>
            </header>

            <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Bio-Node</h3>
                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-emerald-500/50 text-emerald-400">{user.tier} Plan</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Scans</p>
                  <p className="text-2xl font-black">{Math.max(0, tier.scans - user.scansPerformed)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Uploads</p>
                  <p className="text-2xl font-black">{Math.max(0, tier.uploads - user.uploadsPerformed)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <button onClick={() => setActiveScreen('camera')} className="w-full p-8 bg-white border border-emerald-100 rounded-[40px] shadow-xl shadow-emerald-500/5 group active:scale-[0.98] transition-all">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-bolt"></i></div>
                <h3 className="text-2xl font-black text-slate-900 mb-1">Real-Time Scan</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Scientist Verified Mapping</p>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 bg-white border border-slate-100 rounded-[40px] group active:scale-[0.98] transition-all">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-images"></i></div>
                <h3 className="text-2xl font-black text-slate-900 mb-1">Photo Upload</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Import Biological Data</p>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (user.uploadsPerformed >= tier.uploads) { setActiveScreen('premium'); return; }
                const reader = new FileReader();
                reader.onloadend = () => performAnalysis((reader.result as string).split(',')[1], 'upload');
                reader.readAsDataURL(file);
              }
            }} />
          </div>
        );

      case 'premium':
        return (
          <div className="p-8 pb-32 animate-in bg-slate-50 min-h-screen">
            <header className="flex items-center gap-4 mb-10">
              <button onClick={() => setActiveScreen('home')} className="w-11 h-11 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 shadow-sm"><i className="fa-solid fa-chevron-left"></i></button>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Elite Upgrade</h2>
            </header>
            <div className="bg-emerald-600 p-8 rounded-[40px] text-white mb-10 shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="text-xl font-black mb-6">Payment Transfer Number:</h3>
                  <div className="text-3xl font-black tracking-tighter mb-8 bg-white/20 px-6 py-5 rounded-[24px] inline-block border border-white/20 select-all shadow-inner">
                    {OWNER_PAYMENT_NUMBER}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Send PKR via EasyPaisa or JazzCash.</p>
               </div>
            </div>
            <div className="space-y-4">
              {(['BASIC', 'PRO', 'ELITE'] as TierID[]).map((t) => (
                <div key={t} className={`p-8 rounded-[40px] border-2 transition-all ${user?.tier === t ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="text-xl font-black text-slate-900">{TIER_CONFIG[t].name}</h4>
                    <p className="text-2xl font-black text-emerald-600">{TIER_CONFIG[t].price}</p>
                  </div>
                  <button onClick={() => {
                    if (!currentUser) return;
                    setCurrentUser({...currentUser, pendingTier: t});
                    alert("Verification signal sent to Scientist Admin.");
                  }} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                    {user?.pendingTier === t ? 'Awaiting Verification' : 'Notify Transfer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'camera':
        return (
          <div className="h-screen bg-black relative flex flex-col overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-10">
              <div className="w-full aspect-[3/4] border-2 border-emerald-500/40 rounded-[64px] relative overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.3)]">
                <div className="absolute inset-x-0 top-0 h-2 bg-emerald-400 shadow-[0_0_40px_#10b981] animate-[scan_1.5s_infinite_linear]"></div>
              </div>
            </div>
            <header className="flex justify-between items-center p-8 z-20">
              <button onClick={() => setActiveScreen('home')} className="w-12 h-12 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-xmark"></i></button>
              <div className="px-5 py-2 bg-emerald-500 rounded-full text-white text-[9px] font-black uppercase tracking-[0.2em]">Bio-Scan Node</div>
            </header>
            <div className="mt-auto pb-16 flex flex-col items-center z-20">
               <button onClick={() => {
                 if (canvasRef.current && videoRef.current) {
                   const canvas = canvasRef.current;
                   const video = videoRef.current;
                   canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                   const ctx = canvas.getContext('2d');
                   if (ctx) {
                     ctx.drawImage(video, 0, 0);
                     performAnalysis(canvas.toDataURL('image/jpeg', 0.8).split(',')[1], 'scan');
                   }
                 }
               }} className="w-24 h-24 rounded-full border-4 border-white/20 p-2 active:scale-90 transition-all shadow-2xl">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <i className="fa-solid fa-face-viewfinder text-4xl text-slate-900"></i>
                  </div>
               </button>
               <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        );

      case 'analyzing':
        return (
          <div className="h-screen bg-white flex flex-col items-center justify-center p-12 text-center animate-in">
            <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
               <div className="absolute inset-0 border-[6px] border-emerald-500 rounded-[56px] border-t-transparent animate-spin"></div>
               <i className="fa-solid fa-dna text-5xl text-emerald-500"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Analyzing</h2>
            <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.6em] animate-pulse">{analysisStatus}</p>
          </div>
        );

      case 'report':
      case 'routine':
      case 'nature':
        return (
          <div className="min-h-screen bg-white animate-in">
            <header className="px-8 py-8 border-b border-slate-50 bg-white sticky top-0 z-50 flex items-center justify-between">
               <Logo />
               <div className="bg-emerald-500 text-white text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-xl">Verified Analysis</div>
            </header>
            <AnalysisDisplay result={result} activeTab={activeScreen as any} onTabChange={(tab) => setActiveScreen(tab as any)} isPremium={user?.tier !== 'FREE'} userSensitivity={user?.sensitivity} />
          </div>
        );

      case 'profile':
        if (!user) return null;
        return (
          <div className="p-8 pb-32 animate-in bg-slate-50 min-h-screen">
            <h2 className="text-2xl font-black text-slate-900 mb-12">Bio-Profile</h2>
            <div className="flex flex-col items-center mb-12 text-center">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl mb-6 border-4 border-white">{user.name.charAt(0).toUpperCase()}</div>
              <h3 className="text-2xl font-black text-slate-900">{user.name}</h3>
              <p className="text-slate-400 text-xs font-black uppercase mt-2">{user.email}</p>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorization</p>
                  <span className="font-black text-slate-900 text-base uppercase">{user.tier} ACCESS</span>
                </div>
                <button onClick={() => setActiveScreen('premium')} className="text-emerald-500 text-xs font-black uppercase">Modify</button>
              </div>
              <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] border border-red-100 mt-6 active:scale-95 transition-all">Decommission Node</button>
            </div>
          </div>
        );

      case 'admin_dashboard':
        return (
          <div className="min-h-screen bg-slate-950 p-8 animate-in pb-20">
            <header className="flex justify-between items-center mb-12 text-white">
               <div>
                 <h2 className="text-3xl font-black tracking-tighter">Elite Control</h2>
                 <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Node</p>
               </div>
               <button onClick={() => setActiveScreen(currentUser ? 'home' : 'onboarding')} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
            </header>
            <div className="space-y-4">
              {registeredUsers.length === 0 && <p className="text-slate-600 text-center py-20 font-black italic">Waiting for node connections...</p>}
              {registeredUsers.map((u, i) => (
                <div key={i} className={`p-6 rounded-[32px] border transition-all ${u.pendingTier ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                        <p className="font-black text-lg tracking-tight">{u.name}</p>
                        <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase">{u.email}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${u.pendingTier ? 'bg-white text-emerald-600' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'}`}>{u.tier}</span>
                  </div>
                  {u.pendingTier && (
                    <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                       <p className="text-xs font-black uppercase mb-4 text-center text-white">Upgrade Request: {u.pendingTier}</p>
                       <div className="flex gap-2">
                          <button onClick={() => approveUser(u.email)} className="flex-1 py-4 bg-white text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Verify Transfer</button>
                          <button onClick={() => alert("Ignored.")} className="px-4 py-4 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase"><i className="fa-solid fa-trash"></i></button>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'admin_login':
        return (
          <div className="min-h-screen bg-slate-900 p-10 flex flex-col items-center justify-center animate-in text-white">
            <button onClick={() => setActiveScreen('onboarding')} className="absolute top-10 left-10 text-slate-500 hover:text-emerald-500"><i className="fa-solid fa-chevron-left text-2xl"></i></button>
            <div className="w-20 h-20 bg-emerald-500 rounded-[28px] flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
               <i className="fa-solid fa-key text-3xl"></i>
            </div>
            <h2 className="text-3xl font-black mb-12 tracking-tighter text-center uppercase">Owner Access</h2>
            <form onSubmit={handleAdminLogin} className="w-full max-w-xs space-y-4">
              <input type="email" placeholder="ADMIN ID" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 transition-all text-center font-black tracking-widest uppercase" />
              <input type="password" placeholder="PASSKEY" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 transition-all text-center font-black tracking-widest uppercase" />
              <button className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 mt-6 active:scale-95 transition-all uppercase tracking-[0.2em]">Authorize Node</button>
            </form>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] selection:bg-emerald-100">
      <style>{`
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-in { animation: animateIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(20px); scale: 0.98; } to { opacity: 1; transform: translateY(0); scale: 1; } }
      `}</style>
      <main className="max-w-md mx-auto min-h-screen bg-white relative shadow-2xl overflow-hidden border-x border-slate-100">
        {renderScreen()}
        {['home', 'report', 'routine', 'nature', 'profile', 'premium'].includes(activeScreen) && currentUser && !isAdmin && (
          <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-3xl border-t border-slate-100 px-10 py-5 flex justify-between items-center z-50 rounded-t-[44px] shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
            <button onClick={() => setActiveScreen('home')} className={`text-2xl transition-all ${activeScreen === 'home' ? 'text-emerald-500 scale-125' : 'text-slate-200 hover:text-slate-400'}`}><i className="fa-solid fa-house-chimney"></i></button>
            <button onClick={() => setActiveScreen('routine')} className={`text-2xl transition-all ${activeScreen === 'routine' ? 'text-emerald-500 scale-125' : 'text-slate-200 hover:text-slate-400'}`}><i className="fa-solid fa-vial"></i></button>
            <button onClick={() => setActiveScreen('camera')} className="w-16 h-16 bg-slate-900 text-white rounded-[26px] flex items-center justify-center text-3xl -mt-14 shadow-2xl border-[6px] border-white active:scale-90 transition-all"><i className="fa-solid fa-bolt-lightning"></i></button>
            <button onClick={() => setActiveScreen('nature')} className={`text-2xl transition-all ${activeScreen === 'nature' ? 'text-emerald-500 scale-125' : 'text-slate-200 hover:text-slate-400'}`}><i className="fa-solid fa-leaf"></i></button>
            <button onClick={() => setActiveScreen('profile')} className={`text-2xl transition-all ${['profile', 'premium'].includes(activeScreen) ? 'text-emerald-500 scale-125' : 'text-slate-200 hover:text-slate-400'}`}><i className="fa-solid fa-dna"></i></button>
          </nav>
        )}
      </main>
    </div>
  );
};

export default App;
