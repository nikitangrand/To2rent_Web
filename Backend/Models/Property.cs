namespace Backend.Models;

public class Property
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "apartment"; // "apartment" or "house"
    public string City { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "$";
    public string Description { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public int Rooms { get; set; }
    public int Area { get; set; }
    public int? Floors { get; set; }
    public int? LandArea { get; set; }
    public string Image { get; set; } = string.Empty;
    public string DetailLink { get; set; } = string.Empty;
    public bool IsPopular { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
