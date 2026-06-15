import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Cpu, HardDrive, RefreshCw, Server, CheckCircle2, XCircle, Edit2, Database, Trash2, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const ServerCard = ({ data }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editCustomName, setEditCustomName] = useState("");
    const [editServices, setEditServices] = useState([]);
    const [editHardware, setEditHardware] = useState({ cpu: true, ram: true, disk: true, net: true });

    const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);
    const [serviceToRestart, setServiceToRestart] = useState(null);
    
    // SİLME VE GÜNCELLEME KİLİTLERİ (LOADING STATELERİ)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingLoader, setIsDeletingLoader] = useState(false);
    const [isUpdatingLoader, setIsUpdatingLoader] = useState(false);
    
    const [isTimeout, setIsTimeout] = useState(false); 
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        let timer;
        if (data.isWaiting) { 
            setTimeout(() => setIsTimeout(false), 0); 
            timer = setTimeout(() => setIsTimeout(true), 10000); 
        } else {
            setIsOffline(false);
            timer = setTimeout(() => setIsOffline(true), 15000);
        }
        return () => clearTimeout(timer);
    }, [data]);

    const handleEditStart = () => {
        setEditCustomName(data.metrics.customName || data.metrics.serverName);
        setEditServices(data.services.length > 0 ? data.services.map(s => s.serviceName) : []);
        setEditHardware({ cpu: data.metrics.trackCpu, ram: data.metrics.trackRam, disk: data.metrics.trackDisk, net: data.metrics.trackNet }); 
        setIsEditing(true);
    };

    const updateList = (setter, index, value) => setter(prev => { const arr = [...prev]; arr[index] = value; return arr; });
    const addToList = (setter) => setter(prev => [...prev, ""]);
    const removeFromList = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));

    // SUNUCU GÜNCELLEME (KİLİTLİ VE SENKRON BİLDİRİMLİ)
    const handleSaveEdit = async () => {
        if (isUpdatingLoader) return;
        setIsUpdatingLoader(true);
        try {
            const res = await fetch("http://localhost:5027/api/monitor/update-server", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverIp: data.serverId, customName: editCustomName, services: editServices.filter(s => s.trim() !== ""), trackCpu: editHardware.cpu, trackRam: editHardware.ram, trackDisk: editHardware.disk, trackNet: editHardware.net })
            });
            if (res.ok) {
                setIsEditing(false);
                setIsUpdatingLoader(false);
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('showGlobalToast', { 
                        detail: { message: `${editCustomName || data.serverId} başarıyla güncellendi.`, type: 'success' } 
                    }));
                }, 100);
            } else { setIsUpdatingLoader(false); }
        } catch (err) { console.error(err); setIsUpdatingLoader(false); }
    };

    // SUNUCU SİLME (KİLİTLİ VE SENKRON BİLDİRİMLİ)
    const confirmDelete = async () => {
        if (isDeletingLoader) return;
        setIsDeletingLoader(true); 
        const targetServerName = data.metrics.customName || data.serverId;

        try { 
            const res = await fetch(`http://localhost:5027/api/monitor/delete-server/${data.serverId}`, { method: "DELETE" }); 
            if (res.ok) {
                setIsDeleteModalOpen(false); 
                setIsDeletingLoader(false); 
                
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('showGlobalToast', { 
                        detail: { message: `${targetServerName} sunucusu silindi.`, type: 'success' } 
                    }));
                }, 100);
                
                setTimeout(() => window.location.reload(), 1000); 
            } else { setIsDeletingLoader(false); }
        } catch (err) { console.error(err); setIsDeletingLoader(false); }
    };

    const confirmRestart = async () => {
        try { 
            await fetch("http://localhost:5027/api/monitor/restart-service", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serverIp: data.serverId, serviceName: serviceToRestart.serviceName }) }); 
            window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { message: 'Restart emri iletildi.', type: 'success' } }));
        } catch (err) { console.error(err); }
        setIsRestartModalOpen(false); setServiceToRestart(null);
    };

    const getUsageBorder = (usage) => {
        if (usage >= 90) return 'border-rose-500/60 text-rose-400';
        if (usage >= 80) return 'border-amber-500/60 text-amber-400';
        return 'border-emerald-500/40 text-emerald-400';
    };

    // PROGRESS BAR RENK ZEKASI
    const getUsageBarColor = (usage) => {
        if (usage >= 90) return 'bg-rose-500';
        if (usage >= 80) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const DeleteModal = () => (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
            <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full text-center border border-rose-500/30">
                <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-100 mb-2">Sunucu Siliniyor!</h3>
                <p className="text-sm text-slate-400 mb-6"><strong>{data.metrics.customName || data.serverId}</strong> sunucusunu kalıcı olarak silmek üzeresiniz. Emin misiniz?</p>
                <div className="flex gap-4">
                    <button disabled={isDeletingLoader} onClick={confirmDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-base font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isDeletingLoader ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Sil"}
                    </button>
                    <button disabled={isDeletingLoader} onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-base font-bold py-3 rounded-xl disabled:opacity-50">
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );

    if (data.isWaiting) {
        return (
            <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-3 flex flex-col items-center justify-center relative shadow-sm min-h-35 group">
                <button onClick={() => setIsDeleteModalOpen(true)} className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                {isDeleteModalOpen && createPortal(<DeleteModal />, document.body)}
                <RefreshCw className="w-8 h-8 mb-3 text-amber-500 animate-spin" />
                <h3 className="font-extrabold text-sm text-slate-200 text-center uppercase wrap-break-word w-full px-4 leading-tight">{data.metrics.customName || data.metrics.serverName}</h3>
                <p className="text-[10px] font-bold mt-2 tracking-wide text-amber-500">Timeout (Bekleniyor...)</p>
            </div>
        );
    }

    const serverOuterBorder = isOffline ? 'border-rose-500/60' : 'border-emerald-500/50';

    return (
        <div className={`bg-slate-900 border ${serverOuterBorder} rounded-xl p-2.5 flex flex-col gap-2 shadow-sm relative group h-full`}>
            
            {isRestartModalOpen && createPortal( <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}><div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full text-center"><h3 className="text-xl font-bold text-slate-100 mb-4">Servis Restart Ediliyor!</h3><p className="text-base text-slate-400 mb-6">{serviceToRestart.displayName}</p><div className="flex gap-4"><button onClick={confirmRestart} className="flex-1 bg-rose-600 text-white text-base font-bold py-3 rounded-xl">Başlat</button><button onClick={() => setIsRestartModalOpen(false)} className="flex-1 bg-slate-700 text-white text-base font-bold py-3 rounded-xl">İptal</button></div></div></div>, document.body )}
            {isDeleteModalOpen && createPortal(<DeleteModal />, document.body)}

            <div className="flex flex-col items-center justify-center relative border-b border-slate-800 pb-2 w-full min-h-11">
                <Server className={`absolute left-1 top-1 w-4 h-4 ${isOffline ? 'text-rose-500' : 'text-blue-500/80'}`} />
                <div className="absolute right-0 top-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleEditStart} className="p-0.5 text-slate-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setIsDeleteModalOpen(true)} className="p-0.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                
                <div className="flex flex-col items-center w-full px-6">
                    <h3 className="text-sm font-extrabold text-slate-100 uppercase text-center wrap-break-word leading-tight w-full">{data.metrics.customName}</h3>
                    {data.metrics.customName !== data.metrics.serverName && <p className="text-[10px] font-mono text-slate-400 text-center wrap-break-word w-full mt-0.5">{data.metrics.serverName}</p>}
                    <div className="flex items-center gap-1 mt-1">
                        {isOffline ? (
                            <><span className="relative flex h-1.5 w-1.5 rounded-full bg-rose-500"></span><span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Çevrimdışı</span></>
                        ) : (
                            <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span><span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Çevrimiçi</span></>
                        )}
                    </div>
                </div>
            </div>

            {isEditing ? (
                <div className="flex flex-col gap-1.5 mt-1">
                    <input type="text" disabled={isUpdatingLoader} value={editCustomName} onChange={(e) => setEditCustomName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded p-1.5 outline-none mb-1 disabled:opacity-50" placeholder="Takma Ad (Örn: TEST)" />
                    <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700">
                        <div className="grid grid-cols-2 gap-1.5">
                            <label className="flex items-center gap-1"><input disabled={isUpdatingLoader} type="checkbox" checked={editHardware.cpu} onChange={(e) => setEditHardware({...editHardware, cpu: e.target.checked})} className="accent-blue-500 w-3 h-3" /><span className="text-[10px] text-slate-300">CPU</span></label>
                            <label className="flex items-center gap-1"><input disabled={isUpdatingLoader} type="checkbox" checked={editHardware.ram} onChange={(e) => setEditHardware({...editHardware, ram: e.target.checked})} className="accent-blue-500 w-3 h-3" /><span className="text-[10px] text-slate-300">RAM</span></label>
                            <label className="flex items-center gap-1"><input disabled={isUpdatingLoader} type="checkbox" checked={editHardware.disk} onChange={(e) => setEditHardware({...editHardware, disk: e.target.checked})} className="accent-blue-500 w-3 h-3" /><span className="text-[10px] text-slate-300">Disk</span></label>
                            <label className="flex items-center gap-1"><input disabled={isUpdatingLoader} type="checkbox" checked={editHardware.net} onChange={(e) => setEditHardware({...editHardware, net: e.target.checked})} className="accent-blue-500 w-3 h-3" /><span className="text-[10px] text-slate-300">Ağ</span></label>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700 flex flex-col gap-1.5">
                        {editServices.map((svc, i) => (
                            <div key={i} className="flex gap-1.5"><input disabled={isUpdatingLoader} type="text" value={svc} onChange={(e) => updateList(setEditServices, i, e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-1.5 outline-none disabled:opacity-50" /><button disabled={isUpdatingLoader} onClick={() => removeFromList(setEditServices, i)} className="text-rose-400 disabled:opacity-50"><X className="w-4 h-4"/></button></div>
                        ))}
                        <button disabled={isUpdatingLoader} onClick={() => addToList(setEditServices)} className="text-[10px] text-blue-400 font-bold disabled:opacity-50">+ Servis Ekle</button>
                    </div>
                    <div className="flex gap-1.5 mt-0.5">
                        <button disabled={isUpdatingLoader} onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isUpdatingLoader ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Kaydet"}
                        </button>
                        <button disabled={isUpdatingLoader} onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded disabled:opacity-50">İptal</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-1.5 h-full">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                            {data.metrics.trackCpu && (
                                // CPU KUTUSU: Progress Bar eklendi, Başlık font-black yapıldı
                                <div className={`relative overflow-hidden flex-1 bg-slate-800/80 p-1.5 pt-2 rounded border ${getUsageBorder(data.metrics.cpuUsage).split(' ')[0]} flex flex-col items-center justify-between text-center transition-colors min-h-16`}>
                                    <div className={`absolute top-0 left-0 h-1 ${getUsageBarColor(data.metrics.cpuUsage)} transition-all duration-500`} style={{ width: `${data.metrics.cpuUsage}%` }}></div>
                                    <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-1"><Cpu className="w-3 h-3"/>CPU</span>
                                    <span className={`text-sm font-bold ${getUsageBorder(data.metrics.cpuUsage).split(' ')[1]}`}>% {data.metrics.cpuUsage}</span>
                                    <span className="text-[9px] font-mono text-slate-400 mt-1">({data.metrics.cpuCores} Çekirdek)</span>
                                </div>
                            )}
                            {data.metrics.trackRam && (
                                // RAM KUTUSU: Progress Bar eklendi, Başlık font-black yapıldı
                                <div className={`relative overflow-hidden flex-1 bg-slate-800/80 p-1.5 pt-2 rounded border ${getUsageBorder(data.metrics.ramUsagePercentage).split(' ')[0]} flex flex-col items-center justify-between text-center transition-colors min-h-16`}>
                                    <div className={`absolute top-0 left-0 h-1 ${getUsageBarColor(data.metrics.ramUsagePercentage)} transition-all duration-500`} style={{ width: `${data.metrics.ramUsagePercentage}%` }}></div>
                                    <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-1"><HardDrive className="w-3 h-3"/>RAM</span>
                                    <span className={`text-sm font-bold ${getUsageBorder(data.metrics.ramUsagePercentage).split(' ')[1]}`}>% {data.metrics.ramUsagePercentage}</span>
                                    <span className="text-[9px] font-mono text-slate-400 mt-1">({((data.metrics.totalRamGb * data.metrics.ramUsagePercentage) / 100).toFixed(1)}/{data.metrics.totalRamGb}G)</span>
                                </div>
                            )}
                        </div>
                        
                        {/* AĞ: Başlık font-black yapıldı */}
                        {data.metrics.trackNet && (
                            <div className="w-full bg-slate-800/80 p-1.5 rounded border border-emerald-500/40 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Activity className="w-3 h-3"/>AĞ (Mbps)</span>
                                <div className="flex justify-around w-full px-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-mono text-blue-400 flex items-center font-bold"><ArrowDownToLine className="w-3.5 h-3.5 mr-1"/>{data.metrics.networkDownloadMbps || 0}</span>
                                        <span className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wider">Download</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-mono text-purple-400 flex items-center font-bold"><ArrowUpFromLine className="w-3.5 h-3.5 mr-1"/>{data.metrics.networkUploadMbps || 0}</span>
                                        <span className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wider">Upload</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DİSKLER: Progress Bar eklendi */}
                    {data.metrics.trackDisk && data.disks?.length > 0 && (
                        <div className="flex flex-col gap-1 mt-0.5">
                            {data.disks.map((disk, idx) => (
                                <div key={idx} className={`relative overflow-hidden flex items-center justify-between gap-1 px-2.5 py-1.5 pt-2 bg-slate-800/50 rounded border flex-1 ${getUsageBorder(disk.usagePercentage).split(' ')[0]} transition-colors`}>
                                    <div className={`absolute top-0 left-0 h-1 ${getUsageBarColor(disk.usagePercentage)} transition-all duration-500`} style={{ width: `${disk.usagePercentage}%` }}></div>
                                    <div className="flex items-center gap-1.5">
                                        <Database className="w-3 h-3 opacity-70"/>
                                        <span className="text-[10px] font-bold text-slate-200">{disk.driveLetter}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300">({Math.floor(disk.totalGb - disk.freeGb)}GB / {Math.floor(disk.totalGb)}GB)</span>
                                    <span className={`text-[10px] font-bold ${getUsageBorder(disk.usagePercentage).split(' ')[1]}`}>% {Math.floor(disk.usagePercentage)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.services.length > 0 && (
                        <div className="flex flex-col gap-1 mt-0.5 flex-1">
                            {data.services.map((svc, idx) => (
                                <div key={idx} className={`flex items-center justify-between py-1 px-1.5 bg-slate-800/30 rounded border ${svc.isHealthy ? 'border-emerald-500/40' : 'border-rose-500/60'} gap-1.5 transition-colors`}>
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div className="text-[9px] font-bold text-slate-200 wrap-break-word leading-tight w-full">
                                            {svc.displayName} <span className="text-slate-400 font-mono font-normal">- {svc.serviceName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => { setServiceToRestart(svc); setIsRestartModalOpen(true); }} className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-[8px] font-bold transition-colors tracking-wider">RESTART</button>
                                        <div className="flex items-center gap-1 bg-slate-900/50 px-1 py-0.5 rounded border border-slate-700/50">
                                            <span className="text-[8px] text-slate-400 font-medium">Durum:</span>
                                            {svc.isHealthy ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServerCard;