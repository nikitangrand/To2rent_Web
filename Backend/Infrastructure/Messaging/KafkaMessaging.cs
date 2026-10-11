using System.Text.Json;
using Backend.Application.Interfaces;
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

public class KafkaEventPublisher : IEventPublisher
{
    private readonly KafkaSettings _settings;
    private readonly ILogger<KafkaEventPublisher> _logger;
    private readonly Lazy<IProducer<string, string>?> _producer;

    public KafkaEventPublisher(IOptions<KafkaSettings> settings, ILogger<KafkaEventPublisher> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        _producer = new Lazy<IProducer<string, string>?>(CreateProducer);
    }

    private IProducer<string, string>? CreateProducer()
    {
        if (!_settings.Enabled) return null;

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
            _logger.LogWarning("Не удалось инициализировать Kafka Producer ({Servers}): {Msg}", _settings.BootstrapServers, ex.Message);
            return null;
        }
    }

    public async Task PublishAsync<T>(string topic, string key, T message) where T : class
    {
        var json = JsonSerializer.Serialize(message);
        _logger.LogInformation("[Kafka Event] Публикация в тему '{Topic}' (Key={Key}): {Payload}", topic, key, json);

        var producer = _producer.Value;
        if (producer == null)
        {
            _logger.LogDebug("[Kafka Offline] Сообщение обработано локально в памяти.");
            return;
        }

        try
        {
            var result = await producer.ProduceAsync(topic, new Message<string, string>
            {
                Key = key,
                Value = json
            });
            _logger.LogInformation("[Kafka] Успешно доставлено в '{Topic}' (Partition={Part}, Offset={Off})",
                topic, result.Partition.Value, result.Offset.Value);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Kafka брокер временно недоступен ({Servers}). Событие залогировано локально: {Error}",
                _settings.BootstrapServers, ex.Message);
        }
    }
}

// Background Consumer for asynchronous audit processing from Kafka
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

        // Allow microservice to finish startup before consumer loop
        await Task.Delay(2000, stoppingToken);

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
                        _logger.LogInformation("[Kafka Consumer] Получено событие из '{Topic}' (Key={Key}): {Msg}",
                            consumeResult.Topic, consumeResult.Message.Key, consumeResult.Message.Value);
                    }
                }
                catch (ConsumeException ce)
                {
                    // Kafka broker might be offline in local dev mode
                    _logger.LogDebug("[Kafka Consumer] Ожидание брокера: {Err}", ce.Error.Reason);
                    await Task.Delay(5000, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("[Kafka Consumer] Пауза: {Err}", ex.Message);
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogInformation("[Kafka Consumer] Фоновый обработчик пропущен (брокер не запущен): {Err}", ex.Message);
        }
    }
}
