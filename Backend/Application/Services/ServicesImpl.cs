using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Domain.Events;
using Backend.Infrastructure.Messaging;
using Backend.Models;
using Microsoft.Extensions.Options;

namespace Backend.Application.Services;

public class PropertyService : IPropertyService
{
    private readonly IPropertyRepository _repository;

    public PropertyService(IPropertyRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<Property>> GetPropertiesAsync(PropertyFilterDto filter)
    {
        return await _repository.GetAllAsync(filter);
    }

    public async Task<Property?> GetPropertyByIdAsync(int id)
    {
        return await _repository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Property>> GetPopularPropertiesAsync()
    {
        return await _repository.GetPopularAsync();
    }

    public async Task<Property?> GetFeaturedPropertyAsync()
    {
        return await _repository.GetFeaturedAsync();
    }

    public async Task<Property> CreatePropertyAsync(CreatePropertyDto dto)
    {
        var property = new Property
        {
            Title = dto.Title,
            Type = dto.Type,
            City = dto.City,
            Price = dto.Price,
            Currency = dto.Currency,
            Description = dto.Description,
            FullDescription = dto.FullDescription,
            Rooms = dto.Rooms,
            Area = dto.Area,
            Floors = dto.Floors,
            LandArea = dto.LandArea,
            Image = string.IsNullOrWhiteSpace(dto.Image) ? "Images/Modern_house.jpg" : dto.Image,
            DetailLink = string.IsNullOrWhiteSpace(dto.DetailLink) ? (dto.Type == "apartment" ? "about_home_mos.html" : "about_house_los.html") : dto.DetailLink,
            IsPopular = dto.IsPopular,
            IsFeatured = dto.IsFeatured,
            CreatedAt = DateTime.UtcNow
        };

        return await _repository.AddAsync(property);
    }

    public async Task<Property?> UpdatePropertyAsync(int id, CreatePropertyDto dto)
    {
        var property = await _repository.GetByIdAsync(id);
        if (property == null) return null;

        property.Title = dto.Title;
        property.Type = dto.Type;
        property.City = dto.City;
        property.Price = dto.Price;
        property.Currency = dto.Currency;
        property.Description = dto.Description;
        property.FullDescription = dto.FullDescription;
        property.Rooms = dto.Rooms;
        property.Area = dto.Area;
        property.Floors = dto.Floors;
        property.LandArea = dto.LandArea;
        if (!string.IsNullOrWhiteSpace(dto.Image)) property.Image = dto.Image;
        if (!string.IsNullOrWhiteSpace(dto.DetailLink)) property.DetailLink = dto.DetailLink;
        property.IsPopular = dto.IsPopular;
        property.IsFeatured = dto.IsFeatured;

        return await _repository.UpdateAsync(property);
    }

    public async Task<bool> DeletePropertyAsync(int id)
    {
        return await _repository.DeleteAsync(id);
    }
}

public class BookingService : IBookingService
{
    private readonly IBookingRepository _bookingRepo;
    private readonly IPropertyRepository _propertyRepo;
    private readonly IEventPublisher _eventPublisher;
    private readonly KafkaSettings _kafkaSettings;

    public BookingService(
        IBookingRepository bookingRepo,
        IPropertyRepository propertyRepo,
        IEventPublisher eventPublisher,
        IOptions<KafkaSettings> kafkaOptions)
    {
        _bookingRepo = bookingRepo;
        _propertyRepo = propertyRepo;
        _eventPublisher = eventPublisher;
        _kafkaSettings = kafkaOptions.Value;
    }

    public async Task<IEnumerable<Booking>> GetBookingsAsync(string? status = null)
    {
        return await _bookingRepo.GetAllAsync(status);
    }

    public async Task<Booking?> GetBookingByIdAsync(int id)
    {
        return await _bookingRepo.GetByIdAsync(id);
    }

    public async Task<Booking> CreateBookingAsync(CreateBookingDto dto)
    {
        var checkIn = dto.CheckInDate == default ? DateTime.UtcNow.Date.AddDays(1) : dto.CheckInDate;
        var checkOut = dto.CheckOutDate == default || dto.CheckOutDate <= checkIn ? checkIn.AddDays(7) : dto.CheckOutDate;

        var propertyTitle = dto.PropertyTitle;
        var totalPrice = dto.TotalPrice;

        if (dto.PropertyId.HasValue && dto.PropertyId.Value > 0)
        {
            var prop = await _propertyRepo.GetByIdAsync(dto.PropertyId.Value);
            if (prop != null)
            {
                propertyTitle = prop.Title;
                if (totalPrice <= 0)
                {
                    var days = (int)Math.Max(1, (checkOut - checkIn).TotalDays);
                    var dailyRate = prop.Price / 30m;
                    totalPrice = Math.Round(dailyRate * days, 2);
                }
            }
        }

        var booking = new Booking
        {
            PropertyId = dto.PropertyId,
            PropertyTitle = propertyTitle ?? "Недвижимость TO2RENT",
            ClientName = dto.ClientName,
            ClientPhone = dto.ClientPhone,
            ClientEmail = dto.ClientEmail,
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            GuestsCount = dto.GuestsCount > 0 ? dto.GuestsCount : 1,
            TotalPrice = totalPrice,
            Notes = dto.Notes,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        var created = await _bookingRepo.AddAsync(booking);

        // Publish Event to Kafka asynchronously
        await _eventPublisher.PublishAsync(_kafkaSettings.BookingTopic, created.Id.ToString(), new BookingCreatedEvent
        {
            BookingId = created.Id,
            PropertyTitle = created.PropertyTitle,
            ClientName = created.ClientName,
            ClientPhone = created.ClientPhone,
            ClientEmail = created.ClientEmail,
            CheckInDate = created.CheckInDate,
            CheckOutDate = created.CheckOutDate,
            GuestsCount = created.GuestsCount,
            TotalPrice = created.TotalPrice,
            CreatedAt = created.CreatedAt
        });

        return created;
    }

    public async Task<Booking?> UpdateBookingStatusAsync(int id, string newStatus)
    {
        var booking = await _bookingRepo.GetByIdAsync(id);
        if (booking == null) return null;

        var oldStatus = booking.Status;
        booking.Status = newStatus;
        var updated = await _bookingRepo.UpdateAsync(booking);

        // Publish Event to Kafka
        await _eventPublisher.PublishAsync(_kafkaSettings.BookingTopic, updated.Id.ToString(), new BookingStatusChangedEvent
        {
            BookingId = updated.Id,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            ChangedAt = DateTime.UtcNow
        });

        return updated;
    }

    public async Task<bool> DeleteBookingAsync(int id)
    {
        return await _bookingRepo.DeleteAsync(id);
    }
}

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _repository;

    public ReviewService(IReviewRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<Review>> GetReviewsAsync(bool onlyApproved = true)
    {
        return await _repository.GetAllAsync(onlyApproved);
    }

    public async Task<Review> CreateReviewAsync(CreateReviewDto dto)
    {
        var review = new Review
        {
            Author = dto.Author,
            Rating = Math.Clamp(dto.Rating, 1, 5),
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow,
            IsApproved = true
        };

        return await _repository.AddAsync(review);
    }

    public async Task<bool> DeleteReviewAsync(int id)
    {
        return await _repository.DeleteAsync(id);
    }
}

public class InquiryService : IInquiryService
{
    private readonly IInquiryRepository _repository;
    private readonly IEventPublisher _eventPublisher;
    private readonly KafkaSettings _kafkaSettings;

    public InquiryService(
        IInquiryRepository repository,
        IEventPublisher eventPublisher,
        IOptions<KafkaSettings> kafkaOptions)
    {
        _repository = repository;
        _eventPublisher = eventPublisher;
        _kafkaSettings = kafkaOptions.Value;
    }

    public async Task<IEnumerable<Inquiry>> GetInquiriesAsync(string? status = null)
    {
        return await _repository.GetAllAsync(status);
    }

    public async Task<Inquiry> CreateInquiryAsync(CreateInquiryDto dto)
    {
        var inquiry = new Inquiry
        {
            Name = string.IsNullOrWhiteSpace(dto.Name) ? "Клиент" : dto.Name,
            ContactInfo = string.IsNullOrWhiteSpace(dto.ContactInfo) ? "Не указан" : dto.ContactInfo,
            Message = dto.Message,
            TargetManager = dto.TargetManager,
            Status = "New",
            CreatedAt = DateTime.UtcNow
        };

        var created = await _repository.AddAsync(inquiry);

        // Publish Event to Kafka
        await _eventPublisher.PublishAsync(_kafkaSettings.InquiryTopic, created.Id.ToString(), new InquiryCreatedEvent
        {
            InquiryId = created.Id,
            Name = created.Name,
            ContactInfo = created.ContactInfo,
            Message = created.Message,
            TargetManager = created.TargetManager,
            CreatedAt = created.CreatedAt
        });

        return created;
    }

    public async Task<Inquiry?> UpdateInquiryStatusAsync(int id, string status)
    {
        var inquiry = await _repository.GetByIdAsync(id);
        if (inquiry == null) return null;

        inquiry.Status = status;
        return await _repository.UpdateAsync(inquiry);
    }

    public async Task<bool> DeleteInquiryAsync(int id)
    {
        return await _repository.DeleteAsync(id);
    }
}

public class StatsService : IStatsService
{
    private readonly IPropertyRepository _propertyRepo;
    private readonly IBookingRepository _bookingRepo;
    private readonly IReviewRepository _reviewRepo;
    private readonly IInquiryRepository _inquiryRepo;

    public StatsService(
        IPropertyRepository propertyRepo,
        IBookingRepository bookingRepo,
        IReviewRepository reviewRepo,
        IInquiryRepository inquiryRepo)
    {
        _propertyRepo = propertyRepo;
        _bookingRepo = bookingRepo;
        _reviewRepo = reviewRepo;
        _inquiryRepo = inquiryRepo;
    }

    public async Task<StatsDto> GetStatsAsync()
    {
        var totalProps = await _propertyRepo.CountAsync();
        var totalAparts = await _propertyRepo.CountAsync("apartment");
        var totalHouses = await _propertyRepo.CountAsync("house");

        var totalBookings = await _bookingRepo.CountAsync();
        var pendingBookings = await _bookingRepo.CountAsync("Pending");
        var confirmedBookings = await _bookingRepo.CountAsync("Confirmed");
        var totalRevenue = await _bookingRepo.GetTotalRevenueAsync();

        var totalInquiries = await _inquiryRepo.CountAsync();
        var totalReviews = await _reviewRepo.CountAsync();
        var avgRating = await _reviewRepo.GetAverageRatingAsync();

        return new StatsDto
        {
            TotalProperties = totalProps,
            TotalApartments = totalAparts,
            TotalHouses = totalHouses,
            TotalBookings = totalBookings,
            PendingBookings = pendingBookings,
            ConfirmedBookings = confirmedBookings,
            TotalRevenue = totalRevenue,
            TotalInquiries = totalInquiries,
            TotalReviews = totalReviews,
            AverageRating = avgRating
        };
    }
}
