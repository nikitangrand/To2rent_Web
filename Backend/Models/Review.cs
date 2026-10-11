using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Review
{
    public int Id { get; set; }
    
    [Required]
    public string Author { get; set; } = string.Empty;
    
    [Range(1, 5)]
    public int Rating { get; set; } = 5;
    
    [Required]
    public string Comment { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsApproved { get; set; } = true;
}
