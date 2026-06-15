import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Server, X, Activity, Cpu, HardDrive, Database, Loader2, HelpCircle, Network } from 'lucide-react';

const ServerManager = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [customName, setCustomName] = useState("");
    const [serverIp, setServerIp] = useState("");
    const [services, setServices] = useState([]);
    const [hardware, setHardware] = useState({ cpu: true, ram: true, disk: true, net: true });
    
    const [status, setStatus] = useState({ type: "", message: "" });

    const closeWizardAndReset = () => {
        if (isSubmitting) return; 
        setIsOpen(false); setCustomName(""); setServerIp(""); setServices([]);
        setHardware({ cpu: true, ram: true, disk: true, net: true }); setStatus({ type: "", message: "" });
    };

    const updateListItem = (setter, index, value) => setter(prev => { const newArr = [...prev]; newArr[index] = value; return newArr; });
    const addListItem = (setter) => setter(prev => [...prev, ""]);
    const removeListItem = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (!serverIp.trim()) return setStatus({ type: "error", message: "Hostname/IP alanı zorunludur!" });

        setIsSubmitting(true);
        try {
            const response = await fetch("http://localhost:5027/api/monitor/add-server", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    serverIp, customName: customName.trim() || serverIp, 
                    services: services.filter(s => s.trim() !== ""), 
                    trackCpu: hardware.cpu, trackRam: hardware.ram, trackDisk: hardware.disk, trackNet: hardware.net
                })
            });

            if (response.ok) {
                setStatus({ type: "success", message: "Başarılı! Sunucu ekleniyor..." });
                setTimeout(() => { closeWizardAndReset(); window.location.reload(); }, 1500);
            } else {
                setStatus({ type: "error", message: "İşlem başarısız veya sunucu zaten var." });
                setIsSubmitting(false);
            }
        } catch { setStatus({ type: "error", message: "Bağlantı hatası." }); setIsSubmitting(false); }
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                <Server className="w-4 h-4" /> Yeni Sunucu Ekle
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700 max-w-2xl w-full flex flex-col gap-6 my-8 relative">
                        {isSubmitting && <div className="absolute inset-0 bg-slate-900/40 z-10 rounded-3xl flex items-center justify-center cursor-not-allowed"></div>}
                        <button onClick={closeWizardAndReset} disabled={isSubmitting} className="absolute top-6 right-6 p-2 hover:bg-slate-700 rounded-full transition-colors z-20">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-500/20 rounded-full border border-blue-500/30"><Server className="w-8 h-8 text-blue-400" /></div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100">Yeni Sunucu Ekle</h2>
                                <p className="text-sm text-slate-400 mt-1">Sunucu ve servis bilgilerini yapılandırın.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 relative z-20">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                Sunucu Takma Adı <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">İsteğe Bağlı</span>
                                    <div className="group relative cursor-pointer"><HelpCircle className="w-4 h-4 text-slate-500"/><div className="hidden group-hover:block absolute left-6 -top-2 w-48 bg-slate-900 text-xs p-2 rounded border border-slate-700 z-50">Ekranda büyük harflerle görünecek takma ad. Boş bırakırsanız Hostname kullanılır.</div></div>
                                </label>
                                <input disabled={isSubmitting} type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="Örn: Ankara Veri Merkezi veya Microsoft Sunucuları" />                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">Hostname veya IP <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">Zorunlu</span></label>                                <input disabled={isSubmitting} type="text" value={serverIp} onChange={(e) => setServerIp(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="Örn: dc01.com / 10.20.30.40" />
                            </div>

                            <div className="flex flex-col gap-3 p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                    <label className="text-sm font-bold text-slate-300">Sunucuda İzlenecek Donanım Metrikleri</label>                                <div className="grid grid-cols-4 gap-4 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hardware.cpu} onChange={(e) => setHardware({...hardware, cpu: e.target.checked})} className="w-4 h-4 accent-blue-500" /><span className="text-sm text-slate-400"><Cpu className="w-3 h-3 inline mr-1"/> CPU</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hardware.ram} onChange={(e) => setHardware({...hardware, ram: e.target.checked})} className="w-4 h-4 accent-blue-500" /><span className="text-sm text-slate-400"><HardDrive className="w-3 h-3 inline mr-1"/> RAM</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hardware.disk} onChange={(e) => setHardware({...hardware, disk: e.target.checked})} className="w-4 h-4 accent-blue-500" /><span className="text-sm text-slate-400"><Database className="w-3 h-3 inline mr-1"/> Disk</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hardware.net} onChange={(e) => setHardware({...hardware, net: e.target.checked})} className="w-4 h-4 accent-blue-500" /><span className="text-sm text-slate-400"><Network className="w-3 h-3 inline mr-1"/> Ağ (Net)</span></label>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <Activity className="w-4 h-4"/> Kontrol Edilecek Servisler
                                    <div className="group relative cursor-pointer"><HelpCircle className="w-4 h-4 text-slate-500"/><div className="hidden group-hover:block absolute left-6 -top-2 w-56 bg-slate-900 text-xs p-2 rounded border border-slate-700 z-50">Görev Yöneticisinde "Hizmetler" sekmesinde yazan kod adını girmelisiniz. (Örn: 'Windows Time' yerine 'w32time' yazılır)</div></div>
                                </label>
                                {services.map((svc, index) => (
                                    <div key={`svc-${index}`} className="flex gap-2">
                                        <input type="text" value={svc} onChange={(e) => updateListItem(setServices, index, e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="Servis Adı (Örn: w32time)" />
                                        <button onClick={() => removeListItem(setServices, index)} className="px-4 bg-rose-500/10 text-rose-400 rounded-xl"><X className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button onClick={() => addListItem(setServices)} className="text-left text-sm text-blue-400 font-bold py-1 w-fit">+ Yeni Servis Ekle</button>
                            </div>
                        </div>

                        {status.message && (<div className={`text-sm font-bold p-4 rounded-xl text-center relative z-20 ${status.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{status.message}</div>)}

                        <div className="flex gap-4 pt-4 border-t border-slate-700 relative z-20">
                            <button onClick={handleSave} disabled={isSubmitting} className="flex flex-1 justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50">
                                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Ekleniyor...</> : "Sunucuyu Kaydet ve İzlemeye Başla"}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};
export default ServerManager;