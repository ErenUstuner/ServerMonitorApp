using System.ComponentModel.DataAnnotations;

namespace Monitor.Server.Models
{
    public class GlobalCertificate
    {
        [Key]
        public int Id { get; set; }
        public string PathOrUrl { get; set; } = string.Empty;
    }
}