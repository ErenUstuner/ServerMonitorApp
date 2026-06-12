using System.Diagnostics;
using System.Net.Http.Json;
using System.ServiceProcess;

namespace Monitor.Agent
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl = "http://localhost:5027/api/monitor/receive";
        private readonly string _configUrl = "http://localhost:5027/api/monitor/get-servers";

        public Worker(ILogger<Worker> logger)
        {
            _logger = logger;
            _httpClient = new HttpClient();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                string serverName = Environment.MachineName;
                string targetService = string.Empty;

                // 1. ZEKİ VE GÜVENLİ OKUMA: JSON metnini manuel parçalamak yerine doğrudan C# Objesine çeviriyoruz.
                // Bu yöntem büyük/küçük harf veya boş (null) gelme durumlarında çökmez, güvenle tolere eder.
                try
                {
                    var configs = await _httpClient.GetFromJsonAsync<List<ServerConfigDto>>(_configUrl, stoppingToken);

                    if (configs != null)
                    {
                        // Gelen listeden benim adımla (Örn: AYS-TEST-PC3) eşleşen sunucuyu çek
                        var myConfig = configs.FirstOrDefault(c => string.Equals(c.ServerIp, serverName, StringComparison.OrdinalIgnoreCase));

                        // Eğer bana ait bir servis yazılmışsa, onu hedefe al
                        if (myConfig != null && !string.IsNullOrWhiteSpace(myConfig.ServiceName))
                        {
                            targetService = myConfig.ServiceName;
                        }
                    }
                }
                catch { /* API'ye anlık ulaşılamazsa çökmeyi engelle, okumaya devam et */ }

                // 2. Metriklerin Toplanması
                var metrics = new SystemMetrics
                {
                    ServerName = serverName,
                    CpuUsage = GetCpuUsage(),
                    TotalRamGb = 31.64,
                    RamUsagePercentage = GetRamUsage()
                };

                // 3. Sadece hedef servisin (Arayüzden girdiğin W32Time) durumunu kontrol et
                var services = new List<ServiceStatus>();
                if (!string.IsNullOrWhiteSpace(targetService))
                {
                    services.Add(new ServiceStatus
                    {
                        ServiceName = targetService,
                        DisplayName = targetService,
                        IsHealthy = CheckServiceStatus(targetService)
                    });
                }

                // 4. Veri Paketinin (Payload) Hazırlanması
                var payload = new ServerHealthPayload
                {
                    ServerId = serverName,
                    Timestamp = DateTime.UtcNow,
                    Metrics = metrics,
                    Services = services,
                    Certificates = new List<CertificateStatus>()
                };

                // 5. Merkeze Ateşleme
                try
                {
                    await _httpClient.PostAsJsonAsync(_apiUrl, payload, stoppingToken);
                }
                catch { }

                // 6. Yüksek Hız: 1 Saniyede bir güncelle (Anlık Real-Time)
                await Task.Delay(1000, stoppingToken);
            }
        }

        private double GetCpuUsage() => new Random().NextDouble() * 100;
        private double GetRamUsage() => new Random().NextDouble() * 100;

        private bool CheckServiceStatus(string serviceName)
        {
            try
            {
#pragma warning disable CA1416
                using (ServiceController sc = new ServiceController(serviceName))
                {
                    // Servis durumunun "Çalışıyor" olup olmadığını denetle
                    return sc.Status == ServiceControllerStatus.Running;
                }
#pragma warning restore CA1416
            }
            catch
            {
                // Servis bulunamazsa veya erişim izni yoksa doğrudan false döndür
                return false;
            }
        }
    }

    // --- ŞABLONLAR (DTO) ---

    // YENİ ŞABLON: API'den gelen sunucu ayarlarını okuyacak ana iskelet
    public class ServerConfigDto
    {
        public string ServerIp { get; set; } = string.Empty;
        public string? ServiceName { get; set; }
    }

    public class ServerHealthPayload
    {
        public string ServerId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public SystemMetrics Metrics { get; set; } = new();
        public List<ServiceStatus> Services { get; set; } = new();
        public List<CertificateStatus> Certificates { get; set; } = new();
    }

    public class SystemMetrics
    {
        public string ServerName { get; set; } = string.Empty;
        public double CpuUsage { get; set; }
        public double TotalRamGb { get; set; }
        public double RamUsagePercentage { get; set; }
    }

    public class ServiceStatus
    {
        public string ServiceName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool IsHealthy { get; set; }
    }

    public class CertificateStatus
    {
        public string Name { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
        public bool IsExpired { get; set; }
    }
}