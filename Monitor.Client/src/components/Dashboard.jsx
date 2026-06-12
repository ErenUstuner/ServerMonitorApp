import React, { useEffect, useState } from 'react';
import signalRService from '../services/SignalRService';
import ServerCard from './ServerCard';

const Dashboard = () => {
    const [servers, setServers] = useState({});

    // API'den kayıtlı sunucuları çekip "Bekleniyor" modunda ekrana basan fonksiyon
    const fetchTrackedServers = async () => {
        try {
            const response = await fetch("http://localhost:5027/api/monitor/get-servers");
            if (response.ok) {
                const dbServers = await response.json();
                setServers(prevServers => {
                    const newState = { ...prevServers };
                    dbServers.forEach(dbServer => {
                        // Eğer canlı veri gelmediyse, "Bekleniyor" bayrağıyla ekle
                        if (!newState[dbServer.serverIp]) {
                            newState[dbServer.serverIp] = {
                                serverId: dbServer.serverIp,
                                isWaiting: true, 
                                metrics: { serverName: dbServer.serverIp, cpuUsage: 0, ramUsagePercentage: 0, totalRamGb: 0 },
                                services: [],
                                certificates: []
                            };
                        }
                    });
                    return newState;
                });
            }
        } catch(e) { console.error(e); }
    };

    useEffect(() => {
        fetchTrackedServers(); // Bileşen yüklendiğinde çalıştır

        signalRService.startConnection();
        const handleServerData = (payload) => {
            setServers(prevServers => ({
                ...prevServers,
                [payload.serverId]: { ...payload, isWaiting: false } // Canlı veri gelince bekleme modunu kapat
            }));
        };
        
        signalRService.subscribe(handleServerData);
        return () => signalRService.unsubscribe(handleServerData);
    }, []);

    const serverList = Object.values(servers);

    return (
        <div className="min-h-full">
            {serverList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900 shadow-inner">
                    <p className="text-slate-500 text-2xl font-semibold mb-3">İzleme Listesi Boş</p>
                    <p className="text-slate-600 text-sm">Sağ üstteki butondan yeni bir sunucu ekleyin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {serverList.map(server => (
                        <div key={server.serverId} className="transition-all duration-300">
                            <ServerCard data={server} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;