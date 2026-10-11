using System.Net.Sockets;
using System.Text.Json;
using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Domain.Events;
using Confluent.Kafka;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Messaging;

public class KafkaSettings
{
    public string BootstrapServers { get; set; } = "localhost:9092";
    public string BookingTopic { get; set; } = "to2rent-bookings";
    public string InquiryTopic { get; set; } = "to2rent-inquiries";
    public string ConsumerGroupId { get; set; } = "to2rent-audit-group";
    public bool Enabled { get; set; } = true;
}

public static class KafkaConnectivity
{
    public static bool IsBrokerAvailable(string bootstrapServers, int timeoutMs = 1000)
    {
        try
        {
            var firstServer = bootstrapServers.Split(',')[0].Trim();
            var parts = firstServer.Split(':');
            var host = parts[0];
            var port = parts.Length > 1 && int.TryParse(parts[1], out var p) ? p : 9092;

            using var client = new TcpClient();
            var connectTask = client.ConnectAsync(host, port);
            if (Task.WhenAny(connectTask, Task.Delay(timeoutMs)).GetAwaiter().GetResult() == connectTask && client.Connected)
            {
                return true;
            }
            return false;
        }
        catch
        {
            return false;
        }
    }
}

public class KafkaEventPublisher : IEventPublisher
{
    private readonly KafkaSettings _settings;
    private readonly ILogger<KafkaEventPublisher> _logger;
    private readonly INotificationLogService _notificationLog;
    private readonly Lazy<IProducer<string, string>?> _producer;
    private readonly bool _isKafkaReachable;

    public KafkaEventPublisher(
        IOptions<KafkaSettings> settings, 
        ILogger<KafkaEventPublisher> logger,
        INotificationLogService notificationLog)
    {
        _settings = settings.Value;
        _logger = logger;
        _notificationLog = notificationLog;

        _isKafkaReachable = _settings.Enabled && KafkaConnectivity.IsBrokerAvailable(_settings.BootstrapServers, 800);
        _producer = new Lazy<IProducer<string, string>?>(CreateProducer);

        if (_isKafkaReachable)
        {
            _logger.LogInformation("[Kafka] Брокер Kafka ({Servers}) обнаружен и подключен.", _settings.BootstrapServers);
        }
        else
        {
            _logger.LogInformation("[Event Bus] Kafka брокер ({Servers}) не активен. События обрабатываются через локальную шину (In-Memory).", _settings.BootstrapServers);
        }
    }

    private IProducer<string, string>? CreateProducer()
    {
        if (!_isKafkaReachable) return null;

        try
        {
            var config = new ProducerConfig
            {
                BootstrapServers = _settings.BootstrapServers,
                Acks = Acks.Leader,
                MessageTimeoutMs = 3000,
                SocketTimeoutMs = 3000
            };
            return new ProducerBuilder<string, string>(config).Build();
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[Kafka] Инициализация Producer пропущена: {Msg}", ex.Message);
            return null;
        }
    }

    public async Task PublishAsync<T>(string topic, string key, T message) where T : class
    {
        var json = JsonSerializer.Serialize(message);
        _logger.LogInformation("[Событие] Тема '{Topic}' (Ключ={Key}): {Payload}", topic, key, json);

        // Register notification record in audit log
        if (message is BookingCreatedEvent bce)
        {
            _notificationLog.Add(new NotificationRecord
            {
                Topic = topic,
                EventType = "Новое бронирование",
                Recipient = $"{bce.ClientName} ({bce.ClientPhone})",
                Channel = "Telegram Bot (@To2RentBot) & Email",
                Message = $"Заявка #{bce.BookingId} на «{bce.PropertyTitle}». Даты: {bce.CheckInDate:dd.MM.yyyy} — {bce.CheckOutDate:dd.MM.yyyy}. Сумма: {bce.TotalPrice} $. Оповещение передано клиенту и в канал менеджеров.",
                Timestamp = DateTime.UtcNow
            });
        }
        else if (message is BookingStatusChangedEvent bsce)
        {
            _notificationLog.Add(new NotificationRecord
            {
                Topic = topic,
                EventType = "Смена статуса брони",
                Recipient = $"Клиент заявки #{bsce.BookingId}",
                Channel = "Email & Push",
                Message = $"Заявка #{bsce.BookingId}: статус изменен с «{bsce.OldStatus}» на «{bsce.NewStatus}». Отправлено push-уведомление клиенту.",
                Timestamp = DateTime.UtcNow
            });
        }
        else if (message is InquiryCreatedEvent ice)
        {
            _notificationLog.Add(new NotificationRecord
            {
                Topic = topic,
                EventType = "Запрос клиента",
                Recipient = $"Менеджер ({ice.TargetManager})",
                Channel = "Telegram Bot (@To2RentBot)",
                Message = $"От {ice.Name} ({ice.ContactInfo}): «{ice.Message}»",
                Timestamp = DateTime.UtcNow
            });
        }
        else
        {
            _notificationLog.Add(new NotificationRecord
            {
                Topic = topic,
                EventType = typeof(T).Name,
                Recipient = key,
                Channel = "Kafka Event Stream",
                Message = json,
                Timestamp = DateTime.UtcNow
            });
        }

        var producer = _producer.Value;
        if (producer == null) return;

        try
        {
            await producer.ProduceAsync(topic, new Message<string, string>
            {
                Key = key,
                Value = json
            });
        }
        catch (Exception ex)
        {
            _logger.LogDebug("[Kafka] Ошибка отправки в брокер: {Error}", ex.Message);
        }
    }
}

// Background Consumer for Kafka events
public class KafkaBookingAuditConsumer : BackgroundService
{
    private readonly KafkaSettings _settings;
    private readonly ILogger<KafkaBookingAuditConsumer> _logger;

    public KafkaBookingAuditConsumer(IOptions<KafkaSettings> settings, ILogger<KafkaBookingAuditConsumer> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.Enabled) return;

        // Check if broker is reachable before attempting Confluent client creation
        await Task.Delay(1000, stoppingToken);
        if (!KafkaConnectivity.IsBrokerAvailable(_settings.BootstrapServers, 1000))
        {
            // Do not start librdkafka consumer loop to prevent continuous error spam in console
            _logger.LogInformation("[Kafka Consumer] Фоновый подписчик в режиме ожидания (брокер {Servers} не запущен).", _settings.BootstrapServers);
            return;
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _settings.BootstrapServers,
            GroupId = _settings.ConsumerGroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = true,
            SessionTimeoutMs = 6000,
            SocketTimeoutMs = 4000
        };

        try
        {
            using var consumer = new ConsumerBuilder<string, string>(config).Build();
            consumer.Subscribe(new[] { _settings.BookingTopic, _settings.InquiryTopic });
            _logger.LogInformation("[Kafka Consumer] Подписка на топики '{BookTopic}', '{InqTopic}' оформлена.",
                _settings.BookingTopic, _settings.InquiryTopic);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(TimeSpan.FromSeconds(1));
                    if (consumeResult != null)
                    {
                        _logger.LogInformation("[Kafka Consumer] Получено событие из '{Topic}' (Ключ={Key})",
                            consumeResult.Topic, consumeResult.Message.Key);
                    }
                }
                catch (ConsumeException ce)
                {
                    _logger.LogDebug("[Kafka Consumer] Ошибка чтения: {Err}", ce.Error.Reason);
                    await Task.Delay(5000, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("[Kafka Consumer] Ошибка: {Err}", ex.Message);
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("[Kafka Consumer] Остановлен: {Err}", ex.Message);
        }
    }
}
