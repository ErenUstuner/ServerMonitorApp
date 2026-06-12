using System;
using System.Collections.Generic;
using System.Text;

namespace Monitor.Shared
{
    public class ServerMetricsDto
    {
        public string ServerName { get; set; } = string.Empty;
        public double CpuUsage { get; set; }
        public double UsedRamGb { get; set; }
        public double TotalRamGb { get; set; }
        public double RamUsagePercentage => TotalRamGb > 0 ? (UsedRamGb / TotalRamGb) * 100 : 0;
        public List<DiskMetricsDto> Disks { get; set; } = new List<DiskMetricsDto>();
    }

    public class DiskMetricsDto
    {
        public string DriveName { get; set; } = string.Empty; // Örn: C:\, D:\
        public double TotalSpaceGb { get; set; }
        public double FreeSpaceGb { get; set; }
        public double UsedSpaceGb => TotalSpaceGb - FreeSpaceGb;
        public double UsagePercentage => TotalSpaceGb > 0 ? (UsedSpaceGb / TotalSpaceGb) * 100 : 0;
    }
}
