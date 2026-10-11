using System.Net.Sockets;
using Backend.Application.Interfaces;
using Backend.Application.Services;
using Backend.Data;
using Backend.Infrastructure.Messaging;
using Backend.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

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

// Services (Business Logic & Dependency Inversion)
builder.Services.AddScoped<IPropertyService, PropertyService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IInquiryService, InquiryService>();
builder.Services.AddScoped<IStatsService, StatsService>();

// Kafka Event Messaging (Open/Closed Principle)
builder.Services.Configure<KafkaSettings>(builder.Configuration.GetSection("Kafka"));
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddHostedService<KafkaBookingAuditConsumer>();

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
var frontendPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "TO2RENT"));
if (Directory.Exists(frontendPath))
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

app.UseAuthorization();

app.MapControllers();

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
