import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, FileCheck} from 'lucide-react';

const CertificateManager = ({ onCertAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [path, setPath] = useState("");
    const [status, setStatus] = useState({ type: "", message: "" });

    const handleSave = async () => {
        if (!path.trim()) return setStatus({ type: "error", message: "Yol zorunludur!" });
        try {
            const response = await fetch("http://localhost:5027/api/monitor/add-certificate", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathOrUrl: path })
            });
            if (response.ok) { setIsOpen(false); setPath(""); onCertAdded(); }
            else setStatus({ type: "error", message: "Eklenemedi." });
        } catch { setStatus({ type: "error", message: "Bağlantı hatası." }); }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                <FileCheck className="w-4 h-4" /> Sertifika Ekle
            </button>
            {isOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-lg w-full flex flex-col gap-6 relative">
                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-700 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Shield className="w-6 h-6 text-emerald-500"/> Yeni Sertifika İzle</h2>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">Web URL veya Ağ Yolu (UNC) <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">Zorunlu</span></label>
                            <input type="text" value={path} onChange={(e) => setPath(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-emerald-500 outline-none" placeholder="Örn: https://google.com VEYA \\SUNUCU\C$\cert.crt" />
                            <p className="text-xs text-slate-500 mt-1"><strong className="text-slate-400">Nasıl Çalışır?</strong> Merkez sunucu "https://" ile başlayan adreslerin anında SSL portuna bağlanıp geçerliliğini kontrol eder. "\\" ile başlayan ağ yollarından (Paylaşımlı Klasör) ise .crt / .cer dosyalarını direkt okur.</p>
                        </div>

                        {status.message && <div className="text-sm font-bold p-3 rounded-lg text-rose-400 bg-rose-500/10">{status.message}</div>}

                        <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg mt-2">Sertifikayı Ekle</button>
                    </div>
                </div>, document.body
            )}
        </>
    );
};
export default CertificateManager;