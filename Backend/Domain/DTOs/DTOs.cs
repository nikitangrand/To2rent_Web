using System.ComponentModel.DataAnnotations;

namespace Backend.Domain.DTOs;

public class CreatePropertyDto
{
    [Required]
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
}

public class PropertyFilterDto
{
    public string? Type { get; set; }
    public string? City { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinRooms { get; set; }
    public int? MaxRooms { get; set; }
    public string? Search { get; set; }
    public string? Sort { get; set; }
}

public class CreateBookingDto
{
    public int? PropertyId { get; set; }
    public string? PropertyTitle { get; set; }

    [Required]
    public string ClientName { get; set; } = string.Empty;

    [Required]
    public string ClientPhone { get; set; } = string.Empty;

    public string? ClientEmail { get; set; }

    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public int GuestsCount { get; set; } = 1;
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}

public class UpdateStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class CreateReviewDto
{
    [Required]
    public string Author { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    [Required]
    public string Comment { get; set; } = string.Empty;
}

public class CreateInquiryDto
{
    public string Name { get; set; } = "Клиент";

    [Required]
    public string ContactInfo { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    public string? TargetManager { get; set; }
}
