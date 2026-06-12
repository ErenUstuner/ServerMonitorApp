using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Monitor.Server.Data;
using Monitor.Server.Hubs;
using Monitor.Server.Models;
using Monitor.Shared;

namespace Monitor.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MonitorController : ControllerBase
    {
        private readonly IHubContext<MonitorHub> _hubContext;
        private readonly MonitorDbContext _dbContext;

        public MonitorController(IHubContext<MonitorHub> hubContext, MonitorDbContext dbContext)
        {
            _hubContext = hubContext;
            _dbContext = dbContext;
        }

        // 1. AJANLARI DİNLEYEN KAPI (Filtre Eklendi)
        [HttpPost("receive")]
        public async Task<IActionResult> ReceiveData([FromBody] ServerHealthPayload payload)
        {
            if (payload == null) return BadRequest("Geçersiz veri paketi.");

            // KRİTİK DÜZELTME: "ServerName" yerine ajanın gönderdiği doğru tanım olan "ServerId" kullanıldı.
            bool isTracked = await _dbContext.ServerConfigs.AnyAsync(s => s.ServerIp.ToLower() == payload.ServerId.ToLower());

            if (!isTracked)
            {
                // Kayıtlı değilse veriyi React'e gönderme, çöpe at.
                return Ok(new { Message = "Sunucu izleme listesinde değil, veri yoksayıldı." });
            }

            // Kayıtlıysa arayüze fırlat
            await _hubContext.Clients.All.SendAsync("ReceiveServerData", payload);
            return Ok(new { Message = "Veri arayüze iletildi." });
        }

        // 2. YENİ SUNUCU EKLEME (Çift Kayıt Kontrolü Eklendi)
        [HttpPost("add-server")]
        public async Task<IActionResult> AddServer([FromBody] ServerConfig config)
        {
            if (config == null || string.IsNullOrWhiteSpace(config.ServerIp))
                return BadRequest(new { Message = "Sunucu IP veya adı boş olamaz." });

            // Veritabanında bu isimde bir sunucu var mı kontrol et
            bool exists = await _dbContext.ServerConfigs.AnyAsync(s => s.ServerIp.ToLower() == config.ServerIp.ToLower());
            if (exists)
            {
                return BadRequest(new { Message = "Bu sunucu zaten sistemde kayıtlı!" });
            }

            _dbContext.ServerConfigs.Add(config);
            await _dbContext.SaveChangesAsync();

            return Ok(new { Message = "Sunucu başarıyla veritabanına kaydedildi.", ServerId = config.Id });
        }

        // 3. SUNUCU SİLME (Yeni Uç Nokta)
        // 3. SUNUCU SİLME (Toplu Silme Yeteneği ile Güncellendi)
        [HttpDelete("delete-server/{serverName}")]
        public async Task<IActionResult> DeleteServer(string serverName)
        {
            // Veri tabanındaki o isme ait TÜM kayıtları listeliyoruz
            var servers = await _dbContext.ServerConfigs
                .Where(s => s.ServerIp.ToLower() == serverName.ToLower())
                .ToListAsync();

            if (servers.Any())
            {
                // RemoveRange kullanarak eşleşen tüm mükerrer satırları tek seferde uçuruyoruz
                _dbContext.ServerConfigs.RemoveRange(servers);
                await _dbContext.SaveChangesAsync();

                return Ok(new { Message = "Sunucuya ait tüm mükerrer kayıtlar başarıyla temizlendi." });
            }

            return NotFound(new { Message = "Sunucu bulunamadı." });
        }
    }
}