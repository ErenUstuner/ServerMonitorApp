import React from 'react';
import Dashboard from './components/Dashboard';
import ServerManager from './components/ServerManager';
import { LayoutGrid } from 'lucide-react'; // İkon paketi

function App() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100">
      
      {/* ANA UYGULAMA HEADER'I: Sticky ve z-index ayarlı */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 shadow-xl">
        <div className="max-w-[95rem] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LayoutGrid className="w-9 h-9 text-blue-500" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Sistem Monitörü</h1>
              <p className="text-slate-400 text-sm mt-0.5">TÜBİTAK - Gerçek Zamanlı Sunucu ve Servis Takip Sistemi</p>
            </div>
          </div>
          
          {/* Yeni sunucu ekleme butonu */}
          <ServerManager />
        </div>
      </header>

      {/* ANA İÇERİK AREA */}
      <main className="max-w-[95rem] mx-auto px-6 py-8">
        <Dashboard />
      </main>

    </div>
  );
}

export default App;