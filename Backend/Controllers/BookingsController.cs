using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetBookings([FromQuery] string? status)
    {
        var result = await _bookingService.GetBookingsAsync(status);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Booking>> GetBooking(int id)
    {
        var result = await _bookingService.GetBookingByIdAsync(id);
        if (result == null) return NotFound(new { message = $"Бронь #{id} не найдена" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Booking>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ClientName))
        {
            return BadRequest(new { message = "Имя клиента обязательно" });
        }
        if (string.IsNullOrWhiteSpace(dto.ClientPhone))
        {
            return BadRequest(new { message = "Номер телефона обязателен" });
        }

        try
        {
            var created = await _bookingService.CreateBookingAsync(dto);
            return CreatedAtAction(nameof(GetBooking), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("property/{propertyId}/booked-dates")]
    public async Task<ActionResult<List<BookedDateRangeDto>>> GetBookedDates(int propertyId)
    {
        var dates = await _bookingService.GetBookedDatesForPropertyAsync(propertyId);
        return Ok(dates);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<Booking>> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var updated = await _bookingService.UpdateBookingStatusAsync(id, dto.Status);
        if (updated == null) return NotFound(new { message = $"Бронь #{id} не найдена" });
        return Ok(updated);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Booking>>> GetUserBookings(int userId, [FromQuery] string? email, [FromQuery] string? phone)
    {
        var result = await _bookingService.GetUserBookingsAsync(userId, email, phone);
        return Ok(result);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<Booking>> CancelBooking(int id, [FromQuery] int? userId)
    {
        try
        {
            var updated = await _bookingService.CancelBookingAsync(id, userId);
            if (updated == null) return NotFound(new { message = $"Бронь #{id} не найдена" });
            return Ok(updated);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(int id)
    {
        var success = await _bookingService.DeleteBookingAsync(id);
        if (!success) return NotFound(new { message = $"Бронь #{id} не найдена" });
        return Ok(new { message = $"Бронь #{id} успешно удалена" });
    }
}
