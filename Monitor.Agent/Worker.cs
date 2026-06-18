using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using System.Net.NetworkInformation;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Monitor.Agent
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl = "http://localhost:5027/api/monitor/receive";
        private readonly string _configUrl = "http://localhost:5027/api/monitor/get-servers";
        private readonly string _cmdUrl = "http://localhost:5027/api/monitor/get-commands";

        [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out long lpIdleTime, out long lpKernelTime, out long lpUserTime);
        [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);
        [StructLayout(LayoutKind.Sequential)] private struct MEMORYSTATUSEX { public uint dwLength; public uint dwMemoryLoad; public ulong ullTotalPhys; public ulong ullAvailPhys; public ulong ullTotalPageFile; public ulong ullAvailPageFile; public ulong ullTotalVirtual; public ulong ullAvailVirtual; public ulong ullAvailExtendedVirtual; }

        private long _prevIdleTime, _prevKernelTime, _prevUserTime;
        private long _prevBytesReceived = 0, _prevBytesSent = 0;
        private DateTime _prevNetTime = DateTime.UtcNow;
        private string _assignedIp = string.Empty;

        public Worker(ILogger<Worker> logger)
        {
            _logger = logger;
            _httpClient = new HttpClient();
            // Zaman aşımlarını makul seviyede tutarak uygulamanın kilitlenmesini engelliyoruz
            _httpClient.Timeout = TimeSpan.FromSeconds(15);
            GetSystemTimes(out _prevIdleTime, out _prevKernelTime, out _prevUserTime);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                string serverName = Environment.MachineName;

                WriteLog($"[AJAN] Başlatılıyor. Hedef Makine: {serverName}", "INFO");

                // Ajan sadece KENDİ makinesindeki IP adreslerini öğreniyor
                var myLocalIps = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up)
                    .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                    .Where(ua => ua.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    .Select(ua => ua.Address.ToString())
                    .ToList();

                while (!stoppingToken.IsCancellationRequested)
                {
                    // ANA DÖNGÜ KALKANI: İçeride ne hata olursa olsun Ajan'ın çökmesini engeller
                    try
                    {
                        var targetServices = new List<string>();
                        string customName = serverName;
                        bool trackCpu = true, trackRam = true, trackDisk = true, trackNet = true;
                        string agentId = serverName;

                        // 1. YAPILANDIRMA ÇEKME (CONFIG)
                        try
                        {
                            var configs = await _httpClient.GetFromJsonAsync<List<ServerConfigDto>>(_configUrl, jsonOptions, stoppingToken);
                            if (configs != null)
                            {
                                // Merkezdeki listede benim "Makine Adım" veya "Kendi IP'lerimden biri" varsa ayarları alıyorum
                                var myConfig = configs.FirstOrDefault(c =>
                                    string.Equals(c.ServerIp, serverName, StringComparison.OrdinalIgnoreCase) ||
                                    myLocalIps.Contains(c.ServerIp));

                                if (myConfig != null)
                                {
                                    _assignedIp = myConfig.ServerIp;
                                    agentId = _assignedIp; // Merkez beni hangi IP ile biliyorsa veriyi o isimle gönderiyorum
                                    customName = string.IsNullOrWhiteSpace(myConfig.CustomName) ? serverName : myConfig.CustomName;
                                    trackCpu = myConfig.TrackCpu; trackRam = myConfig.TrackRam; trackDisk = myConfig.TrackDisk; trackNet = myConfig.TrackNet;
                                    if (!string.IsNullOrWhiteSpace(myConfig.ServiceName)) targetServices = myConfig.ServiceName.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                                }
                            }
                        }
                        catch (HttpRequestException) { /* API kapalıysa logu spamlamamak için sessizce geçilebilir */ }
                        catch (Exception ex) { WriteLog($"[AJAN UYARI] Ayarlar çekilirken beklenmeyen hata: {ex.Message}", "WARNING"); }

                        // 2. KOMUT ÇEKME (COMMANDS)
                        try
                        {
                            var cmds = await _httpClient.GetFromJsonAsync<List<string>>($"{_cmdUrl}?serverIp={Uri.EscapeDataString(agentId)}", stoppingToken);
                            if (cmds != null) foreach (var cmd in cmds) RestartWindowsService(cmd);
                        }
                        catch (HttpRequestException) { /* API'ye ulaşılamadı, normaldir */ }
                        catch (Exception ex) { WriteLog($"[AJAN UYARI] Komutlar kontrol edilirken hata: {ex.Message}", "WARNING"); }

                        // 3. METRİKLERİN OKUNMASI
                        var (ramUsagePercent, totalRamGb) = GetRealRamMetrics();
                        var diskList = GetRealDiskMetrics();
                        double cpuUsage = GetRealCpuUsage();
                        var (dlMbps, ulMbps) = GetRealNetworkUsage();

                        var metrics = new SystemMetrics
                        {
                            ServerName = serverName,
                            CustomName = customName,
                            CpuUsage = cpuUsage,
                            CpuCores = Environment.ProcessorCount,
                            TotalRamGb = totalRamGb,
                            RamUsagePercentage = ramUsagePercent,
                            NetworkDownloadMbps = dlMbps,
                            NetworkUploadMbps = ulMbps,
                            TrackCpu = trackCpu,
                            TrackRam = trackRam,
                            TrackDisk = trackDisk,
                            TrackNet = trackNet
                        };

                        // 4. SERVİS DURUMLARININ OKUNMASI
                        var services = new List<ServiceStatus>();
                        foreach (var svcName in targetServices)
                        {
                            var svcInfo = GetServiceInfo(svcName);
                            services.Add(new ServiceStatus { ServiceName = svcInfo.RealName, DisplayName = svcInfo.DisplayName, IsHealthy = svcInfo.IsRunning });
                        }

                        // 5. MERKEZE VERİ GÖNDERİMİ (PAYLOAD POST)
                        var payload = new ServerHealthPayload { ServerId = agentId, Timestamp = DateTime.UtcNow, Metrics = metrics, Services = services, Disks = diskList };
                        try
                        {
                            await _httpClient.PostAsJsonAsync(_apiUrl, payload, stoppingToken);
                        }
                        catch (HttpRequestException) { /* Merkez kapalıysa bekler */ }
                        catch (Exception ex) { WriteLog($"[AJAN UYARI] Veri merkeze iletilemedi: {ex.Message}", "WARNING"); }

                        // 1 Saniye bekle ve tekrarla
                        await Task.Delay(1000, stoppingToken);
                    }
                    catch (TaskCanceledException)
                    {
                        // Uygulama normal yollarla kapatılıyor, döngüden çık
                        break;
                    }
                    catch (Exception ex)
                    {
                        // Döngü içi ölümcül hata (örn. Memory Leak, Win32 Error)
                        WriteLog($"[AJAN DÖNGÜ HATASI] Veri okuma turunda kritik hata oluştu: {ex.ToString()}", "ERROR");
                        await Task.Delay(5000, stoppingToken); // Çökmeyi engeller, 5 sn dinlenip döngüye devam eder
                    }
                }
            }
            catch (Exception fatalEx)
            {
                // Ajanın kalbi tamamen durursa
                WriteLog($"[AJAN ÖLÜMCÜL HATA] Worker.ExecuteAsync tamamen çöktü: {fatalEx.ToString()}", "FATAL");
            }
            finally
            {
                WriteLog("[AJAN] İşlem sonlandırılıyor...", "INFO");
            }
        }

        private (string RealName, string DisplayName, bool IsRunning) GetServiceInfo(string serviceName)
        {
            try
            {
#pragma warning disable CA1416
                using (ServiceController sc = new ServiceController(serviceName)) { return (sc.ServiceName, sc.DisplayName, sc.Status == ServiceControllerStatus.Running); }
#pragma warning restore CA1416
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN BİLGİ] '{serviceName}' servisi okunamadı: {ex.Message}", "WARNING");
                return (serviceName, "Bulunamadı", false);
            }
        }

        private void RestartWindowsService(string serviceName)
        {
            try
            {
                WriteLog($"[AJAN] '{serviceName}' restart emri alındı.", "INFO");
#pragma warning disable CA1416
                using (ServiceController sc = new ServiceController(serviceName))
                {
                    if (sc.Status == ServiceControllerStatus.Running) { sc.Stop(); sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(15)); }
                    sc.Start(); sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(15));
                }
#pragma warning restore CA1416
                WriteLog($"[AJAN] '{serviceName}' başarıyla yeniden başlatıldı.", "INFO");
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN HATA] '{serviceName}' restart işlemi başarısız: {ex.Message}", "ERROR");
            }
        }

        private double GetRealCpuUsage()
        {
            try
            {
                if (!GetSystemTimes(out long idleTime, out long kernelTime, out long userTime)) return 0;
                long sysTotal = (kernelTime - _prevKernelTime) + (userTime - _prevUserTime);
                long sysIdle = idleTime - _prevIdleTime;
                _prevIdleTime = idleTime; _prevKernelTime = kernelTime; _prevUserTime = userTime;
                return sysTotal == 0 ? 0 : Math.Round((sysTotal - sysIdle) * 100.0 / sysTotal, 1);
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN HATA] CPU verisi okunamadı: {ex.Message}", "ERROR");
                return 0;
            }
        }

        private (double UsagePercent, double TotalGb) GetRealRamMetrics()
        {
            try
            {
                MEMORYSTATUSEX memStatus = new MEMORYSTATUSEX(); memStatus.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
                if (GlobalMemoryStatusEx(ref memStatus))
                {
                    return (Math.Round(((memStatus.ullTotalPhys - memStatus.ullAvailPhys) / (double)memStatus.ullTotalPhys) * 100.0, 1), Math.Round(memStatus.ullTotalPhys / 1073741824.0, 2));
                }
                return (0, 0);
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN HATA] RAM verisi okunamadı: {ex.Message}", "ERROR");
                return (0, 0);
            }
        }

        private (double Download, double Upload) GetRealNetworkUsage()
        {
            try
            {
                long currentReceived = 0; long currentSent = 0;
                var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == OperationalStatus.Up &&
                                n.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                                n.NetworkInterfaceType != NetworkInterfaceType.Tunnel &&
                                n.GetIPProperties().GatewayAddresses.Any(g => g.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork));

                foreach (var ni in interfaces)
                {
                    currentReceived += ni.GetIPStatistics().BytesReceived;
                    currentSent += ni.GetIPStatistics().BytesSent;
                }

                var now = DateTime.UtcNow; double timeDiff = (now - _prevNetTime).TotalSeconds;
                if (timeDiff <= 0) return (0, 0);

                if (_prevBytesReceived == 0 && _prevBytesSent == 0)
                {
                    _prevBytesReceived = currentReceived; _prevBytesSent = currentSent; _prevNetTime = now;
                    return (0, 0);
                }

                double bpsR = (currentReceived - _prevBytesReceived) / timeDiff;
                double bpsS = (currentSent - _prevBytesSent) / timeDiff;

                _prevBytesReceived = currentReceived; _prevBytesSent = currentSent; _prevNetTime = now;
                return (Math.Max(0, Math.Round((bpsR * 8) / 1_000_000.0, 2)), Math.Max(0, Math.Round((bpsS * 8) / 1_000_000.0, 2)));
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN HATA] Ağ metrikleri okunamadı: {ex.Message}", "ERROR");
                return (0, 0);
            }
        }

        private List<DiskStatus> GetRealDiskMetrics()
        {
            var disks = new List<DiskStatus>();
            try
            {
                foreach (var drive in DriveInfo.GetDrives().Where(d => d.IsReady && d.DriveType == DriveType.Fixed))
                {
                    double tGb = drive.TotalSize / 1073741824.0; double fGb = drive.AvailableFreeSpace / 1073741824.0;
                    disks.Add(new DiskStatus { DriveLetter = drive.Name, TotalGb = tGb, FreeGb = fGb, UsagePercentage = tGb > 0 ? Math.Round(((tGb - fGb) / tGb) * 100.0, 1) : 0 });
                }
            }
            catch (Exception ex)
            {
                WriteLog($"[AJAN HATA] Disk verileri okunamadı: {ex.Message}", "ERROR");
            }
            return disks;
        }

        private void WriteLog(string message, string level = "INFO")
        {
            try
            {
                string logDir = @"C:\ProgramData\MonitorServis\Log";
                Directory.CreateDirectory(logDir);
                File.AppendAllText(Path.Combine(logDir, "agent.log"), $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] [{level}] {message}{Environment.NewLine}");

                if (level == "ERROR" || level == "FATAL")
                    _logger.LogError(message);
                else if (level == "WARNING")
                    _logger.LogWarning(message);
                else
                    _logger.LogInformation(message);
            }
            catch (Exception logEx)
            {
                Console.WriteLine($"[KRİTİK - LOG YAZILAMADI] Asıl Mesaj: {message} | Log Hatası: {logEx.Message}");
            }
        }
    }

    public class ServerConfigDto { public string ServerIp { get; set; } = string.Empty; public string CustomName { get; set; } = string.Empty; public string ServiceName { get; set; } = string.Empty; public bool TrackCpu { get; set; } public bool TrackRam { get; set; } public bool TrackDisk { get; set; } public bool TrackNet { get; set; } }
    public class ServerHealthPayload { public string ServerId { get; set; } = string.Empty; public DateTime Timestamp { get; set; } public SystemMetrics Metrics { get; set; } = new(); public List<ServiceStatus> Services { get; set; } = new(); public List<DiskStatus> Disks { get; set; } = new(); }
    public class SystemMetrics { public string ServerName { get; set; } = string.Empty; public string CustomName { get; set; } = string.Empty; public double CpuUsage { get; set; } public int CpuCores { get; set; } public double TotalRamGb { get; set; } public double RamUsagePercentage { get; set; } public double NetworkDownloadMbps { get; set; } public double NetworkUploadMbps { get; set; } public bool TrackCpu { get; set; } public bool TrackRam { get; set; } public bool TrackDisk { get; set; } public bool TrackNet { get; set; } }
    public class ServiceStatus { public string ServiceName { get; set; } = string.Empty; public string DisplayName { get; set; } = string.Empty; public bool IsHealthy { get; set; } }
    public class DiskStatus { public string DriveLetter { get; set; } = string.Empty; public double TotalGb { get; set; } public double FreeGb { get; set; } public double UsagePercentage { get; set; } }
}