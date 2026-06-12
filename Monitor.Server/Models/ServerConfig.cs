namespace Monitor.Server.Models
{
    public class ServerConfig
    {
        // Veritabanındaki eşsiz kimlik (Primary Key)
        public int Id { get; set; }

        // React formundan gelecek veriler
        public string ServerIp { get; set; } = string.Empty;
        public string? CertificatePath { get; set; } // Soru işareti (?) bu alanın boş bırakılabileceğini belirtir
        public string? ServiceName { get; set; }

        // Modül Seçimleri
        public bool TrackRam { get; set; } = true;
        public bool TrackCpu { get; set; } = true;
        public bool TrackDisk { get; set; } = true;

        // Sisteme eklendiği tarih (Loglama için iyi bir mühendislik pratiğidir)
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}