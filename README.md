ServerMonitorApp / Monitor.Server (Arka Uç - Visual Studio) Proje Anayasası
Amaç: Sunuculardan, servislerden ve global sertifikalardan metrik verilerini toplamak, bu verileri veritabanında işleyerek sağlık/zaman aşımlarını hesaplamak ve ön yüze (Monitor.Client) SignalR üzerinden canlı (broadcast) olarak yayınlayarak sistemin kalbini oluşturmak.

Teknolojiler: * Çatı (Framework): C# (.NET Core Web API)

Veritabanı Yönetimi: Entity Framework Core

Gerçek Zamanlı İletişim: SignalR

Sorun Giderme (Diagnostik): Java tabanlı süreçler (MEDAS vb.) analiz edilecekse tek geçerli ve nihai yöntem JSTACK olacaktır. Başka araç kullanılmayacaktır.

Mimari Kurallar:

Kesin Dosya İsimlendirme: Yazılan her Controller, DTO veya Service sınıfı kod bloğunda, doğrudan Visual Studio'ya aktarılabilmesi için SınıfAdi.cs (Örn: MonitorController.cs) formatında isimlendirilecektir.

DTO (Data Transfer Object) Disiplini: İstemciden (Client) alınan veriler direkt Entity modelleriyle değil, DTO sınıflarıyla karşılanacaktır. Sınıf içerisinde aynı isimde birden fazla özellik tanımlanmasından kaçınılacak (CS0102 / CS0229) ve özellikler temiz tutulacaktır.

Güvenli Atamalar (Null Safety): String ve obje operasyonlarında null referans hatalarını (CS8601) önlemek için nullable tipler (?) ve null birleştirme operatörleri (?? string.Empty) kullanılacak, veritabanına asla kontrolsüz boş değer yazılmayacaktır.

Loglama Disiplini: Ağa veya sisteme yapılan kritik işlemler (güncelleme, silme) mutlaka bir WriteLog veya benzeri bir ILogger mekanizması ile kayıt altına alınacak, süreç izlenebilir olacaktır.

Mevcut Aşama: Şu an en son "Sunucu Takma Adı (CustomName) ve Sertifika Yolu (Path) Güncelleme API'leri" modülünü kodluyorduk ve bu aşamada kaldık. MonitorController.cs içerisinde UpdateCertificate ve UpdateServer endpointlerini tamamladık. Mevcut ServerConfigs ve GlobalCertificates veritabanı tablolarına gelen güncellemeleri başarıyla işledik. DTO sınıflarındaki çifte tanım (CustomName) hataları giderildi, null referans atamaları güvenli hale getirildi ve Controller sınıfının eksik olan kapanış süslü parantezi eklenerek API tarafı derlenmeye (Build) hazır, hatasız bir şekilde bırakıldı.
