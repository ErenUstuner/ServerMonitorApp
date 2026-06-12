using System.Management;
using Monitor.Shared;

namespace Monitor.Agent.Collectors
{
    // Sadece Windows üzerinde çalışacağını sisteme belirtiyoruz
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public class HardwareCollector
    {
        public ServerMetricsDto GetMetrics()
        {
            var metrics = new ServerMetricsDto
            {
                ServerName = Environment.MachineName,
                Disks = GetDiskMetrics()
            };

            // RAM Bilgilerini Çekme (WMI ile)
            using (var ramSearcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem"))
            {
                foreach (var item in ramSearcher.Get())
                {
                    // WMI veriyi Kilobayt (KB) olarak verir. Biz bunu Gigabayt'a (GB) çeviriyoruz.
                    double totalRamKb = Convert.ToDouble(item["TotalVisibleMemorySize"]);
                    double freeRamKb = Convert.ToDouble(item["FreePhysicalMemory"]);

                    metrics.TotalRamGb = Math.Round(totalRamKb / (1024 * 1024), 2);
                    double freeRamGb = Math.Round(freeRamKb / (1024 * 1024), 2);
                    metrics.UsedRamGb = Math.Round(metrics.TotalRamGb - freeRamGb, 2);
                }
            }

            // CPU Yüzdesini Çekme (WMI ile)
            using (var cpuSearcher = new ManagementObjectSearcher("SELECT LoadPercentage FROM Win32_Processor"))
            {
                foreach (var item in cpuSearcher.Get())
                {
                    if (item["LoadPercentage"] != null)
                    {
                        metrics.CpuUsage = Convert.ToDouble(item["LoadPercentage"]);
                        break;
                    }
                }
            }

            return metrics;
        }

        private List<DiskMetricsDto> GetDiskMetrics()
        {
            var disks = new List<DiskMetricsDto>();

            // Bilgisayardaki tüm disk sürücülerini bul
            DriveInfo[] allDrives = DriveInfo.GetDrives();

            foreach (DriveInfo drive in allDrives)
            {
                // Sadece hazır durumda olan (takılı) ve sabit disk olanları al (CD-ROM vs. hariç)
                if (drive.IsReady && drive.DriveType == DriveType.Fixed)
                {
                    // Bayt (Byte) değerini Gigabayt'a (GB) çeviriyoruz
                    double totalGb = Math.Round(drive.TotalSize / (1024.0 * 1024 * 1024), 2);
                    double freeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024 * 1024), 2);

                    disks.Add(new DiskMetricsDto
                    {
                        DriveName = drive.Name, // Örnek: C:\
                        TotalSpaceGb = totalGb,
                        FreeSpaceGb = freeGb
                    });
                }
            }

            return disks;
        }
    }
}