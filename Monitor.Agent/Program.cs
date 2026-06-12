using Monitor.Agent;

// Ana oluşturucuyu başlatıyoruz
var builder = Host.CreateApplicationBuilder(args);

// Programın bir Windows Servisi olarak (arka planda) çalışmasını emrediyoruz
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "TubitakMonitorAgent";
});

// Ajanımızın kalbini (Worker) sisteme tanıtıyoruz
builder.Services.AddHostedService<Worker>();

// Sistemi inşa et ve sonsuza kadar çalıştır
var host = builder.Build();
host.Run();