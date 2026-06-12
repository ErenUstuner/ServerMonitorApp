import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = null;
        // Gelen veriyi bekleyen arayüz parçalarını (dinleyicileri) tutacağımız liste
        this.listeners = []; 
    }

    // Bağlantıyı başlatan ana fonksiyon
    async startConnection() {
        // Zaten bağlıysak tekrar bağlanmaya çalışma
        if (this.connection && this.connection.state === 'Connected') return;

        // Bağlantıyı inşa ediyoruz (HubConnectionBuilder)
        this.connection = new HubConnectionBuilder()
            .withUrl("http://localhost:5027/monitorHub") // API'mizdeki Hub adresi
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect() // Ağ koparsa pes etme, otomatik tekrar bağlanmayı dene
            .build();

        // Backend tarafındaki "ReceiveServerData" frekansını dinliyoruz
        this.connection.on("ReceiveServerData", (data) => {
            // Veri geldiğinde, bu veriyi bekleyen tüm arayüz parçalarına (dinleyicilere) dağıt
            this.listeners.forEach(listener => listener(data));
        });

        try {
            await this.connection.start();
            console.log("SignalR Bağlantısı Başarılı. Merkez API dinleniyor...");
        } catch (err) {
            console.error("SignalR Bağlantı Hatası: ", err);
            // Sunucu kapalıysa veya hata varsa 5 saniye bekle ve tekrar denemeye devam et
            setTimeout(() => this.startConnection(), 5000);
        }
    }

    // Arayüz bileşenlerinin (Örn: İzleme Ekranı) bu servise abone olması için
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // Sayfa değiştirildiğinde abonelikten çıkmak için (Performans sızıntısını önler)
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }
}

// Servisi tek bir nesne (Singleton) olarak dışa aktarıyoruz.
const signalRService = new SignalRService();
export default signalRService;