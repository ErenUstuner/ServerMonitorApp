using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.ServiceProcess;
using Monitor.Shared;

namespace Monitor.Agent.Collectors
{
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public class ServiceCollector
    {
        // İnternet veya ağ üzerinden kapı çalmak (istek atmak) için kullanacağımız araç
        private readonly HttpClient _httpClient;

        public ServiceCollector()
        {
            _httpClient = new HttpClient();
            // Timeout (Zaman Aşımı): Eğer kapısını çaldığımız uygulama 5 saniye içinde cevap vermezse, donmuş kabul edip fişini çekeceğiz.
            _httpClient.Timeout = TimeSpan.FromSeconds(5);
        }

        public async Task<List<ServiceStatusDto>> GetServicesStatusAsync(Dictionary<string, string> servicesToMonitor)
        {
            // servicesToMonitor (İzlenecek Servisler): Bize bir sözlük yapısı olarak gelecek.
            // Anahtar (Key): Servisin Windows'taki adı (Örneğin: "W3SVC")
            // Değer (Value): Eğer varsa, derin sağlık kontrolü yapacağımız web adresi (Örneğin: "http://localhost:8080/health")

            var results = new List<ServiceStatusDto>();

            foreach (var service in servicesToMonitor)
            {
                var status = new ServiceStatusDto
                {
                    ServiceName = service.Key,
                    DisplayName = service.Key
                };

                // 1. AŞAMA: Windows İşletim Sistemine "Bu servis ayakta mı?" diye soruyoruz.
                try
                {
                    using (var sc = new ServiceController(service.Key))
                    {
                        status.DisplayName = sc.DisplayName;
                        status.IsRunning = sc.Status == ServiceControllerStatus.Running;
                    }
                }
                catch (Exception ex)
                {
                    status.IsRunning = false;
                    status.HealthCheckMessage = $"Servis Windows'ta bulunamadı veya okunamadı. Hata: {ex.Message}";
                }

                // 2. AŞAMA: Derin Sağlık Kontrolü
                // Eğer servis Windows'ta çalışıyor görünüyorsa ve bize kontrol etmemiz için bir adres verilmişse...
                if (status.IsRunning && !string.IsNullOrWhiteSpace(service.Value))
                {
                    // Kronometreyi başlatıyoruz ki uygulamanın bize ne kadar sürede cevap verdiğini ölçelim.
                    var stopwatch = Stopwatch.StartNew();

                    try
                    {
                        // Uygulamanın kapısını çalıyoruz (Web isteği atıyoruz)
                        var response = await _httpClient.GetAsync(service.Value);
                        stopwatch.Stop(); // Cevap gelince kronometreyi durdur

                        status.ResponseTimeMs = stopwatch.ElapsedMilliseconds; // Geçen süreyi milisaniye olarak kaydet
                        status.IsHealthy = response.IsSuccessStatusCode; // Gelen cevap olumlu mu? (200 OK)
                        status.HealthCheckMessage = response.IsSuccessStatusCode ? "Sorunsuz çalışıyor ve yanıt veriyor." : $"Servis ayakta ama uygulama hata veriyor. HTTP Kodu: {response.StatusCode}";
                    }
                    catch (Exception ex)
                    {
                        stopwatch.Stop();
                        status.IsHealthy = false; // Kapıyı çaldık ama açan olmadı, demek ki uygulama içeride çökmüş.
                        status.HealthCheckMessage = $"Servis ayakta ancak uygulamaya ulaşılamıyor (Donmuş veya çökmüş olabilir): {ex.Message}";
                        status.ResponseTimeMs = stopwatch.ElapsedMilliseconds;
                    }
                }
                else if (status.IsRunning)
                {
                    // Eğer sadece servisin adını vermişsek, kapı çalacak bir adresimiz yoksa ve servis çalışıyorsa, şimdilik sağlıklı kabul ediyoruz.
                    status.IsHealthy = true;
                    status.HealthCheckMessage = "Servis Windows üzerinde çalışıyor (Derin kontrol adresi tanımlanmadı).";
                }

                results.Add(status);
            }

            return results;
        }
    }
}
