using System.Collections.Concurrent;
using Backend.Application.Interfaces;
using Backend.Domain.DTOs;

namespace Backend.Infrastructure.Messaging;

public class NotificationLogService : INotificationLogService
{
    private readonly ConcurrentQueue<NotificationRecord> _queue = new();
    private const int MaxItems = 100;

    public void Add(NotificationRecord record)
    {
        _queue.Enqueue(record);
        while (_queue.Count > MaxItems && _queue.TryDequeue(out _)) { }
    }

    public IEnumerable<NotificationRecord> GetRecent(int count = 50)
    {
        return _queue.Reverse().Take(count).ToList();
    }
}
