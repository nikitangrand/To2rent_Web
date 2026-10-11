using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Inquiry
{
    public int Id { get; set; }
    
    public string Name { get; set; } = "Гость";
    
    [Required]
    public string ContactInfo { get; set; } = string.Empty; // phone or email
    
    [Required]
    public string Message { get; set; } = string.Empty;
    
    public string? TargetManager { get; set; } // "Макс", "Анна" etc.
    
    public string Status { get; set; } = "New"; // "New", "Processed"
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
