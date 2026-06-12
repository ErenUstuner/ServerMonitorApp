using System.Security.Cryptography.X509Certificates;
using Monitor.Shared;

namespace Monitor.Agent.Collectors
{
    public class CertificateCollector
    {
        public async Task<List<CertificateStatusDto>> GetCertificatesStatusAsync(List<string> certificatePathsOrUrls)
        {
            var results = new List<CertificateStatusDto>();

            foreach (var pathOrUrl in certificatePathsOrUrls)
            {
                try
                {
                    if (pathOrUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                        pathOrUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        results.Add(await CheckUrlCertificateAsync(pathOrUrl));
                    }
                    else
                    {
                        results.Add(CheckFileCertificate(pathOrUrl));
                    }
                }
                catch (Exception) // CS0168 Çözümü: Kullanılmayan 'ex' değişkeni kaldırıldı.
                {
                    results.Add(new CertificateStatusDto
                    {
                        FriendlyName = pathOrUrl,
                        Issuer = "HATA / OKUNAMADI",
                        ExpirationDate = DateTime.MinValue
                    });
                }
            }

            return results;
        }

        private async Task<CertificateStatusDto> CheckUrlCertificateAsync(string url)
        {
            var result = new CertificateStatusDto { FriendlyName = url };

            using var handler = new HttpClientHandler
            {
                UseDefaultCredentials = true,
                ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) =>
                {
                    if (cert != null)
                    {
                        result.Thumbprint = cert.Thumbprint;
                        result.ExpirationDate = cert.NotAfter;
                        result.Issuer = cert.Issuer;
                    }
                    return true;
                }
            };

            using var client = new HttpClient(handler);
            try
            {
                await client.GetAsync(url);
            }
            catch
            {
            }

            return result;
        }

        private CertificateStatusDto CheckFileCertificate(string filePath)
        {
            var result = new CertificateStatusDto { FriendlyName = Path.GetFileName(filePath) };

            if (!File.Exists(filePath))
                throw new FileNotFoundException("Sertifika dosyası bu yolda bulunamadı.");

            // SYSLIB0057 Çözümü: .NET 8'in yeni, güvenli ve performanslı sertifika yükleyici standardı kullanıldı.
            using var cert = X509CertificateLoader.LoadCertificateFromFile(filePath);

            result.Thumbprint = cert.Thumbprint;
            result.ExpirationDate = cert.NotAfter;
            result.Issuer = cert.Issuer;

            return result;
        }
    }
}