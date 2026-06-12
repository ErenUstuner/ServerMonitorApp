using Microsoft.AspNetCore.SignalR;

namespace Monitor.Server.Hubs
{
    // Hub sınıfından miras alarak buranın bir SignalR iletişim merkezi olduğunu belirtiyoruz.
    public class MonitorHub : Hub
    {
        // İstemciler (React arayüzü) buraya bağlanacak. 
        // Özel bir koda şimdilik gerek yok, çünkü API veriyi aldıkça bu merkez üzerinden herkese anlık "yayın" (broadcast) yapacak.
    }
}