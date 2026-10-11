namespace Backend.Models;

public class StatsDto
{
    public int TotalProperties { get; set; }
    public int TotalApartments { get; set; }
    public int TotalHouses { get; set; }
    public int TotalBookings { get; set; }
    public int PendingBookings { get; set; }
    public int ConfirmedBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalInquiries { get; set; }
    public int TotalReviews { get; set; }
    public double AverageRating { get; set; }
}
