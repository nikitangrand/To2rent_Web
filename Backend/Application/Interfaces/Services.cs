using Backend.Models;
using Backend.Domain.DTOs;

namespace Backend.Application.Interfaces;

public interface IPropertyService
{
    Task<IEnumerable<Property>> GetPropertiesAsync(PropertyFilterDto filter);
    Task<Property?> GetPropertyByIdAsync(int id);
    Task<IEnumerable<Property>> GetPopularPropertiesAsync();
    Task<Property?> GetFeaturedPropertyAsync();
    Task<Property> CreatePropertyAsync(CreatePropertyDto dto);
    Task<Property?> UpdatePropertyAsync(int id, CreatePropertyDto dto);
    Task<bool> DeletePropertyAsync(int id);
}

public interface IBookingService
{
    Task<IEnumerable<Booking>> GetBookingsAsync(string? status = null);
    Task<Booking?> GetBookingByIdAsync(int id);
    Task<Booking> CreateBookingAsync(CreateBookingDto dto);
    Task<Booking?> UpdateBookingStatusAsync(int id, string newStatus);
    Task<bool> DeleteBookingAsync(int id);
    Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId, string? email = null, string? phone = null);
    Task<Booking?> CancelBookingAsync(int id, int? requestingUserId = null);
}

public interface IReviewService
{
    Task<IEnumerable<Review>> GetReviewsAsync(bool onlyApproved = true);
    Task<Review> CreateReviewAsync(CreateReviewDto dto);
    Task<Review?> ToggleApprovalAsync(int id, bool isApproved);
    Task<bool> DeleteReviewAsync(int id);
}

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<UserDto?> GetCurrentUserAsync(int userId);
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileDto dto);
}

public interface IInquiryService
{
    Task<IEnumerable<Inquiry>> GetInquiriesAsync(string? status = null);
    Task<Inquiry> CreateInquiryAsync(CreateInquiryDto dto);
    Task<Inquiry?> UpdateInquiryStatusAsync(int id, string status);
    Task<bool> DeleteInquiryAsync(int id);
}

public interface IStatsService
{
    Task<StatsDto> GetStatsAsync();
}

public interface IEventPublisher
{
    Task PublishAsync<T>(string topic, string key, T message) where T : class;
}
