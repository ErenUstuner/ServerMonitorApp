using Microsoft.EntityFrameworkCore;
using Monitor.Server.Models;

namespace Monitor.Server.Data
{
    public class MonitorDbContext : DbContext
    {
        // Veritabanı ayarlarını dışarıdan (Program.cs'den) alabilmek için yapıcı metot (Constructor)
        public MonitorDbContext(DbContextOptions<MonitorDbContext> options) : base(options)
        {
        }

        // SQLite veritabanında "ServerConfigs" adında bir tablo oluşturulmasını emrediyoruz
        public DbSet<ServerConfig> ServerConfigs { get; set; }
    }
}