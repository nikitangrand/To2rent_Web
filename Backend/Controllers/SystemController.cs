using System.Diagnostics;
using Backend.Application.Interfaces;
using Backend.Data;
using Backend.Domain.DTOs;
using Backend.Infrastructure.Messaging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationLogService _notificationLog;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly KafkaSettings _kafkaSettings;

    public SystemController(
        AppDbContext context,
        INotificationLogService notificationLog,
        IWebHostEnvironment env,
        IConfiguration config,
        IOptions<KafkaSettings> kafkaOptions)
    {
        _context = context;
        _notificationLog = notificationLog;
        _env = env;
        _config = config;
        _kafkaSettings = kafkaOptions.Value;
    }

    [HttpGet("status")]
    public async Task<ActionResult<SystemStatusDto>> GetSystemStatus()
    {
        var dbConnected = false;
        try
        {
            dbConnected = await _context.Database.CanConnectAsync();
        }
        catch { }

        var redisHost = _config["Redis:Configuration"] ?? "localhost:6379";
        var redisConnected = KafkaConnectivity.IsBrokerAvailable(redisHost, 500);

        var kafkaConnected = KafkaConnectivity.IsBrokerAvailable(_kafkaSettings.BootstrapServers, 500);

        var memoryMb = Process.GetCurrentProcess().WorkingSet64 / (1024 * 1024);

        return Ok(new SystemStatusDto
        {
            Status = dbConnected ? "Healthy" : "Degraded",
            DatabaseProvider = _context.Database.ProviderName ?? "Unknown",
            DatabaseConnected = dbConnected,
            RedisConnected = redisConnected,
            KafkaConnected = kafkaConnected,
            Environment = _env.EnvironmentName,
            ServerTime = DateTime.UtcNow.ToString("O"),
            ProcessMemoryMb = memoryMb
        });
    }

    [HttpGet("audit")]
    public ActionResult<IEnumerable<NotificationRecord>> GetAuditEvents([FromQuery] int count = 50)
    {
        var recent = _notificationLog.GetRecent(Math.Clamp(count, 1, 100));
        return Ok(recent);
    }
}
