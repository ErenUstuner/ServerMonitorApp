using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Monitor.Server.Data;
using Monitor.Server.Hubs;
using Monitor.Server.Models;
using Org.BouncyCastle.X509;

namespace Monitor.Server.Controllers
{
    [ApiController]
    [Route("api/monitor")]
    public class MonitorController : ControllerBase
    {
        private readonly MonitorDbContext _context;
        private readonly IHubContext<MonitorHub> _hubContext;
        private readonly string _logPath = @"C:\ProgramData\MonitorServis\Log\server.log";
        private static readonly List<string> _commandQueue = new List<string>();
        private static readonly object _queueLock = new object();

        public MonitorController(MonitorDbContext context, IHubContext<MonitorHub> hubContext)
        {
            _context = context; _hubContext = hubContext;
        }

        // ==========================================
        // YENİ: GLOBAL SERTİFİKA YÖNETİMİ
        // ==========================================
        [HttpPost("add-certificate")]
        public async Task<IActionResult> AddCertificate([FromBody] JsonElement payload)
        {
            string path = payload.GetProperty("pathOrUrl").GetString() ?? "";
            if (string.IsNullOrWhiteSpace(path)) return BadRequest("Yol boş olamaz.");

            _context.GlobalCertificates.Add(new GlobalCertificate { PathOrUrl = path });
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("delete-certificate/{id}")]
        public async Task<IActionResult> DeleteCertificate(int id)
        {
            var cert = await _context.GlobalCertificates.FindAsync(id);
            if (cert != null) { _context.GlobalCertificates.Remove(cert); await _context.SaveChangesAsync(); }
            return Ok();
        }

        [HttpGet("get-certificates")]
        public async Task<IActionResult> GetCertificates()
        {
            var certs = await _context.GlobalCertificates.ToListAsync();
            var results = new List<object>();

            foreach (var c in certs)
            {
                try
                {
                    bool isCrl = c.PathOrUrl.EndsWith(".crl", StringComparison.OrdinalIgnoreCase);
                    bool isHttp = c.PathOrUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase);

                    // ==========================================
                    // 1. DURUM: CRL (Kamu SM İptal Listesi) OKUMA
                    // ==========================================
                    if (isCrl)
                    {
                        byte[] fileBytes;
                        if (isHttp)
                        {
                            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                            fileBytes = await client.GetByteArrayAsync(c.PathOrUrl);
                        }
                        else
                        {
                            fileBytes = await System.IO.File.ReadAllBytesAsync(c.PathOrUrl);
                        }

                        // BouncyCastle ile CRL Parçalama
                        var parser = new X509CrlParser();
                        var crl = parser.ReadCrl(fileBytes);

                        DateTime start = crl.ThisUpdate;
                        // BouncyCastle NextUpdate parametresini DateTimeObject olarak tutar, .Value ile saf tarihi çekeriz
                        DateTime? end = crl.NextUpdate;

                        // Kamu SM'nin uzun isimlerini temizleyip sadece kurumu alıyoruz
                        string issuerName = crl.IssuerDN.ToString();
                        var cnPart = issuerName.Split(',').FirstOrDefault(x => x.Trim().StartsWith("CN="));
                        string cleanSubject = cnPart != null ? cnPart.Replace("CN=", "") : issuerName;

                        results.Add(new
                        {
                            id = c.Id,
                            path = c.PathOrUrl,
                            subject = cleanSubject + " [CRL LİSTESİ]",
                            start = start,
                            end = end,
                            isValid = end.HasValue ? end.Value > DateTime.Now : true
                        });
                    }
                    // ==========================================
                    // 2. DURUM: NORMAL CRT/CER SERTİFİKA OKUMA
                    // ==========================================
                    else
                    {
                        if (isHttp)
                        {
                            using var handler = new HttpClientHandler();
                            X509Certificate2? capturedCert = null;
                            handler.ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => {
                                if (cert != null)
                                {
#pragma warning disable SYSLIB0057
                                    capturedCert = new X509Certificate2(cert.GetRawCertData());
#pragma warning restore SYSLIB0057
                                }
                                return true;
                            };
                            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };
                            await client.GetAsync(c.PathOrUrl);

                            if (capturedCert != null)
                                results.Add(new { id = c.Id, path = c.PathOrUrl, subject = capturedCert.Subject.Split(',')[0].Replace("CN=", ""), start = capturedCert.NotBefore, end = capturedCert.NotAfter, isValid = capturedCert.NotAfter > DateTime.Now });
                        }
                        else
                        {
#pragma warning disable SYSLIB0057
                            var cert = new X509Certificate2(c.PathOrUrl);
#pragma warning restore SYSLIB0057
                            results.Add(new { id = c.Id, path = c.PathOrUrl, subject = cert.Subject.Split(',')[0].Replace("CN=", ""), start = cert.NotBefore, end = cert.NotAfter, isValid = cert.NotAfter > DateTime.Now });
                        }
                    }
                }
                catch (Exception ex)
                {
                    results.Add(new { id = c.Id, path = c.PathOrUrl, subject = "Okuma Hatası", error = ex.Message, isValid = false });
                }
            }
            return Ok(results);
        }

        // ==========================================
        // MEVCUT SUNUCU İŞLEMLERİ
        // ==========================================
        [HttpPost("ui-log")]
        public IActionResult ReceiveUiLog([FromBody] JsonElement payload) { WriteLog($"[WEB] {payload.GetProperty("message").GetString()}"); return Ok(); }

        [HttpPost("restart-service")]
        public IActionResult RestartService([FromBody] ServerConfig config)
        {
            WriteLog($"[SUNUCU] RESTART EMRİ: '{config.ServerIp}' -> '{config.ServiceName}'");
            lock (_queueLock) { _commandQueue.Add($"{config.ServerIp}|{config.ServiceName}"); }
            return Ok();
        }

        // KRİTİK DÜZELTME: [FromQuery] ile slash ve boşluk krizini çözüyoruz
        [HttpGet("get-commands")]
        public IActionResult GetCommands([FromQuery] string serverIp)
        {
            if (string.IsNullOrEmpty(serverIp)) return Ok(new List<string>());

            lock (_queueLock)
            {
                var myCommands = _commandQueue.Where(c => c.StartsWith(serverIp + "|", StringComparison.OrdinalIgnoreCase)).ToList();
                foreach (var cmd in myCommands) _commandQueue.Remove(cmd);
                return Ok(myCommands.Select(c => c.Split('|')[1]));
            }
        }

        [HttpGet("get-servers")]
        public async Task<IActionResult> GetServers() => Ok(await _context.ServerConfigs.ToListAsync());

        [HttpPost("receive")]
        public async Task<IActionResult> ReceivePayload([FromBody] object payload) { await _hubContext.Clients.All.SendAsync("ReceiveServerData", payload); return Ok(); }

        [HttpPost("add-server")]
        public async Task<IActionResult> AddServer([FromBody] ServerUpdateDto config)
        {
            if (await _context.ServerConfigs.AnyAsync(s => s.ServerIp.ToLower() == config.ServerIp.ToLower())) return Conflict("Mevcut.");
            string combinedServices = config.Services != null ? string.Join(",", config.Services.Where(s => !string.IsNullOrWhiteSpace(s))) : "";
            _context.ServerConfigs.Add(new ServerConfig
            {
                ServerIp = config.ServerIp,
                CustomName = string.IsNullOrWhiteSpace(config.CustomName) ? config.ServerIp : config.CustomName,
                ServiceName = combinedServices,
                TrackCpu = config.TrackCpu,
                TrackRam = config.TrackRam,
                TrackDisk = config.TrackDisk,
                TrackNet = config.TrackNet
            });
            await _context.SaveChangesAsync(); return Ok();
        }

        [HttpDelete("delete-server/{serverIp}")]
        public async Task<IActionResult> DeleteServer(string serverIp)
        {
            var server = await _context.ServerConfigs.FirstOrDefaultAsync(s => s.ServerIp.ToLower() == serverIp.ToLower());
            if (server != null) { _context.ServerConfigs.Remove(server); await _context.SaveChangesAsync(); }
            return Ok();
        }

        [HttpPut("update-server")]
        public async Task<IActionResult> UpdateServer([FromBody] ServerUpdateDto config)
        {
            var existing = await _context.ServerConfigs.FirstOrDefaultAsync(s => s.ServerIp == config.ServerIp);
            if (existing == null) return NotFound();
            existing.ServiceName = config.Services != null ? string.Join(",", config.Services.Where(s => !string.IsNullOrWhiteSpace(s))) : "";
            existing.TrackCpu = config.TrackCpu; existing.TrackRam = config.TrackRam; existing.TrackDisk = config.TrackDisk; existing.TrackNet = config.TrackNet;
            await _context.SaveChangesAsync(); return Ok();
        }

        private void WriteLog(string message)
        {
            try { Directory.CreateDirectory(Path.GetDirectoryName(_logPath)!); System.IO.File.AppendAllText(_logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}\n"); } catch { }
        }
    }

    public class ServerUpdateDto
    {
        public string ServerIp { get; set; } = string.Empty; public string CustomName { get; set; } = string.Empty;
        public List<string> Services { get; set; } = new();
        public bool TrackCpu { get; set; }
        public bool TrackRam { get; set; }
        public bool TrackDisk { get; set; }
        public bool TrackNet { get; set; }
    }
}