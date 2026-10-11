# TO2RENT

Веб-платформа для аренды недвижимости.

## Стек технологий

- **Бэкенд:** C# / ASP.NET Core 9.0, Entity Framework Core 9.0
- **База данных:** PostgreSQL 16 (основная) / SQLite (локальный fallback)
- **Кэширование:** Redis 7 (L2 cache) / In-Memory (fallback)
- **Брокер сообщений:** Apache Kafka (KRaft mode) / In-Memory (fallback)
- **Аутентификация:** JWT Bearer, PBKDF2 (HMAC-SHA256, 100 000 итераций)
- **Фронтенд:** Vanilla JS, CSS3, HTML5
- **Контейнеризация:** Docker, Docker Compose

---

## Быстрый старт

### 1. Запуск через Docker Compose

Запуск всего стека (API, PostgreSQL, Redis, Kafka):
```bash
docker compose up -d
```

Остановка:
```bash
docker compose down
```

### 2. Локальный запуск без Docker

При отсутствии Docker приложение автоматически использует SQLite и In-Memory кэш/брокер:
```bash
cd Backend
dotnet run
```
или через скрипт `run.bat`.

### 3. Точки входа

- Веб-сайт: http://localhost:5000
- Панель управления: http://localhost:5000/Html-Pages/admin.html
- Документация API (Scalar / OpenAPI): http://localhost:5000/scalar/v1
- Проверка работоспособности: http://localhost:5000/health

---

## Тестовые учетные записи

Создаются автоматически при инициализации базы данных:

| Роль | Логин | Email | Пароль | Доступ |
| :--- | :--- | :--- | :--- | :--- |
| `Admin` | `admin` | `admin@to2rent.com` | `admin123` | Полный доступ: админ-панель, каталог, бронирования, отзывы, пользователи, телеметрия |
| `Client` | `client` | `client@to2rent.com` | `client123` | Личный кабинет, онлайн-бронирование, избранное, отзывы |

Новые пользователи регистрируются через форму на сайте с ролью `Client` или `Admin`.

---

## Архитектура проекта

Кодовая база разделена по слоям:

```
Backend/
├── Domain/              # Сущности (Property, Booking, Review, Inquiry, User), DTO, события
├── Application/         # Интерфейсы репозиториев/сервисов и бизнес-логика
├── Infrastructure/      # EF Core, PostgreSQL/SQLite, Redis кэш, Kafka брокер, JWT/PBKDF2
└── Controllers/         # REST API контроллеры
```

Соблюдение SOLID:
- **SRP:** Репозитории работают только с БД; сервисы содержат валидацию и бизнес-логику; контроллеры только маршрутизируют запросы.
- **OCP:** Новые потребители событий добавляются без модификации сервисов бронирования.
- **LSP / DIP:** Контроллеры и сервисы зависят от интерфейсов (`IBookingRepository`, `ICacheService`, `IEventPublisher`), регистрируемых в DI.

---

## REST API

### Недвижимость
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/properties` | Список объектов (фильтры: city, type, price, rooms, search, sort) | Публичный |
| `GET` | `/api/properties/{id}` | Данные объекта по ID | Публичный |
| `GET` | `/api/properties/{id}/booked-dates` | Список занятых диапазонов дат | Публичный |
| `POST` | `/api/properties` | Создание объекта | Admin |
| `PUT` | `/api/properties/{id}` | Редактирование объекта | Admin |
| `DELETE` | `/api/properties/{id}` | Удаление объекта | Admin |

### Бронирования
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | Все бронирования | Admin |
| `GET` | `/api/bookings/{id}` | Бронирование по ID | Авторизованный / Admin |
| `GET` | `/api/bookings/user/{userId}` | Бронирования пользователя | Авторизованный / Admin |
| `POST` | `/api/bookings` | Оформление брони (проверка овербукинга, событие в Kafka) | Публичный / Client |
| `PATCH` | `/api/bookings/{id}/status` | Смена статуса (Pending, Confirmed, Cancelled, Completed) | Admin |
| `POST` | `/api/bookings/{id}/cancel` | Отмена брони клиентом | Client / Admin |
| `DELETE` | `/api/bookings/{id}` | Удаление записи бронирования | Admin |

### Отзывы и рейтинги
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reviews` | Список отзывов (фильтры: onlyApproved, propertyId) | Публичный |
| `GET` | `/api/properties/{id}/reviews` | Отзывы к конкретному объекту | Публичный |
| `GET` | `/api/properties/{id}/rating` | Средняя оценка и количество отзывов | Публичный |
| `POST` | `/api/reviews` | Создание отзыва | Публичный / Client |
| `PATCH` | `/api/reviews/{id}/status` | Модерация отзыва (isApproved: true/false) | Admin |
| `DELETE` | `/api/reviews/{id}` | Удаление отзыва | Admin |

### Избранное
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/favorites/user/{userId}` | Список избранных объектов пользователя | Авторизованный |
| `GET` | `/api/favorites/user/{userId}/ids` | Массив ID избранных объектов | Авторизованный |
| `POST` | `/api/favorites/user/{userId}/{propertyId}` | Добавить в избранное | Авторизованный |
| `DELETE` | `/api/favorites/user/{userId}/{propertyId}` | Удалить из избранного | Авторизованный |

### Запросы и контакты
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/inquiries` | Запросы клиентов | Admin |
| `POST` | `/api/inquiries` | Отправка вопроса (событие в Kafka) | Публичный |
| `PATCH` | `/api/inquiries/{id}/status` | Смена статуса заявки | Admin |
| `DELETE` | `/api/inquiries/{id}` | Удаление заявки | Admin |

### Аутентификация и пользователи
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Регистрация | Публичный |
| `POST` | `/api/auth/login` | Вход и выдача JWT | Публичный |
| `GET` | `/api/auth/me` | Данные текущего пользователя | Авторизованный |
| `PUT` | `/api/auth/profile` | Обновление профиля и пароля | Авторизованный |
| `GET` | `/api/auth/users` | Список всех пользователей | Admin |
| `PATCH` | `/api/auth/users/{id}/role` | Назначение роли (Admin / Client) | Admin |

### Мониторинг и аналитика
| Метод | Маршрут | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stats` | KPI показатели (объекты, брони, выручка, отзывы) | Admin |
| `GET` | `/api/system/status` | Статус БД, Redis, Kafka, потребление RAM, аптайм | Admin |
| `GET` | `/api/system/audit` | Журнал последних 50/100 событий нотификаций | Admin |
| `GET` | `/health` | Health check эндпоинт | Публичный |

---

## Реализованные механизмы

### Защита от овербукинга
- **Условие пересечения дат:** `CheckIn < BookedCheckOut && CheckOut > BookedCheckIn` для бронирований со статусами `Pending` и `Confirmed`.
- **Клиент:** интерфейс запрашивает `/api/properties/{id}/booked-dates`, блокирует выбор занятых дат и отправку формы.
- **Сервер:** при обнаружении конфликта возвращает `409 Conflict`.

### Apache Kafka
- **Топики:**
  - `to2rent-bookings` — создание брони, изменение статуса, отмена.
  - `to2rent-inquiries` — создание заявки на консультацию.
- **Компоненты:**
  - `KafkaEventPublisher` — сериализация событий в JSON и отправка в брокер.
  - `KafkaBookingAuditConsumer` — фоновый сервис (`BackgroundService`) для чтения топиков.
  - `NotificationLogService` — кольцевой буфер (in-memory, 100 записей) для аудита событий в админке по каналам Telegram Bot, Email Gateway, Kafka Bus.
- **Отказоустойчивость:** при недоступности брокера порт 9092 проверяется через TCP; при сбое приложение переключается на In-Memory шину без прерывания работы.

### Кэширование Redis (L2 Cache)
- **Сервис:** `DistributedCacheService` поверх `IDistributedCache`.
- **Ключи и TTL:**
  - `properties:all`, `properties:filtered:*` — 5 минут.
  - `properties:single:{id}` — 10 минут.
  - `rating:summary:{id}` — 10 минут.
  - `stats:summary` — 60 секунд.
- **Инвалидация:** точечный сброс по префиксам ключей при операциях записи (CUD).
- **Отказоустойчивость:** при отсутствии Redis автоматически активируется `AddDistributedMemoryCache`.

### Экспорт данных в CSV
- В админ-панели реализована выгрузка бронирований и каталога.
- Файлы формируются с префиксом `\uFEFF` (UTF-8 BOM), что предотвращает искажение кириллицы при открытии в Microsoft Excel.
