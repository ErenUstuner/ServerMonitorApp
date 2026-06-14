using System.ComponentModel.DataAnnotations;

namespace Monitor.Server.Models
{
    public class ServerConfig
    {
        [Key]
        public int Id { get; set; }
        public string ServerIp { get; set; } = string.Empty;

        // YENİ: Özelleştirilmiş Sunucu Adı
        public string CustomName { get; set; } = string.Empty;

        public string ServiceName { get; set; } = string.Empty;
        public string Certificates { get; set; } = string.Empty;

        // YENİ: Donanım İzleme Bayrakları (Flags)
        public bool TrackCpu { get; set; } = true;
        public bool TrackRam { get; set; } = true;
        public bool TrackDisk { get; set; } = true;
        public bool TrackNet { get; set; } = true;
    }
}