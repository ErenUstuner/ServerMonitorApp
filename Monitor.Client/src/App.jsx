import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ServerManager from './components/ServerManager';
import CertificateManager from './components/CertificateManager';
import { LayoutGrid, MonitorPlay, CheckCircle2, AlertCircle } from 'lucide-react';

function App() {
  const [isIdle, setIsIdle] = useState(false);
  const [toasts, setToasts] = useState([]);

  // SAĞ ALT BİLDİRİM (TOAST) YÖNETİMİ
  useEffect(() => {
    const handleToast = (e) => {
      const newToast = { id: Date.now(), ...e.detail };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== newToast.id)); }, 4000);
    };
    window.addEventListener('showGlobalToast', handleToast);
    return () => window.removeEventListener('showGlobalToast', handleToast);
  }, []);

  // HAREKETSİZLİK MODU (Wallboard)
  useEffect(() => {
    let timeoutId;
    const resetTimer = () => { setIsIdle(false); clearTimeout(timeoutId); timeoutId = setTimeout(() => setIsIdle(true), 15000); };
    window.addEventListener('mousemove', resetTimer); window.addEventListener('keydown', resetTimer);
    resetTimer();
    return () => { window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer); clearTimeout(timeoutId); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100 overflow-x-hidden relative">
      
      {/* SAĞ ALT BİLDİRİMLER (TOASTS) */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all animate-in slide-in-from-right-8 ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/90 border-rose-500/50 text-rose-400'}`}>
            {t.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{t.message}</span>
          </div>
        ))}
      </div>

      {/* ANA UYGULAMA HEADER'I */}
      <header className={`sticky top-0 z-30 transition-all duration-700 ${isIdle ? 'h-7 bg-slate-950 opacity-50' : 'bg-slate-900/90 backdrop-blur-md border-b border-slate-700 shadow-xl'}`}>
        {isIdle ? (
          <div className="flex items-center justify-center w-full h-full text-slate-500 tracking-[0.3em] font-extrabold text-[10px] uppercase gap-2">
            <MonitorPlay className="w-3 h-3"/> TÜBİTAK - SİSTEM İZLEME MONİTÖRÜ
          </div>
        ) : (
          <div className="w-full px-5 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LayoutGrid className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">Sistem Monitörü</h1>
                <p className="text-slate-400 text-xs font-medium mt-0.5">TÜBİTAK - Gerçek Zamanlı Sunucu ve Servis Takip Sistemi</p>
              </div>
            </div>
            
            {/* BUTONLAR ANA BAŞLIĞA TAŞINDI */}
            <div className="flex items-center gap-3">
              <CertificateManager onCertAdded={() => window.dispatchEvent(new Event('refreshCerts'))} />
              <ServerManager />
            </div>
          </div>
        )}
      </header>

      <main className="w-full p-2">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;