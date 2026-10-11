using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PropertiesController : ControllerBase
{
    private readonly IPropertyService _propertyService;
    private readonly IBookingService _bookingService;

    public PropertiesController(IPropertyService propertyService, IBookingService bookingService)
    {
        _propertyService = propertyService;
        _bookingService = bookingService;
    }

    [HttpGet("{id}/booked-dates")]
    public async Task<ActionResult<List<BookedDateRangeDto>>> GetBookedDates(int id)
    {
        var dates = await _bookingService.GetBookedDatesForPropertyAsync(id);
        return Ok(dates);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Property>>> GetProperties([FromQuery] PropertyFilterDto filter)
    {
        var result = await _propertyService.GetPropertiesAsync(filter);
        return Ok(result);
    }

    [HttpGet("popular")]
    public async Task<ActionResult<IEnumerable<Property>>> GetPopular()
    {
        var result = await _propertyService.GetPopularPropertiesAsync();
        return Ok(result);
    }

    [HttpGet("featured")]
    public async Task<ActionResult<Property>> GetFeatured()
    {
        var result = await _propertyService.GetFeaturedPropertyAsync();
        if (result == null) return NotFound(new { message = "Объект не найден" });
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Property>> GetProperty(int id)
    {
        var result = await _propertyService.GetPropertyByIdAsync(id);
        if (result == null) return NotFound(new { message = $"Объект #{id} не найден" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Property>> CreateProperty([FromBody] CreatePropertyDto dto)
    {
        var created = await _propertyService.CreatePropertyAsync(dto);
        return CreatedAtAction(nameof(GetProperty), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Property>> UpdateProperty(int id, [FromBody] CreatePropertyDto dto)
    {
        var updated = await _propertyService.UpdatePropertyAsync(id, dto);
        if (updated == null) return NotFound(new { message = $"Объект #{id} не найден" });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProperty(int id)
    {
        var success = await _propertyService.DeletePropertyAsync(id);
        if (!success) return NotFound(new { message = $"Объект #{id} не найден" });
        return Ok(new { message = $"Объект #{id} успешно удален" });
    }
}
