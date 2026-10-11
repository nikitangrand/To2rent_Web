using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Booking
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public int? PropertyId { get; set; }
    
    [Required]
    public string PropertyTitle { get; set; } = string.Empty;
    
    [Required]
    public string ClientName { get; set; } = string.Empty;
    
    [Required]
    [Phone]
    public string ClientPhone { get; set; } = string.Empty;
    
    [EmailAddress]
    public string? ClientEmail { get; set; }
    
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    
    public int GuestsCount { get; set; } = 1;
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
    
    // Status: Pending, Confirmed, Cancelled, Completed
    public string Status { get; set; } = "Pending";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
