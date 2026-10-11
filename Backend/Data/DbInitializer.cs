using Backend.Models;

namespace Backend.Data;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        context.Database.EnsureCreated();

        if (context.Properties.Any())
        {
            return; // DB has been seeded
        }

        var properties = new List<Property>
        {
            // Apartments
            new Property
            {
                Title = "Апартаменты Лос Анджелес",
                Type = "apartment",
                City = "Лос Анджелес",
                Price = 1200000,
                Currency = "$",
                Description = "Современная квартира с новым ремонтом",
                FullDescription = "Просторные премиум-апартаменты в престижном районе Лос-Анджелеса с дизайнерской отделкой, панорамными окнами и современной системой кондиционирования.",
                Rooms = 8,
                Area = 150,
                Image = "Images/Los_home.png",
                DetailLink = "Html-Pages/about_home_los.html",
                IsPopular = false,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new Property
            {
                Title = "Апартаменты Лондон",
                Type = "apartment",
                City = "Лондон",
                Price = 1500000,
                Currency = "$",
                Description = "Просторная квартира в центре Лондона",
                FullDescription = "Элитное жилье в историческом центре британской столицы с высокими потолками, камином и потрясающим видом на городские парки.",
                Rooms = 6,
                Area = 85,
                Image = "Images/London_home.jpg",
                DetailLink = "Html-Pages/about_home_lon.html",
                IsPopular = false,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            },
            new Property
            {
                Title = "Апартаменты Москва",
                Type = "apartment",
                City = "Москва",
                Price = 110000,
                Currency = "$",
                Description = "Стандартная квартира в Бибирево",
                FullDescription = "Уютная однокомнатная квартира со свежим косметическим ремонтом, полностью меблированная, в 7 минутах пешком от станции метро.",
                Rooms = 1,
                Area = 42,
                Image = "Images/Moscow_home.jpeg",
                DetailLink = "Html-Pages/about_home_mos.html",
                IsPopular = true,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new Property
            {
                Title = "Апартаменты Минск",
                Type = "apartment",
                City = "Минск",
                Price = 95000,
                Currency = "$",
                Description = "Комфортная квартира на Уручье",
                FullDescription = "Светлая двухкомнатная квартира в тихом зеленом районе столицы. Рядом парк, удобная транспортная развязка, развитая инфраструктура.",
                Rooms = 2,
                Area = 48,
                Image = "Images/Minsk_home.jpg",
                DetailLink = "Html-Pages/about_home_min.html",
                IsPopular = true,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            },

            // Houses
            new Property
            {
                Title = "Коттедж Modern Лос Анджелес",
                Type = "house",
                City = "Лос Анджелес",
                Price = 820000,
                Currency = "$",
                Description = "Современный дом передовых технологий",
                FullDescription = "Инновационный коттедж с системой 'умный дом', собственным бассейном, просторной террасой и дизайнерским ландшафтным оформлением участка.",
                Rooms = 5,
                Area = 500,
                Floors = 2,
                LandArea = 500,
                Image = "Images/Modern_house.jpg",
                DetailLink = "Html-Pages/about_house_los.html",
                IsPopular = true,
                IsFeatured = true,
                CreatedAt = DateTime.UtcNow.AddDays(-40)
            },
            new Property
            {
                Title = "Коттедж Семейный Лондон",
                Type = "house",
                City = "Лондон",
                Price = 470000,
                Currency = "$",
                Description = "Классический дом с минималистичным дизайном",
                FullDescription = "Традиционный британский особняк в викторианском стиле с уютным садом, просторной гостиной и приватной зоной отдыха для большой семьи.",
                Rooms = 6,
                Area = 300,
                Floors = 3,
                LandArea = 300,
                Image = "Images/London.jpg",
                DetailLink = "Html-Pages/about_house_lon.html",
                IsPopular = true,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-35)
            },
            new Property
            {
                Title = "Коттедж Стандарт Москва",
                Type = "house",
                City = "Москва",
                Price = 380000,
                Currency = "$",
                Description = "Стандартный дом в строгом стиле",
                FullDescription = "Двухэтажный загородный дом в охраняемом поселке. Чистый воздух, лесная территория, гараж на 2 автомобиля и современная инженерия.",
                Rooms = 4,
                Area = 400,
                Floors = 2,
                LandArea = 400,
                Image = "Images/Moscow.jpeg",
                DetailLink = "Html-Pages/about_house_mos.html",
                IsPopular = false,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            },
            new Property
            {
                Title = "Коттедж Элитный Минск",
                Type = "house",
                City = "Минск",
                Price = 210000,
                Currency = "$",
                Description = "Просторный дом с зимним садом",
                FullDescription = "Респектабельный коттедж с панорамным остеклением, зимним садом, каминным залом и баней в престижном пригородном поселке.",
                Rooms = 5,
                Area = 350,
                Floors = 2,
                LandArea = 350,
                Image = "Images/Minsk.jpg",
                DetailLink = "Html-Pages/about_house_min.html",
                IsPopular = false,
                IsFeatured = false,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            }
        };

        context.Properties.AddRange(properties);
        context.SaveChanges();

        // Seed Reviews
        var reviews = new List<Review>
        {
            new Review
            {
                Author = "Анна Петрова",
                Rating = 5,
                Comment = "Огромное спасибо агентству TO2RENT за профессионализм и индивидуальный подход! Нашли для меня идеальную квартиру за неделю, все документы оформили быстро и без лишних хлопот.",
                CreatedAt = DateTime.UtcNow.AddDays(-180),
                IsApproved = true
            },
            new Review
            {
                Author = "Сергей Иванов",
                Rating = 5,
                Comment = "TO2RENT помогли с арендой квартиры по отличной цене. Особенно понравилось, что агенты всегда были на связи и подробно объясняли все этапы сделки.",
                CreatedAt = DateTime.UtcNow.AddDays(-220),
                IsApproved = true
            },
            new Review
            {
                Author = "Мария К.",
                Rating = 4,
                Comment = "Очень понравился сервис и дружелюбие команды. Немного задержались с подбором вариантов, но в итоге нашли отличный дом для всей семьи.",
                CreatedAt = DateTime.UtcNow.AddDays(-230),
                IsApproved = true
            },
            new Review
            {
                Author = "Дмитрий Соколов",
                Rating = 5,
                Comment = "Бронировал коттедж в Лос-Анджелесе на месяц через TO2RENT. Все соответствовало фотографиям на 100%, менеджер Макс решил все вопросы по заселению за час!",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                IsApproved = true
            }
        };

        context.Reviews.AddRange(reviews);

        // Seed sample bookings
        var sampleBookings = new List<Booking>
        {
            new Booking
            {
                PropertyId = properties[4].Id, // Коттедж Modern Лос Анджелес
                PropertyTitle = properties[4].Title,
                ClientName = "Алексей Смирнов",
                ClientPhone = "+7 (999) 123-45-67",
                ClientEmail = "alex.smirnov@example.com",
                CheckInDate = DateTime.UtcNow.AddDays(5),
                CheckOutDate = DateTime.UtcNow.AddDays(15),
                GuestsCount = 4,
                TotalPrice = 8200,
                Notes = "Нужен трансфер из аэропорта и детская кроватка",
                Status = "Confirmed",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Booking
            {
                PropertyId = properties[2].Id, // Апартаменты Москва
                PropertyTitle = properties[2].Title,
                ClientName = "Елена Кузнецова",
                ClientPhone = "+7 (916) 987-65-43",
                ClientEmail = "elena.k@example.com",
                CheckInDate = DateTime.UtcNow.AddDays(3),
                CheckOutDate = DateTime.UtcNow.AddDays(8),
                GuestsCount = 2,
                TotalPrice = 1500,
                Notes = "Поздний заезд после 21:00",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow.AddHours(-10)
            }
        };

        context.Bookings.AddRange(sampleBookings);

        // Seed sample inquiries
        var sampleInquiries = new List<Inquiry>
        {
            new Inquiry
            {
                Name = "Виктор Новиков",
                ContactInfo = "+7 (903) 555-11-22",
                Message = "Здравствуйте! Интересует аренда коттеджа в Лондоне на летний сезон. Возможна ли скидка при аренде от 3 месяцев?",
                TargetManager = "Макс",
                Status = "New",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Inquiry
            {
                Name = "Ольга Васильева",
                ContactInfo = "olga.v@example.com",
                Message = "Подскажите, можно ли с домашними питомцами (собака мелкой породы) в апартаменты в Минске?",
                TargetManager = "Анна",
                Status = "Processed",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        context.Inquiries.AddRange(sampleInquiries);
        context.SaveChanges();
    }
}
