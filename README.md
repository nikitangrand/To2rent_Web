# TO2RENT — Микросервисная платформа Аренды Недвижимости

Полнофункциональная платформа для поиска и аренды элитной недвижимости, спроектированная в соответствии с принципами **SOLID**, с бэкендом на **C# (ASP.NET Core 9.0)**, базой данных **PostgreSQL**, шиной событий **Apache Kafka** и контейнеризацией **Docker / Docker Compose**.

---

## 🏛 Архитектура и принципы SOLID

Микросервис разделен на изолированные слабосвязанные слои:

```
Backend/
├── Domain/                         # Чистые доменные модели и контракты
│   ├── Entities/                   # Сущности (Property, Booking, Review, Inquiry)
│   ├── DTOs/                       # Контракты данных (CreateBookingDto, PropertyFilterDto и др.)
│   └── Events/                     # Доменные события шины (BookingCreatedEvent, InquiryCreatedEvent)
├── Application/                    # Бизнес-логика и интерфейсы
│   ├── Interfaces/                 # IPropertyRepository, IBookingService, IEventPublisher...
│   └── Services/                   # BookingService, PropertyService, ReviewService, StatsService
├── Infrastructure/                 # Реализации для работы с БД и брокерами сообщений
│   ├── Repositories/               # EF Core реализации репозиториев
│   ├── Messaging/                  # Confluent Kafka Producer & Background Audit Consumer
│   └── Data/                       # AppDbContext (Npgsql PostgreSQL + SQLite) & DbInitializer
└── Controllers/                    # Тонкие REST API контроллеры
```

### Реализация принципов SOLID:
1. **S (Single Responsibility Principle):**
   - Репозитории отвечают только за персистентность данных.
   - Сервисы отвечают за бизнес-логику (расчет ночей, валидация, публикация событий).
   - `KafkaEventPublisher` отвечает за сериализацию и отправку в брокер.
   - `KafkaBookingAuditConsumer` — фоновый сервис (`BackgroundService`) обработки очередей.
   - Контроллеры только обрабатывают HTTP запросы/ответы.
2. **O (Open/Closed Principle):**
   - Добавление новых каналов уведомлений (Email, SMS, Telegram) реализуется добавлением новых потребителей Kafka без изменения сервиса бронирования.
3. **L (Liskov Substitution Principle):**
   - Любая реализация `IEventPublisher` взаимозаменяема без изменения вызывающего кода.
4. **I (Interface Segregation Principle):**
   - Тонкие сфокусированные интерфейсы: `IBookingRepository`, `IPropertyRepository`, `IReviewService`, `IInquiryService`.
5. **D (Dependency Inversion Principle):**
   - Контроллеры и сервисы зависят строго от интерфейсов-абстракций, внедряемых через .NET 9 DI-контейнер (`builder.Services.AddScoped<IBookingService, BookingService>()`).

---

## 🐳 Запуск через Docker Compose (PostgreSQL + Kafka + Микросервис)

В проект включен полный стек контейнеров:
- **PostgreSQL 16 Alpine** (порт `5432`)
- **Apache Kafka (KRaft mode)** (порт `9092`)
- **TO2RENT Microservice** (.NET 9 + Frontend) (порт `5000`)

### Запуск:
```bash
docker compose up -d
```

### Проверка статуса:
```bash
docker compose ps
```

После старта перейдите по адресу:
- 🌐 **Сайт:** [http://localhost:5000](http://localhost:5000)
- 📊 **Панель управления (Админка):** [http://localhost:5000/Html-Pages/admin.html](http://localhost:5000/Html-Pages/admin.html)
- 📑 **Интерактивная документация API (Scalar):** [http://localhost:5000/scalar/v1](http://localhost:5000/scalar/v1)

Остановка:
```bash
docker compose down
```

---

## 💻 Локальный запуск без Docker

Если Docker Desktop временно выключен, проект поддерживает запуск локально с гибкой конфигурацией:

1. **Запуск через .NET CLI:**
   ```bash
   cd Backend
   dotnet run
   ```
2. **В один клик (Windows):**
   Дважды кликните по файлу [run.bat](file:///c:/Users/Admin/Desktop/Project/run.bat).

> 💡 **Гибкая БД:** В `Backend/appsettings.json` настроена строка подключения к PostgreSQL (`to2rent_db`), а также доступен автоматический fallback на SQLite при автономной разработке.

---

## 📡 Событийно-ориентированная архитектура (Apache Kafka)

При выполнении операций микросервис асинхронно генерирует доменные события:
- `BookingCreatedEvent` → топик `to2rent-bookings`
- `BookingStatusChangedEvent` → топик `to2rent-bookings`
- `InquiryCreatedEvent` → топик `to2rent-inquiries`

Фоновый `KafkaBookingAuditConsumer` слушает топики и обрабатывает события аудита в реальном времени.

---

## 🐙 Публикация в Git / GitHub

Локальный Git-репозиторий уже инициализирован, и сделан первый коммит в ветку `main`.

Чтобы отправить проект в ваш репозиторий на GitHub:
1. Создайте новый пустой репозиторий на [GitHub](https://github.com/new) (например, `to2rent-real-estate`).
2. Выполните команды в терминале:
   ```bash
   git remote add origin https://github.com/NikitanGrand/ВАШ_РЕПОЗИТОРИЙ.git
   git push -u origin main
   ```
   *(или с использованием SSH: `git remote add origin git@github.com:NikitanGrand/ВАШ_РЕПОЗИТОРИЙ.git`)*
