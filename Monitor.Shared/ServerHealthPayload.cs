using System;
using System.Collections.Generic;
using System.Text;

namespace Monitor.Shared
{
    public class ServerHealthPayload
    {
        public string ServerId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public ServerMetricsDto Metrics { get; set; } = new ServerMetricsDto();
        public List<ServiceStatusDto> Services { get; set; } = new List<ServiceStatusDto>();
        public List<CertificateStatusDto> Certificates { get; set; } = new List<CertificateStatusDto>();
    }
}
