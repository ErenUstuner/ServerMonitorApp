using System;
using System.Collections.Generic;
using System.Text;

namespace Monitor.Shared
{
    public class ServiceStatusDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool IsRunning { get; set; } // Windows servis durumu ayakta mı?
        public bool IsHealthy { get; set; } // Gerçek hizmet kontrolü başarılı mı?
        public string HealthCheckMessage { get; set; } = string.Empty; // Hata varsa açıklaması
        public long ResponseTimeMs { get; set; } // Yanıt süresi (milisaniye)
    }
}
