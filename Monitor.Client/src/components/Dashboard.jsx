import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import signalRService from '../services/SignalRService';
import ServerCard from './ServerCard';
import CertificateManager from './CertificateManager';
import { RefreshCw, Trash2, FileCheck, MonitorDot, Grip, FolderPlus, Settings2, Edit2 } from 'lucide-react';

const Dashboard = () => {
    // 1. TEMEL VERİLER
    const [servers, setServers] = useState({});
    const [globalCerts, setGlobalCerts] = useState([]);
    const [loadingCerts, setLoadingCerts] = useState(true);

    // 2. KİLİTLER VE MODALLAR
    const [certToDelete, setCertToDelete] = useState(null);
    const [isDeletingCert, setIsDeletingCert] = useState(false);
    const [editingCertId, setEditingCertId] = useState(null);
    const [editCertPath, setEditCertPath] = useState("");
    const [isUpdatingCert, setIsUpdatingCert] = useState(false);

    // 3. DRAG & DROP VE KALICI (LOCALSTORAGE) GRUPLAMA MİMARİSİ
    const [isEditMode, setIsEditMode] = useState(false);
    
    const [sectionOrder, setSectionOrder] = useState(() => JSON.parse(localStorage.getItem('sectionOrder')) || ['certs', 'servers']);
    const [serverLayout, setServerLayout] = useState(() => JSON.parse(localStorage.getItem('serverLayout')) || []); 
    const [serverGroups, setServerGroups] = useState(() => JSON.parse(localStorage.getItem('serverGroups')) || []); 
    const [certLayout, setCertLayout] = useState(() => JSON.parse(localStorage.getItem('certLayout')) || []); 
    const [certGroups, setCertGroups] = useState(() => JSON.parse(localStorage.getItem('certGroups')) || []); 

    useEffect(() => { localStorage.setItem('sectionOrder', JSON.stringify(sectionOrder)); }, [sectionOrder]);
    useEffect(() => { localStorage.setItem('serverLayout', JSON.stringify(serverLayout)); }, [serverLayout]);
    useEffect(() => { localStorage.setItem('serverGroups', JSON.stringify(serverGroups)); }, [serverGroups]);
    useEffect(() => { localStorage.setItem('certLayout', JSON.stringify(certLayout)); }, [certLayout]);
    useEffect(() => { localStorage.setItem('certGroups', JSON.stringify(certGroups)); }, [certGroups]);

    // Modallar
    const [isServerGroupModalOpen, setIsServerGroupModalOpen] = useState(false);
    const [isCertGroupModalOpen, setIsCertGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedGroupItems, setSelectedGroupItems] = useState([]);
    
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupItems, setEditGroupItems] = useState([]);

    const dragItemRef = useRef(null);
    const dragOverItemRef = useRef(null);

    // ==========================================
    // API VE SİNYAL İŞLEMLERİ
    // ==========================================
    const fetchCerts = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:5027/api/monitor/get-certificates");
            if (res.ok) {
                const data = await res.json();
                setGlobalCerts(data);
                setCertLayout(prev => {
                    const existingIds = new Set();
                    prev.forEach(id => existingIds.add(id));
                    certGroups.forEach(g => g.items.forEach(id => existingIds.add(id)));
                    const newIds = data.map(c => c.id).filter(id => !existingIds.has(id));
                    return [...prev, ...newIds];
                });
            }
        } catch (err) { console.error(err); } 
        finally { setLoadingCerts(false); }
    }, [certGroups]);

    useEffect(() => {
        window.addEventListener('refreshCerts', fetchCerts);
        return () => window.removeEventListener('refreshCerts', fetchCerts);
    }, [fetchCerts]);

    useEffect(() => {
        const fetchTrackedServers = async () => {
            try {
                const response = await fetch("http://localhost:5027/api/monitor/get-servers");
                if (response.ok) {
                    const dbServers = await response.json();
                    setServers(prevServers => {
                        const newState = { ...prevServers };
                        dbServers.forEach(dbServer => {
                            const key = dbServer.serverIp.toUpperCase();
                            if (!newState[key]) {
                                newState[key] = {
                                    serverId: dbServer.serverIp, isWaiting: true, 
                                    metrics: { customName: dbServer.customName, serverName: dbServer.serverIp, trackCpu: dbServer.trackCpu, trackRam: dbServer.trackRam, trackDisk: dbServer.trackDisk, trackNet: dbServer.trackNet },
                                    services: []
                                };
                            }
                        });
                        return newState;
                    });

                    setServerLayout(prev => {
                        const existingIds = new Set();
                        prev.forEach(id => existingIds.add(id));
                        serverGroups.forEach(g => g.items.forEach(id => existingIds.add(id)));
                        const newIds = dbServers.map(s => s.serverIp.toUpperCase()).filter(id => !existingIds.has(id));
                        return [...prev, ...newIds]; 
                    });
                }
            } catch (err) { console.error(err); }
        };

        fetchTrackedServers(); fetchCerts();

        signalRService.startConnection();
        const handleServerData = (payload) => {
            setServers(prev => {
                const incomingId = payload.serverId.toUpperCase();
                if (!prev[incomingId]) return prev; 
                return { ...prev, [incomingId]: { ...payload, isWaiting: false } };
            });
        };
        
        signalRService.subscribe(handleServerData);
        return () => signalRService.unsubscribe(handleServerData);
    }, [fetchCerts, serverGroups]);

    // ==========================================
    // SİLME VE GÜNCELLEME İŞLEMLERİ
    // ==========================================
    const confirmDeleteCert = async () => {
        if (!certToDelete || isDeletingCert) return;
        setIsDeletingCert(true);
        const targetCert = certToDelete; 
        
        try {
            const res = await fetch(`http://localhost:5027/api/monitor/delete-certificate/${targetCert.id}`, { method: "DELETE" });
            if (res.ok) {
                setCertLayout(prev => prev.filter(id => id !== targetCert.id));
                setCertGroups(prev => prev.map(g => ({ ...g, items: g.items.filter(id => id !== targetCert.id) })));
                
                setCertToDelete(null); setIsDeletingCert(false); 
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { message: `Sertifika silindi: ${targetCert.subject}`, type: 'success' } }));
                }, 100);
                await fetchCerts(); 
            } else { setIsDeletingCert(false); }
        } catch (err) { console.error(err); setIsDeletingCert(false); }
    };

    const handleSaveCertEdit = async (id) => {
        if (isUpdatingCert) return;
        setIsUpdatingCert(true);
        try {
            const res = await fetch("http://localhost:5027/api/monitor/update-certificate", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, path: editCertPath })
            });
            if (res.ok) {
                setEditingCertId(null); setIsUpdatingCert(false);
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { message: 'Sertifika başarıyla güncellendi.', type: 'success' } }));
                }, 100);
                fetchCerts();
            } else { setIsUpdatingCert(false); }
        } catch (err) { console.error(err); setIsUpdatingCert(false); }
    };

    // ==========================================
    // AKILLI SÜRÜKLE BIRAK (DRAG & DROP) MOTORU
    // ==========================================
    const handleDragStart = (e, type, id, groupId = null) => {
        dragItemRef.current = { type, id, groupId };
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragOver = (e, type, id, groupId = null) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (!dragItemRef.current) return;
        dragOverItemRef.current = { type, id, groupId };
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const dragItem = dragItemRef.current;
        const dragOver = dragOverItemRef.current;
        if (!dragItem || !dragOver) return;

        let type = dragItem.type;
        let dragId = dragItem.id;
        let dropId = dragOver.id;
        let dragGroup = dragItem.groupId;
        let dropGroup = dragOver.groupId;

        if (dragId === dropId) return; 

        if (type === 'section' && dragOver.type === 'section') {
            const newOrder = [...sectionOrder];
            const fromIdx = newOrder.indexOf(dragId);
            const toIdx = newOrder.indexOf(dropId);
            if(fromIdx === -1 || toIdx === -1) return;
            const [moved] = newOrder.splice(fromIdx, 1);
            newOrder.splice(toIdx, 0, moved);
            setSectionOrder(newOrder);
        } 
        else if (type.startsWith('server') && dragOver.type.startsWith('server')) {
            if (!dragGroup && dropGroup) { dropId = dropGroup; dropGroup = null; }
            else if (dragGroup && !dropGroup) return; 
            if (dragGroup !== dropGroup) return; 

            if (dragGroup) {
                const gIdx = serverGroups.findIndex(g => g.id === dragGroup);
                const newGroups = [...serverGroups];
                const items = [...newGroups[gIdx].items];
                const fromIdx = items.indexOf(dragId);
                const toIdx = items.indexOf(dropId);
                if(fromIdx === -1 || toIdx === -1) return;
                const [moved] = items.splice(fromIdx, 1);
                items.splice(toIdx, 0, moved);
                newGroups[gIdx].items = items;
                setServerGroups(newGroups);
            } else {
                const newLayout = [...serverLayout];
                const fromIdx = newLayout.indexOf(dragId);
                const toIdx = newLayout.indexOf(dropId);
                if(fromIdx === -1 || toIdx === -1) return;
                const [moved] = newLayout.splice(fromIdx, 1);
                newLayout.splice(toIdx, 0, moved);
                setServerLayout(newLayout);
            }
        } 
        else if (type.startsWith('cert') && dragOver.type.startsWith('cert')) {
            if (!dragGroup && dropGroup) { dropId = dropGroup; dropGroup = null; }
            else if (dragGroup && !dropGroup) return;
            if (dragGroup !== dropGroup) return;

            if (dragGroup) {
                const gIdx = certGroups.findIndex(g => g.id === dragGroup);
                const newGroups = [...certGroups];
                const items = [...newGroups[gIdx].items];
                const fromIdx = items.indexOf(dragId);
                const toIdx = items.indexOf(dropId);
                if(fromIdx === -1 || toIdx === -1) return;
                const [moved] = items.splice(fromIdx, 1);
                items.splice(toIdx, 0, moved);
                newGroups[gIdx].items = items;
                setCertGroups(newGroups);
            } else {
                const newLayout = [...certLayout];
                const fromIdx = newLayout.indexOf(dragId);
                const toIdx = newLayout.indexOf(dropId);
                if(fromIdx === -1 || toIdx === -1) return;
                const [moved] = newLayout.splice(fromIdx, 1);
                newLayout.splice(toIdx, 0, moved);
                setCertLayout(newLayout);
            }
        }
        dragItemRef.current = null; dragOverItemRef.current = null;
    };

    // ==========================================
    // GRUPLAMA VE DÜZENLEME MANTIKLARI
    // ==========================================
    const createServerGroup = () => {
        if (!newGroupName || selectedGroupItems.length === 0) return;
        const newGroupId = `sg_${Date.now()}`;
        setServerGroups([...serverGroups, { id: newGroupId, name: newGroupName, items: selectedGroupItems }]);
        const newLayout = serverLayout.filter(id => !selectedGroupItems.includes(id));
        newLayout.unshift(newGroupId);
        setServerLayout(newLayout);
        setIsServerGroupModalOpen(false); setNewGroupName(""); setSelectedGroupItems([]);
    };

    const createCertGroup = () => {
        if (!newGroupName || selectedGroupItems.length === 0) return;
        const newGroupId = `cg_${Date.now()}`;
        setCertGroups([...certGroups, { id: newGroupId, name: newGroupName, items: selectedGroupItems }]);
        const newLayout = certLayout.filter(id => !selectedGroupItems.includes(id));
        newLayout.unshift(newGroupId);
        setCertLayout(newLayout);
        setIsCertGroupModalOpen(false); setNewGroupName(""); setSelectedGroupItems([]);
    };

    const saveGroupEdit = () => {
        if (!groupToEdit || !editGroupName || editGroupItems.length === 0) return;

        if (groupToEdit.type === 'server') {
            const gIdx = serverGroups.findIndex(g => g.id === groupToEdit.id);
            const updatedGroups = [...serverGroups];
            const oldItems = updatedGroups[gIdx].items;
            updatedGroups[gIdx] = { ...updatedGroups[gIdx], name: editGroupName, items: editGroupItems };

            let newLayout = [...serverLayout];
            const addedItems = editGroupItems.filter(id => !oldItems.includes(id));
            newLayout = newLayout.filter(id => !addedItems.includes(id));
            const removedItems = oldItems.filter(id => !editGroupItems.includes(id));
            newLayout = [...newLayout, ...removedItems];

            setServerGroups(updatedGroups);
            setServerLayout(newLayout);
        } else {
            const gIdx = certGroups.findIndex(g => g.id === groupToEdit.id);
            const updatedGroups = [...certGroups];
            const oldItems = updatedGroups[gIdx].items;
            updatedGroups[gIdx] = { ...updatedGroups[gIdx], name: editGroupName, items: editGroupItems };

            let newLayout = [...certLayout];
            const addedItems = editGroupItems.filter(id => !oldItems.includes(id));
            newLayout = newLayout.filter(id => !addedItems.includes(id));
            const removedItems = oldItems.filter(id => !editGroupItems.includes(id));
            newLayout = [...newLayout, ...removedItems];

            setCertGroups(updatedGroups);
            setCertLayout(newLayout);
        }
        window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { message: `${editGroupName} grubu güncellendi.`, type: 'success' } }));
        setGroupToEdit(null);
    };

    const confirmDeleteGroup = () => {
        if (!groupToDelete) return;
        if (groupToDelete.type === 'server') {
            const group = serverGroups.find(g => g.id === groupToDelete.id);
            setServerLayout([...serverLayout.filter(id => id !== groupToDelete.id), ...group.items]);
            setServerGroups(serverGroups.filter(g => g.id !== groupToDelete.id));
        } else {
            const group = certGroups.find(g => g.id === groupToDelete.id);
            setCertLayout([...certLayout.filter(id => id !== groupToDelete.id), ...group.items]);
            setCertGroups(certGroups.filter(g => g.id !== groupToDelete.id));
        }
        window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { message: `${groupToDelete.name} grubu çözüldü.`, type: 'success' } }));
        setGroupToDelete(null);
    };

    const isServerWarning = (server) => {
        if (!server) return false;
        if (server.isWaiting) return true;
        const timeDiff = new Date() - new Date(server.timestamp);
        if (timeDiff > 15000) return true;
        if (server.metrics.cpuUsage >= 80) return true;
        if (server.metrics.ramUsagePercentage >= 80) return true;
        if (server.disks?.some(d => d.usagePercentage >= 80)) return true;
        if (server.services?.some(s => !s.isHealthy)) return true;
        return false;
    };

    const isCertWarning = (cert) => {
        if (!cert) return false;
        const daysLeft = Math.ceil((new Date(cert.end) - new Date()) / (1000 * 60 * 60 * 24));
        if (!cert.isValid || daysLeft <= 1) return true;
        return false;
    };

    // ==========================================
    // RENDER MİMARİSİ (BÖLÜMLER)
    // ==========================================
    const serverList = Object.values(servers);

    // KUSURSUZ ŞEFFAFLIK EFEKTİ VE SÜRÜKLEME KABI
    const renderDraggableWrapper = (type, id, groupId, children, wrapperClass = "", inlineStyle = {}) => (
        <div 
            key={id}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, type, id, groupId)}
            onDragEnter={(e) => handleDragEnter(e, type, id, groupId)}
            onDragOver={(e) => handleDragOver(e, type, id, groupId)}
            onDrop={handleDrop}
            className={`relative ${wrapperClass}`}
            style={inlineStyle}
        >
            {isEditMode && (
                <div className="absolute inset-0 z-40 bg-transparent rounded-xl flex items-center justify-center cursor-grab border-[3px] border-dashed border-blue-500/50 hover:bg-blue-500/10 transition-colors pointer-events-none">
                    <div className="bg-blue-600/90 text-white p-2 rounded-full shadow-lg shadow-blue-500/30 animate-pulse pointer-events-none">
                        <Grip className="w-5 h-5 pointer-events-none" />
                    </div>
                </div>
            )}
            {children}
        </div>
    );

    const renderSingleCert = (cert) => {
        const daysLeft = Math.ceil((new Date(cert.end) - new Date()) / (1000 * 60 * 60 * 24));
        let certBorder = "border-emerald-500/50"; 
        if (!cert.isValid || daysLeft <= 0) certBorder = "border-rose-500/60"; 
        else if (daysLeft <= 1) certBorder = "border-amber-500/60"; 

        return (
            // DİNAMİK SIKIŞAN KUTU (min-w-0 ve h-24 ile kutu taşması yasaklandı)
            <div className={`bg-slate-800/80 p-1.5 rounded-lg border ${certBorder} flex flex-col justify-center items-center text-center group relative transition-all h-24 w-full overflow-hidden`}>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-30">
                    <button onClick={() => { setEditingCertId(cert.id); setEditCertPath(cert.path); }} className="p-1 text-slate-500 hover:text-blue-400"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => setCertToDelete(cert)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                </div>
                {editingCertId === cert.id ? (
                    <div className="flex flex-col gap-1 w-full relative z-30">
                        <input type="text" disabled={isUpdatingCert} value={editCertPath} onChange={(e) => setEditCertPath(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[9px] p-1 rounded outline-none disabled:opacity-50" placeholder="Ağ Yolu veya URL" />
                        <div className="flex gap-1 w-full">
                            <button disabled={isUpdatingCert} onClick={() => handleSaveCertEdit(cert.id)} className="flex-1 bg-emerald-600 text-white text-[9px] font-bold py-1 rounded flex items-center justify-center gap-1 disabled:opacity-50"><RefreshCw className={isUpdatingCert ? "w-2 h-2 animate-spin" : "hidden"} /> Kaydet</button>
                            <button disabled={isUpdatingCert} onClick={() => setEditingCertId(null)} className="flex-1 bg-slate-700 text-slate-300 text-[9px] font-bold py-1 rounded disabled:opacity-50">İptal</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-1 mb-0.5 w-full px-1">
                            <FileCheck className={`w-3.5 h-3.5 shrink-0 ${certBorder.includes('rose') ? 'text-rose-400' : (certBorder.includes('amber') ? 'text-amber-400' : 'text-emerald-400')}`}/>
                            <span className="text-[10px] font-bold text-slate-200 truncate">{cert.subject}</span>
                        </div>
                        {/* HATA PATH DÜZELTMESİ: break-all ile alt satıra geçer, kutu büyümez, sığmazsa gizlenir */}
                        {cert.subject === "Okuma Hatası" && <span className="text-[8px] font-mono text-slate-400 break-all whitespace-normal w-full mt-0.5 opacity-90 px-1 leading-[11px] overflow-hidden">{cert.path}</span>}
                        <span className={`text-[9px] font-black mt-auto shrink-0 ${certBorder.includes('rose') ? 'text-rose-500' : (certBorder.includes('amber') ? 'text-amber-400' : 'text-emerald-400')}`}>Bitiş: {cert.isValid ? new Date(cert.end).toLocaleDateString() : 'Geçersiz'}</span>
                    </>
                )}
            </div>
        );
    };

    const renderCertsSection = () => (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl shadow-md w-full mb-2">
            <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><FileCheck className="w-4 h-4 text-emerald-500"/> Sertifika İzleme</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsCertGroupModalOpen(true)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border border-emerald-500/30"><FolderPlus className="w-3.5 h-3.5"/> Sertifika Grubu Oluştur</button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border ${isEditMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}><Settings2 className="w-3.5 h-3.5"/> Düzenle</button>
                </div>
            </div>
            
            {loadingCerts ? <div className="text-sm text-slate-400 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin"/> Yükleniyor...</div> : (
                // SIFIR KAYDIRMA (NO SCROLL): flex-nowrap ile zorla yan yana sıkıştırır
                <div className="flex flex-nowrap gap-1.5 items-stretch w-full">
                    {certLayout.map(itemId => {
                        if (typeof itemId === 'string' && itemId.startsWith('cg_')) {
                            const group = certGroups.find(g => g.id === itemId);
                            if (!group) return null;
                            const isWarning = group.items.some(id => isCertWarning(globalCerts.find(c => c.id === id)));
                            const borderColor = isWarning ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';

                            // AKILLI GENİŞLİK MATEMATİĞİ: Grubun içindeki eleman sayısı kadar flexGrow alır. Dışarıdaki 1 birim yerken, 3'lü grup 3 birim yer.
                            const flexRatio = Math.max(1, group.items.length);

                            return renderDraggableWrapper('certLayoutItem', itemId, null, (
                                <div className={`p-1.5 rounded-xl border-2 ${borderColor} bg-slate-950/40 relative pt-8 h-full flex flex-col group/headerBox w-full`}>
                                    <h3 className="absolute top-0 left-0 right-0 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-900/80 py-1.5 rounded-t-xl border-b border-inherit flex items-center justify-center gap-2">
                                        {group.name} 
                                        <div className="absolute right-2 opacity-0 group-hover/headerBox:opacity-100 flex items-center gap-1 z-50 transition-opacity">
                                            <button onClick={() => { setGroupToEdit({ ...group, type: 'cert' }); setEditGroupName(group.name); setEditGroupItems([...group.items]); }} className="text-emerald-500 hover:text-emerald-400 p-1"><Edit2 className="w-3.5 h-3.5"/></button>
                                            <button onClick={() => setGroupToDelete({ id: group.id, name: group.name, type: 'cert' })} className="text-rose-500 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    </h3>
                                    {/* GRUP İÇİ SIKIŞMA */}
                                    <div className="flex flex-nowrap gap-1.5 w-full h-full items-stretch">
                                        {group.items.map(cId => {
                                            const cert = globalCerts.find(c => c.id === cId);
                                            if (!cert) return null;
                                            return renderDraggableWrapper('certGroupItem', cId, group.id, renderSingleCert(cert), "min-w-0 h-full", { flexGrow: 1, flexBasis: 0 });
                                        })}
                                    </div>
                                </div>
                            ), "min-w-0", { flexGrow: flexRatio, flexBasis: 0 });
                        } else {
                            const cert = globalCerts.find(c => c.id === itemId);
                            if (!cert) return null;
                            return renderDraggableWrapper('certLayoutItem', itemId, null, renderSingleCert(cert), "min-w-0 h-full", { flexGrow: 1, flexBasis: 0 });
                        }
                    })}
                </div>
            )}
        </div>
    );

    const renderServersSection = () => (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl shadow-md w-full flex-1">
            <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><MonitorDot className="w-4 h-4 text-blue-500"/> Sunucu İzleme</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsServerGroupModalOpen(true)} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border border-blue-500/30"><FolderPlus className="w-3.5 h-3.5"/> Sunucu Grubu Oluştur</button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border ${isEditMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}><Settings2 className="w-3.5 h-3.5"/> Düzenle</button>
                </div>
            </div>
            
            {serverList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[30vh] border-2 border-dashed border-slate-800 rounded-3xl"><p className="text-slate-500 text-lg font-bold">İzleme Listesi Boş</p></div>
            ) : (
                // SUNUCULAR İÇİN TAM YAN YANA SIĞMALI 6'LI CSS GRID MİMARİSİ
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 w-full items-stretch">
                    {serverLayout.map(itemId => {
                        if (itemId.startsWith('sg_')) {
                            const group = serverGroups.find(g => g.id === itemId);
                            if (!group) return null;
                            const isWarning = group.items.some(id => isServerWarning(servers[id]));
                            const borderColor = isWarning ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';

                            // DİNAMİK GRID COL SPAN: Sunucu Grubu sadece içindeki eleman kadar (Max 6) hücre kaplar, ekranı işgal etmez
                            const serverSpan = Math.max(1, Math.min(group.items.length, 6));
                            const groupStyle = { gridColumn: `span ${serverSpan} / span ${serverSpan}` };
                            const innerGridStyle = { display: 'grid', gridTemplateColumns: `repeat(${serverSpan}, minmax(0, 1fr))`, gap: '0.625rem' };

                            return renderDraggableWrapper('serverLayoutItem', itemId, null, (
                                <div style={groupStyle} className={`p-2.5 px-3 pb-3 rounded-2xl border-2 ${borderColor} bg-slate-950/40 relative pt-12 w-full h-full group/headerBox`}>
                                    <h3 className="absolute top-0 left-0 right-0 text-center text-[11px] font-black text-slate-300 uppercase tracking-widest bg-slate-900/80 py-1.5 rounded-t-xl border-b border-inherit flex items-center justify-center gap-2">
                                        {group.name} 
                                        <div className="absolute right-2 opacity-0 group-hover/headerBox:opacity-100 flex items-center gap-1 z-50 transition-opacity">
                                            <button onClick={() => { setGroupToEdit({ ...group, type: 'server' }); setEditGroupName(group.name); setEditGroupItems([...group.items]); }} className="text-blue-500 hover:text-blue-400 p-1"><Edit2 className="w-3.5 h-3.5"/></button>
                                            <button onClick={() => setGroupToDelete({ id: group.id, name: group.name, type: 'server' })} className="text-rose-500 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    </h3>
                                    {/* GRUP İÇİ IZGARA (Dışarıdaki ile hizalı tekli kutular) */}
                                    <div style={innerGridStyle} className="w-full h-full">
                                        {group.items.map(sId => {
                                            const server = servers[sId];
                                            if (!server) return null;
                                            return renderDraggableWrapper('serverGroupItem', sId, group.id, <ServerCard data={server} />);
                                        })}
                                    </div>
                                </div>
                            ), "col-span-full 2xl:col-auto"); 
                        } else {
                            const server = servers[itemId];
                            if (!server) return null;
                            return renderDraggableWrapper('serverLayoutItem', itemId, null, <ServerCard data={server} />);
                        }
                    })}
                </div>
            )}
        </div>
    );

    // ==========================================
    // ANA EKRAN DÖNÜŞÜ (RETURN)
    // ==========================================
    return (
        <div className="w-full max-w-full m-0 p-1 flex flex-col gap-2 font-sans overflow-x-hidden">
            
            {/* GRUP DÜZENLEME MODALI */}
            {groupToEdit && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                    <div className={`bg-slate-800 p-6 rounded-3xl max-w-md w-full border shadow-2xl ${groupToEdit.type === 'server' ? 'border-blue-500/30' : 'border-emerald-500/30'}`}>
                        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2"><Edit2 className={`w-5 h-5 ${groupToEdit.type === 'server' ? 'text-blue-500' : 'text-emerald-500'}`}/> Grup Düzenle</h3>
                        <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="Grup Adı" className={`w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white mb-4 outline-none focus:border-${groupToEdit.type === 'server' ? 'blue' : 'emerald'}-500`} />
                        
                        <div className="max-h-48 overflow-y-auto mb-4 border border-slate-700 rounded-xl p-2 bg-slate-900/50 flex flex-col gap-1 custom-scrollbar">
                            {groupToEdit.type === 'server' 
                                ? Array.from(new Set([...serverLayout.filter(id => !id.startsWith('sg_')), ...groupToEdit.items])).map(id => {
                                    const s = servers[id]; if (!s) return null;
                                    return (
                                        <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                            <input type="checkbox" checked={editGroupItems.includes(id)} onChange={(e) => { e.target.checked ? setEditGroupItems([...editGroupItems, id]) : setEditGroupItems(editGroupItems.filter(i => i !== id)); }} className="accent-blue-500 w-4 h-4" />
                                            <span className="text-xs font-bold text-slate-300 wrap-break-word">{s.metrics.customName || s.serverId}</span>
                                        </label>
                                    );
                                })
                                : Array.from(new Set([...certLayout.filter(id => typeof id === 'number'), ...groupToEdit.items])).map(id => {
                                    const c = globalCerts.find(cert => cert.id === id); if (!c) return null;
                                    return (
                                        <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                            <input type="checkbox" checked={editGroupItems.includes(id)} onChange={(e) => { e.target.checked ? setEditGroupItems([...editGroupItems, id]) : setEditGroupItems(editGroupItems.filter(i => i !== id)); }} className="accent-emerald-500 w-4 h-4" />
                                            <span className="text-xs font-bold text-slate-300 wrap-break-word">{c.subject}</span>
                                        </label>
                                    );
                                })
                            }
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveGroupEdit} disabled={!editGroupName || editGroupItems.length === 0} className={`flex-1 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 ${groupToEdit.type === 'server' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Kaydet</button>
                            <button onClick={() => setGroupToEdit(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl">İptal</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* GRUP SİLME ONAY MODALI */}
            {groupToDelete && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                    <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full text-center border border-rose-500/30 shadow-2xl">
                        <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-100 mb-2">Grup Çözülüyor!</h3>
                        <p className="text-sm text-slate-400 mb-6"><strong>{groupToDelete.name}</strong> grubunu silmek istediğinize emin misiniz?<br/><br/><span className="text-xs text-amber-500 bg-amber-500/10 px-3 py-1 rounded">İçindeki öğeler silinmez, ana listeye geri döner.</span></p>
                        <div className="flex gap-4">
                            <button onClick={confirmDeleteGroup} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-base font-bold py-3 rounded-xl transition-colors">Grubu Çöz</button>
                            <button onClick={() => setGroupToDelete(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-base font-bold py-3 rounded-xl transition-colors">İptal</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* SERTİFİKA SİLME MODALI */}
            {certToDelete && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                    <div className="bg-slate-800 p-6 rounded-3xl max-w-sm w-full text-center border border-rose-500/30">
                        <div className="p-3 bg-rose-500/20 rounded-full mb-4 inline-flex"><Trash2 className="w-10 h-10 text-rose-500" /></div>
                        <h3 className="text-lg font-bold text-slate-100 mb-2">Sertifika Siliniyor!</h3>
                        <p className="text-sm text-slate-400 mb-4 wrap-break-word">{certToDelete.subject || certToDelete.path}</p>
                        <div className="flex gap-2 w-full">
                            <button disabled={isDeletingCert} onClick={confirmDeleteCert} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isDeletingCert ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Sil"}
                            </button>
                            <button disabled={isDeletingCert} onClick={() => setCertToDelete(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">İptal</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* SUNUCU GRUBU OLUŞTURMA MODALI */}
            {isServerGroupModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                    <div className="bg-slate-800 p-6 rounded-3xl max-w-md w-full border border-blue-500/30 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2"><FolderPlus className="w-5 h-5 text-blue-500"/> Sunucu Grubu Oluştur</h3>
                        <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Grup Adı (Örn: TEST SUNUCULARI)" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white mb-4 outline-none focus:border-blue-500" />
                        <div className="max-h-48 overflow-y-auto mb-4 border border-slate-700 rounded-xl p-2 bg-slate-900/50 flex flex-col gap-1 custom-scrollbar">
                            {serverLayout.filter(id => !id.startsWith('sg_')).map(id => {
                                const s = servers[id]; if (!s) return null;
                                return (
                                    <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedGroupItems.includes(id)} onChange={(e) => { e.target.checked ? setSelectedGroupItems([...selectedGroupItems, id]) : setSelectedGroupItems(selectedGroupItems.filter(i => i !== id)); }} className="accent-blue-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300 wrap-break-word">{s.metrics.customName || s.serverId}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={createServerGroup} disabled={!newGroupName || selectedGroupItems.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50">Oluştur</button>
                            <button onClick={() => { setIsServerGroupModalOpen(false); setNewGroupName(""); setSelectedGroupItems([]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl">İptal</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* SERTİFİKA GRUBU OLUŞTURMA MODALI */}
            {isCertGroupModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                    <div className="bg-slate-800 p-6 rounded-3xl max-w-md w-full border border-emerald-500/30 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2"><FolderPlus className="w-5 h-5 text-emerald-500"/> Sertifika Grubu Oluştur</h3>
                        <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Grup Adı (Örn: ANA SERTİFİKALAR)" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white mb-4 outline-none focus:border-emerald-500" />
                        <div className="max-h-48 overflow-y-auto mb-4 border border-slate-700 rounded-xl p-2 bg-slate-900/50 flex flex-col gap-1 custom-scrollbar">
                            {certLayout.filter(id => typeof id === 'number').map(id => {
                                const c = globalCerts.find(cert => cert.id === id); if (!c) return null;
                                return (
                                    <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedGroupItems.includes(id)} onChange={(e) => { e.target.checked ? setSelectedGroupItems([...selectedGroupItems, id]) : setSelectedGroupItems(selectedGroupItems.filter(i => i !== id)); }} className="accent-emerald-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300 wrap-break-word">{c.subject}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={createCertGroup} disabled={!newGroupName || selectedGroupItems.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50">Oluştur</button>
                            <button onClick={() => { setIsCertGroupModalOpen(false); setNewGroupName(""); setSelectedGroupItems([]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl">İptal</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ANA BÖLÜMLERİN SIRALANMASI */}
            {sectionOrder.map((sectionId) => (
                <div 
                    key={sectionId} 
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, 'section', sectionId)}
                    onDragEnter={(e) => handleDragEnter(e, 'section', sectionId)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`relative transition-all w-full h-full ${isEditMode ? 'p-2 border-2 border-dashed border-blue-500/50 rounded-2xl bg-slate-900/30' : ''}`}
                >
                    {isEditMode && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg flex items-center gap-2 z-50 cursor-grab animate-pulse pointer-events-none"><Grip className="w-3.5 h-3.5"/> BÖLÜMÜ TAŞI</div>}
                    {sectionId === 'certs' && renderCertsSection()}
                    {sectionId === 'servers' && renderServersSection()}
                </div>
            ))}
        </div>
    );
};

export default Dashboard;