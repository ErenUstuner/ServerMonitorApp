using System;
using System.Collections.Generic;
using System.Text;

namespace Monitor.Shared
{
    public class CertificateStatusDto
    {
        public string FriendlyName { get; set; } = string.Empty;
        public string Thumbprint { get; set; } = string.Empty; // Sertifikanın benzersiz kimliği
        public DateTime ExpirationDate { get; set; }
        public int DaysRemaining => (ExpirationDate - DateTime.UtcNow).Days;
        public bool IsExpired => DateTime.UtcNow > ExpirationDate;
        public string Issuer { get; set; } = string.Empty;
    }
}
