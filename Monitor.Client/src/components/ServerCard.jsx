import React from 'react';
import { Server, Cpu, Activity, RefreshCw, Pencil, Trash2, ShieldAlert } from 'lucide-react';

const ServerCard = ({ data }) => {
    if (data.isWaiting) {
        return (
            <div className="h-full w-full bg-slate-900 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden animate-pulse">
                <RefreshCw className="w-10 h-10 text-blue-500 mb-4 animate-spin" />
                <h3 className="font-bold text-xl text-slate-300 mb-1">{data.metrics.serverName}</h3>
                <p className="text-sm text-blue-400 font-medium">Ajan (Agent) bekleniyor...</p>
                <p className="text-xs text-slate-500 mt-2 text-center">Sunucu eklendi, veri akışı saniyeler içinde başlayacak.</p>
            </div>
        );
    }
    const getRamColor = (percentage) => {
        if (percentage > 90) return 'text-red-400';
        if (percentage > 75) return 'text-orange-400';
        return 'text-emerald-400';
    };

    return (
        <div className="h-full w-full bg-slate-900 text-slate-200 rounded-3xl shadow-xl border border-slate-700/50 p-6 flex flex-col group overflow-hidden relative">
            
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-600 opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            
            <div className="flex items-center justify-between mb-5 border-b border-slate-700 pb-3 relative">
                <div className="flex items-center space-x-3">
                    <Server className="w-6 h-6 text-blue-400" />
                    <h3 className="font-bold text-xl tracking-tight text-white">{data.metrics.serverName}</h3>
                </div>
                
                {/* Yönetim Buton Grubu */}
                <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                        title="Sunucuyu Düzenle"
                        onClick={(e) => {
                            e.stopPropagation(); 
                            alert(`${data.metrics.serverName} düzenleme sihirbazı.`);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    
                    {/* Geliştirilmiş ve Teşhis Uyarıları Eklenmiş Silme Butonu */}
                    <button 
                        className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-600/20 rounded-full transition-colors"
                        title="Sunucuyu Sistemden Sil"
                        onClick={async (e) => {
                            e.stopPropagation(); 
                            if (window.confirm(`${data.metrics.serverName} sunucusunu izleme listesinden çıkarmak istiyor musunuz?`)) {
                                try {
                                    const response = await fetch(`http://localhost:5027/api/monitor/delete-server/${data.metrics.serverName}`, {
                                        method: 'DELETE'
                                    });
                                    
                                    if (response.ok) {
                                        alert("Sunucu başarıyla silindi! Ekran güncelleniyor.");
                                        window.location.reload();
                                    } else {
                                        const errData = await response.text();
                                        alert("Silme başarısız oldu. Sunucu yanıtı: " + errData);
                                    }
                                } catch (err) {
                                    alert("Merkez sunucuya ulaşılamadı: " + err.message);
                                }
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="absolute top-1 right-2 flex items-center space-x-2 group-hover:opacity-0 transition-opacity">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Online</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 flex-grow">
                <div className="bg-slate-950 rounded-xl p-4 flex flex-col justify-center border border-slate-800">
                    <div className="flex items-center space-x-2 mb-1.5">
                        <Cpu className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 uppercase font-medium tracking-widest">CPU</span>
                    </div>
                    <span className="text-2xl font-black text-white">{data.metrics.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 flex flex-col justify-center border border-slate-800">
                    <div className="flex items-center space-x-2 mb-1.5">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 uppercase font-medium tracking-widest">RAM</span>
                    </div>
                    <div className="flex items-baseline space-x-1.5">
                        <span className={`text-2xl font-black ${getRamColor(data.metrics.ramUsagePercentage)}`}>
                            {data.metrics.ramUsagePercentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-600 font-medium">{data.metrics.totalRamGb} GB</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">İzlenen Kritik Servisler</h4>
                <div className="space-y-2.5">
                    {data.services.map((svc, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-100">{svc.displayName}</span>
                                <span className={`text-xs ${svc.isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {svc.isHealthy ? 'Sağlıklı ve Yanıt Veriyor' : 'Hatalı veya Kapalı'}
                                </span>
                            </div>
                            <button 
                                className="p-1.5 bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors border border-blue-500/10"
                                title="Servisi Yeniden Başlat"
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    alert(`${svc.displayName} servisine yeniden başlatma komutu gönderilecek.`);
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {data.certificates.some(c => c.isExpired) && (
                        <div className="flex items-center space-x-2.5 bg-red-600/10 p-2.5 rounded-lg border border-red-500/20 text-red-400 mt-2">
                            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                            <div className='flex flex-col'>
                                <span className="text-sm font-semibold">SSL Sertifika Uyarısı!</span>
                                <span className="text-xs text-red-500/80">Süresi dolmuş sertifika tespit edildi.</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServerCard;