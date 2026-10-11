using System.Net.Sockets;
using System.Text;
using Backend.Application.Interfaces;
using Backend.Application.Services;
using Backend.Data;
using Backend.Infrastructure.Caching;
using Backend.Infrastructure.Messaging;
using Backend.Infrastructure.Repositories;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// 1. Resilient Database Configuration (PostgreSQL with SQLite fallback)
// ============================================================================
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "PostgreSQL";
var pgConn = builder.Configuration.GetConnectionString("PostgreSql");
var sqliteDbPath = Path.Combine(builder.Environment.ContentRootPath, "to2rent.db");
var sqliteConn = $"Data Source={sqliteDbPath}";

bool usePostgres = false;
if (dbProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(pgConn))
{
    try
    {
        // Test PostgreSQL connection availability
        var builderPg = new Npgsql.NpgsqlConnectionStringBuilder(pgConn);
        var host = builderPg.Host ?? "localhost";
        using var tcp = new TcpClient();
        var connectTask = tcp.ConnectAsync(host, builderPg.Port);
        if (Task.WhenAny(connectTask, Task.Delay(1000)).GetAwaiter().GetResult() == connectTask && tcp.Connected)
        {
            using var conn = new Npgsql.NpgsqlConnection(pgConn);
            conn.Open();
            usePostgres = true;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Database] PostgreSQL недоступен ({ex.Message}). Переключение на локальную SQLite базу данных.");
        usePostgres = false;
    }
}

if (usePostgres)
{
    Console.WriteLine("[Database] Подключена база данных PostgreSQL.");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(pgConn));
}
else
{
    Console.WriteLine("[Database] Подключена локальная база данных SQLite.");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(sqliteConn));
}

// ============================================================================
// 2. SOLID Dependency Injection Registrations
// ============================================================================
// Repositories (Interface Segregation & Single Responsibility)
builder.Services.AddScoped<IPropertyRepository, PropertyRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IInquiryRepository, InquiryRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IFavoriteRepository, FavoriteRepository>();

// Services (Business Logic & Dependency Inversion)
builder.Services.AddScoped<IPropertyService, PropertyService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IInquiryService, InquiryService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFavoriteService, FavoriteService>();

// Redis Distributed Caching (L2 Cache) with In-Memory fallback
var redisHost = builder.Configuration["Redis:Configuration"] ?? "localhost:6379";
var redisEnabled = builder.Configuration.GetValue<bool>("Redis:Enabled", true);
var isRedisReachable = redisEnabled && KafkaConnectivity.IsBrokerAvailable(redisHost, 800);

if (isRedisReachable)
{
    Console.WriteLine($"[Redis] Подключен распределенный кэш Redis ({redisHost}).");
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisHost;
        options.InstanceName = "to2rent:";
    });
}
else
{
    Console.WriteLine("[Cache] Redis не обнаружен. Используется встроенный In-Memory распределенный кэш.");
    builder.Services.AddDistributedMemoryCache();
}
builder.Services.AddSingleton<ICacheService, DistributedCacheService>();

// Kafka Event Messaging & Notification Stream (Open/Closed Principle)
builder.Services.Configure<KafkaSettings>(builder.Configuration.GetSection("Kafka"));
builder.Services.AddSingleton<INotificationLogService, NotificationLogService>();
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddHostedService<KafkaBookingAuditConsumer>();

// System Health Checks
builder.Services.AddHealthChecks();

// JWT Authentication & Authorization
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtTokenGenerator.SecretKey)),
        ValidateIssuer = true,
        ValidIssuer = JwtTokenGenerator.Issuer,
        ValidateAudience = true,
        ValidAudience = JwtTokenGenerator.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Controllers & JSON Settings
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// OpenAPI & Scalar Documentation
builder.Services.AddOpenApi();

var app = builder.Build();

// Enable OpenAPI & Scalar UI
app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options.WithTitle("TO2RENT Microservice API")
           .WithTheme(ScalarTheme.Moon);
});

// Enable CORS
app.UseCors("AllowAll");

// Serve Frontend (TO2RENT directory)
var candidatePaths = new[]
{
    Path.Combine(app.Environment.ContentRootPath, "TO2RENT"),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "TO2RENT")),
    Path.Combine(AppContext.BaseDirectory, "TO2RENT"),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "TO2RENT")),
    Path.Combine(Directory.GetCurrentDirectory(), "TO2RENT"),
    Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "TO2RENT")),
    "/app/TO2RENT",
    "/TO2RENT"
};

var frontendPath = candidatePaths.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p) && Directory.Exists(p));

if (!string.IsNullOrEmpty(frontendPath))
{
    var fileProvider = new PhysicalFileProvider(frontendPath);

    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider,
        DefaultFileNames = new List<string> { "index.html" }
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider,
        RequestPath = ""
    });
}

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

if (!string.IsNullOrEmpty(frontendPath))
{
    app.MapGet("/", async context =>
    {
        var indexPath = Path.Combine(frontendPath, "index.html");
        if (File.Exists(indexPath))
        {
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(indexPath);
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
        }
    });
}

// Database Initialization & Seed Data
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        DbInitializer.Initialize(dbContext);
        logger.LogInformation("База данных ({Provider}) успешно инициализирована.", dbContext.Database.ProviderName);
    }
    catch (Exception ex)
    {
        logger.LogWarning("Ошибка инициализации базы данных: {Msg}", ex.Message);
    }
}

app.Run();
