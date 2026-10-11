using Backend.Models;
using Backend.Domain.DTOs;

namespace Backend.Application.Interfaces;

public interface IPropertyRepository
{
    Task<IEnumerable<Property>> GetAllAsync(PropertyFilterDto filter);
    Task<Property?> GetByIdAsync(int id);
    Task<IEnumerable<Property>> GetPopularAsync();
    Task<Property?> GetFeaturedAsync();
    Task<Property> AddAsync(Property property);
    Task<Property> UpdateAsync(Property property);
    Task<bool> DeleteAsync(int id);
    Task<int> CountAsync(string? type = null);
}

public interface IBookingRepository
{
    Task<IEnumerable<Booking>> GetAllAsync(string? status = null);
    Task<Booking?> GetByIdAsync(int id);
    Task<Booking> AddAsync(Booking booking);
    Task<Booking> UpdateAsync(Booking booking);
    Task<bool> DeleteAsync(int id);
    Task<int> CountAsync(string? status = null);
    Task<decimal> GetTotalRevenueAsync();
}

public interface IReviewRepository
{
    Task<IEnumerable<Review>> GetAllAsync(bool onlyApproved = true);
    Task<Review?> GetByIdAsync(int id);
    Task<Review> AddAsync(Review review);
    Task<Review> UpdateAsync(Review review);
    Task<bool> DeleteAsync(int id);
    Task<int> CountAsync();
    Task<double> GetAverageRatingAsync();
}

public interface IInquiryRepository
{
    Task<IEnumerable<Inquiry>> GetAllAsync(string? status = null);
    Task<Inquiry?> GetByIdAsync(int id);
    Task<Inquiry> AddAsync(Inquiry inquiry);
    Task<Inquiry> UpdateAsync(Inquiry inquiry);
    Task<bool> DeleteAsync(int id);
    Task<int> CountAsync(string? status = null);
}

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByUsernameOrEmailAsync(string identifier);
    Task<bool> ExistsAsync(string username, string email);
    Task<User> AddAsync(User user);
    Task<IEnumerable<User>> GetAllAsync();
}

