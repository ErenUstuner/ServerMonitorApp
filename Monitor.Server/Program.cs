using Monitor.Server.Hubs;
using Monitor.Server.Data; // Yeni ekledik
using Microsoft.EntityFrameworkCore; // Yeni ekledik

var builder = WebApplication.CreateBuilder(args);

// API Uç noktalarını (Controller) aktif ediyoruz
builder.Services.AddControllers();

// SQLite Veritabanımızı (monitor.db adında bir dosya olarak) sisteme kaydediyoruz
builder.Services.AddDbContext<MonitorDbContext>(options =>
    options.UseSqlite("Data Source=monitor.db"));

// Gerçek zamanlı iletişim (SignalR) servisini aktif ediyoruz
builder.Services.AddSignalR();

// CORS Ayarları: React ön yüzünün (localhost:5173) API'miz ile konuşmasına izin veren güvenlik kuralı.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowReactApp");
app.MapControllers();
app.MapHub<MonitorHub>("/monitorHub");

app.Run();