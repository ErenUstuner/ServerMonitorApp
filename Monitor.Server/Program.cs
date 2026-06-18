using System;
using Monitor.Server.Hubs;
using Monitor.Server.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // KESİN PORT SABİTLEME: Visual Studio ne derse desin sistem 5027'den kalkacak
    builder.WebHost.UseUrls("http://localhost:5027");

    // Konsol loglarını zorla açıyoruz
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
    builder.Logging.SetMinimumLevel(LogLevel.Information);

    builder.Services.AddControllers();

    // Veritabanı Servisi
    builder.Services.AddDbContext<MonitorDbContext>(options =>
        options.UseSqlite("Data Source=monitor.db"));

    builder.Services.AddSignalR();

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

    // OTOMATİK VERİTABANI OLUŞTURMA: Eğer db dosyası yoksa EFCore otomatik oluşturur
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MonitorDbContext>();
        db.Database.EnsureCreated();
        Console.WriteLine("[BAŞARILI] Veritabanı (monitor.db) kontrol edildi/hazır.");
    }

    app.UseCors("AllowReactApp");
    app.MapControllers();
    app.MapHub<MonitorHub>("/monitorHub");

    app.Lifetime.ApplicationStarted.Register(() =>
    {
        Console.WriteLine("\n[BAŞARILI] Monitor.Server API 5027 Portunda Başarıyla Ayağa Kalktı!");
        Console.WriteLine("[BİLGİ] React arayüzü ile bağlantı için CORS politikası (5173) aktif.\n");
    });

    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine("\n================ KRİTİK ÇÖKME HATASI ================");
    Console.WriteLine($"Zaman: {DateTime.Now}");
    Console.WriteLine($"Hata Detayı: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    Console.WriteLine("=====================================================\n");
    Console.WriteLine("Ekranı kapatmak için Enter'a basın...");
    Console.ReadLine();
}