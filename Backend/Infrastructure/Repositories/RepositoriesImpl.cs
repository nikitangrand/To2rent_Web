using Backend.Application.Interfaces;
using Backend.Data;
using Backend.Domain.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

public class PropertyRepository : IPropertyRepository
{
    private readonly AppDbContext _context;

    public PropertyRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Property>> GetAllAsync(PropertyFilterDto filter)
    {
        var query = _context.Properties.AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Type))
        {
            var lowerType = filter.Type.Trim().ToLower();
            query = query.Where(p => p.Type.ToLower() == lowerType);
        }

        if (!string.IsNullOrWhiteSpace(filter.City))
        {
            var lowerCity = filter.City.Trim().ToLower();
            query = query.Where(p => p.City.ToLower().Contains(lowerCity));
        }

        if (filter.MinPrice.HasValue)
        {
            query = query.Where(p => p.Price >= filter.MinPrice.Value);
        }

        if (filter.MaxPrice.HasValue)
        {
            query = query.Where(p => p.Price <= filter.MaxPrice.Value);
        }

        if (filter.MinRooms.HasValue)
        {
            query = query.Where(p => p.Rooms >= filter.MinRooms.Value);
        }

        if (filter.MaxRooms.HasValue)
        {
            query = query.Where(p => p.Rooms <= filter.MaxRooms.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var lowerSearch = filter.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Title.ToLower().Contains(lowerSearch) ||
                p.Description.ToLower().Contains(lowerSearch) ||
                p.City.ToLower().Contains(lowerSearch) ||
                p.FullDescription.ToLower().Contains(lowerSearch));
        }

        query = filter.Sort?.ToLower() switch
        {
            "price_asc" => query.OrderBy(p => p.Price),
            "price_desc" => query.OrderByDescending(p => p.Price),
            "area_desc" => query.OrderByDescending(p => p.Area),
            "area_asc" => query.OrderBy(p => p.Area),
            "rooms_desc" => query.OrderByDescending(p => p.Rooms),
            "title_asc" => query.OrderBy(p => p.Title),
            _ => query.OrderByDescending(p => p.Id)
        };

        return await query.ToListAsync();
    }

    public async Task<Property?> GetByIdAsync(int id)
    {
        return await _context.Properties.FindAsync(id);
    }

    public async Task<IEnumerable<Property>> GetPopularAsync()
    {
        return await _context.Properties
            .Where(p => p.IsPopular)
            .OrderBy(p => p.Id)
            .Take(4)
            .ToListAsync();
    }

    public async Task<Property?> GetFeaturedAsync()
    {
        var featured = await _context.Properties.FirstOrDefaultAsync(p => p.IsFeatured);
        return featured ?? await _context.Properties.OrderByDescending(p => p.Price).FirstOrDefaultAsync();
    }

    public async Task<Property> AddAsync(Property property)
    {
        _context.Properties.Add(property);
        await _context.SaveChangesAsync();
        return property;
    }

    public async Task<Property> UpdateAsync(Property property)
    {
        _context.Properties.Update(property);
        await _context.SaveChangesAsync();
        return property;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var property = await _context.Properties.FindAsync(id);
        if (property == null) return false;

        _context.Properties.Remove(property);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> CountAsync(string? type = null)
    {
        if (string.IsNullOrWhiteSpace(type))
            return await _context.Properties.CountAsync();

        return await _context.Properties.CountAsync(p => p.Type.ToLower() == type.ToLower());
    }
}

public class BookingRepository : IBookingRepository
{
    private readonly AppDbContext _context;

    public BookingRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Booking>> GetAllAsync(string? status = null)
    {
        var query = _context.Bookings.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(b => b.Status.ToLower() == status.Trim().ToLower());
        }
        return await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<Booking?> GetByIdAsync(int id)
    {
        return await _context.Bookings.FindAsync(id);
    }

    public async Task<Booking> AddAsync(Booking booking)
    {
        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();
        return booking;
    }

    public async Task<Booking> UpdateAsync(Booking booking)
    {
        _context.Bookings.Update(booking);
        await _context.SaveChangesAsync();
        return booking;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return false;

        _context.Bookings.Remove(booking);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> CountAsync(string? status = null)
    {
        if (string.IsNullOrWhiteSpace(status))
            return await _context.Bookings.CountAsync();

        return await _context.Bookings.CountAsync(b => b.Status.ToLower() == status.ToLower());
    }

    public async Task<decimal> GetTotalRevenueAsync()
    {
        return await _context.Bookings
            .Where(b => b.Status == "Confirmed" || b.Status == "Completed")
            .SumAsync(b => b.TotalPrice);
    }
}

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _context;

    public ReviewRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Review>> GetAllAsync(bool onlyApproved = true)
    {
        var query = _context.Reviews.AsQueryable();
        if (onlyApproved)
        {
            query = query.Where(r => r.IsApproved);
        }
        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<Review?> GetByIdAsync(int id)
    {
        return await _context.Reviews.FindAsync(id);
    }

    public async Task<Review> AddAsync(Review review)
    {
        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return review;
    }

    public async Task<Review> UpdateAsync(Review review)
    {
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
        return review;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return false;

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> CountAsync()
    {
        return await _context.Reviews.CountAsync();
    }

    public async Task<double> GetAverageRatingAsync()
    {
        var count = await _context.Reviews.CountAsync();
        if (count == 0) return 5.0;

        return Math.Round(await _context.Reviews.AverageAsync(r => r.Rating), 1);
    }
}

public class InquiryRepository : IInquiryRepository
{
    private readonly AppDbContext _context;

    public InquiryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Inquiry>> GetAllAsync(string? status = null)
    {
        var query = _context.Inquiries.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status.ToLower() == status.Trim().ToLower());
        }
        return await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
    }

    public async Task<Inquiry?> GetByIdAsync(int id)
    {
        return await _context.Inquiries.FindAsync(id);
    }

    public async Task<Inquiry> AddAsync(Inquiry inquiry)
    {
        _context.Inquiries.Add(inquiry);
        await _context.SaveChangesAsync();
        return inquiry;
    }

    public async Task<Inquiry> UpdateAsync(Inquiry inquiry)
    {
        _context.Inquiries.Update(inquiry);
        await _context.SaveChangesAsync();
        return inquiry;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inquiry = await _context.Inquiries.FindAsync(id);
        if (inquiry == null) return false;

        _context.Inquiries.Remove(inquiry);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> CountAsync(string? status = null)
    {
        if (string.IsNullOrWhiteSpace(status))
            return await _context.Inquiries.CountAsync();

        return await _context.Inquiries.CountAsync(i => i.Status.ToLower() == status.ToLower());
    }
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users.FindAsync(id);
    }

    public async Task<User?> GetByUsernameOrEmailAsync(string identifier)
    {
        var lower = identifier.Trim().ToLower();
        return await _context.Users.FirstOrDefaultAsync(u => 
            u.Username.ToLower() == lower || u.Email.ToLower() == lower);
    }

    public async Task<bool> ExistsAsync(string username, string email)
    {
        var uLower = username.Trim().ToLower();
        var eLower = email.Trim().ToLower();
        return await _context.Users.AnyAsync(u => 
            u.Username.ToLower() == uLower || u.Email.ToLower() == eLower);
    }

    public async Task<User> AddAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        return await _context.Users.OrderByDescending(u => u.CreatedAt).ToListAsync();
    }
}

