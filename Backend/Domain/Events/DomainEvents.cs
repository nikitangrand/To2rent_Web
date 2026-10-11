namespace Backend.Domain.Events;

public class BookingCreatedEvent
{
    public int BookingId { get; set; }
    public string PropertyTitle { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string ClientPhone { get; set; } = string.Empty;
    public string? ClientEmail { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public int GuestsCount { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BookingStatusChangedEvent
{
    public int BookingId { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}

public class InquiryCreatedEvent
{
    public int InquiryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ContactInfo { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? TargetManager { get; set; }
    public DateTime CreatedAt { get; set; }
}
