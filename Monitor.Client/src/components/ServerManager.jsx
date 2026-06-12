import React, { useState } from 'react';
import { Server, Shield, Activity, Info, Save, X } from 'lucide-react';

const ServerManager = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Form verilerini tuttuğumuz durum (State)
    const [formData, setFormData] = useState({
        serverIp: '',
        certificatePath: '',
        serviceName: '',
        modules: { ram: true, cpu: true, disk: true }
    });

    // Kaydet butonuna basıldığında çalışacak fonksiyon
    const handleSave = async () => {
        // Doğrulama: IP/Sunucu adı boş mu?
        if (!formData.serverIp) {
            alert("Lütfen Sunucu Adı veya IP Adresi giriniz.");
            return;
        }

        try {
            const payload = {
                serverIp: formData.serverIp,
                certificatePath: formData.certificatePath,
                serviceName: formData.serviceName,
                trackRam: formData.modules.ram,
                trackCpu: formData.modules.cpu,
                trackDisk: formData.modules.disk
            };

            const response = await fetch("http://localhost:5027/api/monitor/add-server", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            // Yanıt başarılıysa...
            if (response.ok) {
                alert("Başarılı! Sunucu veritabanına eklendi.");
                setIsOpen(false); 
                window.location.reload();
                setFormData({ serverIp: '', certificatePath: '', serviceName: '', modules: { ram: true, cpu: true, disk: true } });
            } else {
                // Yanıt hatalıysa (Örn: Çift kayıt) API'den gelen mesajı alert ile göster
                const errorData = await response.json();
                alert(`HATA: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Bağlantı Hatası:", error);
            alert("Merkez sunucuya ulaşılamıyor.");
        }
    };

    return (
        <div>
            <div className="flex items-center space-x-3">
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center transition-all shadow-lg shadow-blue-600/30 active:scale-95"
                >
                    <Server className="w-5 h-5 mr-2.5" />
                    Yeni Sunucu Ekle
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/75 flex justify-center items-start pt-10 z-50 backdrop-blur-md overflow-hidden relative">
                    <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)}></div>

                    <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 animate-fade-in-down max-h-[90vh] flex flex-col">
                        
                        <div className="bg-slate-800 p-5 flex justify-between items-center border-b border-slate-700">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center">
                                <Server className="w-6 h-6 mr-2.5 text-blue-400" />
                                Sunucu Konfigürasyon Sihirbazı
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white rounded-full p-1 hover:bg-slate-700 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] flex-grow scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                            
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                                    Sunucu Adı veya IP Adresi
                                    <div className="group relative ml-2">
                                        <Info className="w-4 h-4 text-slate-500 cursor-help" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-slate-800 text-xs text-slate-300 p-2 rounded border border-slate-600 shadow-lg z-20">
                                            Ajanın kurulu olduğu makinenin adını (Örn: AYS-TEST-PC3) veya IP adresini giriniz.
                                        </div>
                                    </div>
                                </label>
                                {/* onChange ile klavyeden girilen değeri state'e kaydediyoruz */}
                                <input 
                                    type="text" 
                                    value={formData.serverIp}
                                    onChange={(e) => setFormData({...formData, serverIp: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Örn: 192.168.1.100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                                        Sertifika Yolu / URL
                                        <div className="group relative ml-2">
                                            <Shield className="w-4 h-4 text-slate-500 cursor-help" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-slate-800 text-xs text-slate-300 p-2 rounded border border-slate-600 shadow-lg z-20">
                                                Dosya yolu (C:\cert.pfx) veya uzak web adresi (https://medas.gov.tr) girebilirsiniz.
                                            </div>
                                        </div>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.certificatePath}
                                        onChange={(e) => setFormData({...formData, certificatePath: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                                        placeholder="C:\Certs\site.pfx"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                                        İzlenecek Servis Adı
                                        <div className="group relative ml-2">
                                            <Activity className="w-4 h-4 text-slate-500 cursor-help" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-slate-800 text-xs text-slate-300 p-2 rounded border border-slate-600 shadow-lg z-20">
                                                Windows Services ekranındaki "Hizmet Adı" kısmını tam olarak yazın. Örn: W3SVC
                                            </div>
                                        </div>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.serviceName}
                                        onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                                        placeholder="Örn: W3SVC"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 shadow-inner">
                                <h3 className="text-sm font-medium text-slate-300 mb-3 uppercase font-mono tracking-wider">İzlenecek Donanım Modülleri</h3>
                                <div className="flex space-x-6">
                                    <label className="flex items-center cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.modules.ram}
                                            onChange={(e) => setFormData({...formData, modules: {...formData.modules, ram: e.target.checked}})}
                                            className="form-checkbox h-5 w-5 text-blue-500 rounded bg-slate-900 border-slate-700 transition-colors group-hover:border-blue-500" 
                                        />
                                        <span className="ml-2 text-slate-300 group-hover:text-white transition-colors">RAM</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.modules.cpu}
                                            onChange={(e) => setFormData({...formData, modules: {...formData.modules, cpu: e.target.checked}})}
                                            className="form-checkbox h-5 w-5 text-blue-500 rounded bg-slate-900 border-slate-700 transition-colors group-hover:border-blue-500" 
                                        />
                                        <span className="ml-2 text-slate-300 group-hover:text-white transition-colors">CPU</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.modules.disk}
                                            onChange={(e) => setFormData({...formData, modules: {...formData.modules, disk: e.target.checked}})}
                                            className="form-checkbox h-5 w-5 text-blue-500 rounded bg-slate-900 border-slate-700 transition-colors group-hover:border-blue-500" 
                                        />
                                        <span className="ml-2 text-slate-300 group-hover:text-white transition-colors">Disk</span>
                                    </label>
                                </div>
                            </div>

                        </div>

                        <div className="bg-slate-800 p-5 flex justify-end space-x-3 border-t border-slate-700 mt-auto">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white font-medium transition-colors"
                            >
                                İptal
                            </button>
                            {/* Kaydet butonuna yazdığımız handleSave metodunu bağlıyoruz */}
                            <button 
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                Sunucuyu Ekle ve İzlemeye Başla
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerManager;