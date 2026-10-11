using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Domain.Events;
using Backend.Infrastructure.Messaging;
using Backend.Infrastructure.Security;
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

        if (checkIn.Date < DateTime.UtcNow.Date.AddDays(-1))
        {
            throw new ArgumentException("Дата заезда не может быть в прошлом.");
        }

        if (checkOut.Date <= checkIn.Date)
        {
            throw new ArgumentException("Дата выезда должна быть позже даты заезда минимум на 1 день.");
        }

        if (dto.PropertyId.HasValue && dto.PropertyId.Value > 0)
        {
            var isOverlap = await _bookingRepo.HasOverlappingBookingAsync(dto.PropertyId.Value, checkIn, checkOut);
            if (isOverlap)
            {
                throw new InvalidOperationException("Выбранные даты уже забронированы для этого объекта. Пожалуйста, выберите другие свободные даты.");
            }
        }

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
                    var dailyRate = prop.Price > 5000 ? prop.Price / 30m : prop.Price;
                    totalPrice = Math.Round(dailyRate * days, 2);
                }
            }
        }

        var booking = new Booking
        {
            UserId = dto.UserId,
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

    public async Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId, string? email = null, string? phone = null)
    {
        return await _bookingRepo.GetByUserIdAsync(userId, email, phone);
    }

    public async Task<Booking?> CancelBookingAsync(int id, int? requestingUserId = null)
    {
        var booking = await _bookingRepo.GetByIdAsync(id);
        if (booking == null) return null;

        if (requestingUserId.HasValue && booking.UserId.HasValue && booking.UserId.Value != requestingUserId.Value)
        {
            throw new UnauthorizedAccessException("У вас нет прав на отмену этой брони.");
        }

        var oldStatus = booking.Status;
        booking.Status = "Cancelled";
        var updated = await _bookingRepo.UpdateAsync(booking);

        await _eventPublisher.PublishAsync(_kafkaSettings.BookingTopic, updated.Id.ToString(), new BookingStatusChangedEvent
        {
            BookingId = updated.Id,
            OldStatus = oldStatus,
            NewStatus = "Cancelled",
            ChangedAt = DateTime.UtcNow
        });

        return updated;
    }

    public async Task<List<BookedDateRangeDto>> GetBookedDatesForPropertyAsync(int propertyId)
    {
        var bookings = await _bookingRepo.GetActiveBookingsForPropertyAsync(propertyId);
        return bookings.Select(b => new BookedDateRangeDto
        {
            StartDate = b.CheckInDate,
            EndDate = b.CheckOutDate,
            Status = b.Status
        }).ToList();
    }
}

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _repository;
    private readonly IPropertyRepository _propertyRepository;

    public ReviewService(IReviewRepository repository, IPropertyRepository propertyRepository)
    {
        _repository = repository;
        _propertyRepository = propertyRepository;
    }

    public async Task<IEnumerable<Review>> GetReviewsAsync(bool onlyApproved = true, int? propertyId = null)
    {
        return await _repository.GetAllAsync(onlyApproved, propertyId);
    }

    public async Task<IEnumerable<Review>> GetPropertyReviewsAsync(int propertyId)
    {
        return await _repository.GetByPropertyIdAsync(propertyId, onlyApproved: true);
    }

    public async Task<PropertyRatingSummaryDto> GetPropertyRatingSummaryAsync(int propertyId)
    {
        var count = await _repository.CountAsync(propertyId);
        var avg = await _repository.GetAverageRatingAsync(propertyId);
        return new PropertyRatingSummaryDto
        {
            PropertyId = propertyId,
            AverageRating = avg,
            ReviewsCount = count
        };
    }

    public async Task<Review> CreateReviewAsync(CreateReviewDto dto)
    {
        string? propertyTitle = dto.PropertyTitle;
        if (dto.PropertyId.HasValue && dto.PropertyId.Value > 0 && string.IsNullOrWhiteSpace(propertyTitle))
        {
            var prop = await _propertyRepository.GetByIdAsync(dto.PropertyId.Value);
            if (prop != null)
            {
                propertyTitle = prop.Title;
            }
        }

        var review = new Review
        {
            PropertyId = dto.PropertyId,
            UserId = dto.UserId,
            PropertyTitle = propertyTitle,
            Author = dto.Author,
            Rating = Math.Clamp(dto.Rating, 1, 5),
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow,
            IsApproved = true
        };

        return await _repository.AddAsync(review);
    }

    public async Task<Review?> ToggleApprovalAsync(int id, bool isApproved)
    {
        var review = await _repository.GetByIdAsync(id);
        if (review == null) return null;

        review.IsApproved = isApproved;
        return await _repository.UpdateAsync(review);
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

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;

    public AuthService(IUserRepository userRepo)
    {
        _userRepo = userRepo;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        if (await _userRepo.ExistsAsync(dto.Username, dto.Email))
        {
            throw new InvalidOperationException("Пользователь с таким логином или email уже существует.");
        }

        var user = new User
        {
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = PasswordHasher.HashPassword(dto.Password),
            FullName = string.IsNullOrWhiteSpace(dto.FullName) ? dto.Username : dto.FullName.Trim(),
            Phone = dto.Phone?.Trim() ?? string.Empty,
            Role = string.Equals(dto.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "Client",
            CreatedAt = DateTime.UtcNow
        };

        var created = await _userRepo.AddAsync(user);
        var token = JwtTokenGenerator.GenerateToken(created);

        return new AuthResponseDto
        {
            Token = token,
            User = MapToUserDto(created)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userRepo.GetByUsernameOrEmailAsync(dto.UsernameOrEmail);
        if (user == null || !PasswordHasher.VerifyPassword(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Неверный логин или пароль.");
        }

        var token = JwtTokenGenerator.GenerateToken(user);
        return new AuthResponseDto
        {
            Token = token,
            User = MapToUserDto(user)
        };
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        return user == null ? null : MapToUserDto(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepo.GetAllAsync();
        return users.Select(MapToUserDto);
    }

    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Пользователь не найден.");
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
        }

        if (dto.Phone != null)
        {
            user.Phone = dto.Phone.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var newEmail = dto.Email.Trim().ToLower();
            if (newEmail != user.Email.ToLower())
            {
                var existing = await _userRepo.GetByUsernameOrEmailAsync(newEmail);
                if (existing != null && existing.Id != user.Id)
                {
                    throw new InvalidOperationException("Email уже используется другим аккаунтом.");
                }
                user.Email = newEmail;
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || !PasswordHasher.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Текущий пароль указан неверно.");
            }
            if (dto.NewPassword.Length < 6)
            {
                throw new InvalidOperationException("Новый пароль должен содержать не менее 6 символов.");
            }
            user.PasswordHash = PasswordHasher.HashPassword(dto.NewPassword);
        }

        var updated = await _userRepo.UpdateAsync(user);
        return MapToUserDto(updated);
    }

    private static UserDto MapToUserDto(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Email = u.Email,
        FullName = u.FullName,
        Phone = u.Phone,
        Role = u.Role,
        CreatedAt = u.CreatedAt
    };
}

public class FavoriteService : IFavoriteService
{
    private readonly IFavoriteRepository _favoriteRepo;

    public FavoriteService(IFavoriteRepository favoriteRepo)
    {
        _favoriteRepo = favoriteRepo;
    }

    public async Task<IEnumerable<Property>> GetFavoritesAsync(int userId)
    {
        return await _favoriteRepo.GetUserFavoritesAsync(userId);
    }

    public async Task<List<int>> GetFavoritePropertyIdsAsync(int userId)
    {
        return await _favoriteRepo.GetFavoritePropertyIdsAsync(userId);
    }

    public async Task<bool> AddFavoriteAsync(int userId, int propertyId)
    {
        return await _favoriteRepo.AddAsync(userId, propertyId);
    }

    public async Task<bool> RemoveFavoriteAsync(int userId, int propertyId)
    {
        return await _favoriteRepo.RemoveAsync(userId, propertyId);
    }

    public async Task<bool> IsFavoriteAsync(int userId, int propertyId)
    {
        return await _favoriteRepo.IsFavoriteAsync(userId, propertyId);
    }
}

