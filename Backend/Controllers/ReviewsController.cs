using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Review>>> GetReviews([FromQuery] bool onlyApproved = true, [FromQuery] int? propertyId = null)
    {
        var result = await _reviewService.GetReviewsAsync(onlyApproved, propertyId);
        return Ok(result);
    }

    [HttpGet("property/{propertyId}")]
    public async Task<ActionResult<IEnumerable<Review>>> GetPropertyReviews(int propertyId)
    {
        var result = await _reviewService.GetPropertyReviewsAsync(propertyId);
        return Ok(result);
    }

    [HttpGet("property/{propertyId}/summary")]
    public async Task<ActionResult<PropertyRatingSummaryDto>> GetPropertyRatingSummary(int propertyId)
    {
        var result = await _reviewService.GetPropertyRatingSummaryAsync(propertyId);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Review>> CreateReview([FromBody] CreateReviewDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Author)) return BadRequest(new { message = "Укажите имя" });
        if (string.IsNullOrWhiteSpace(dto.Comment)) return BadRequest(new { message = "Напишите текст отзыва" });
        if (dto.Rating < 1 || dto.Rating > 5) return BadRequest(new { message = "Оценка должна быть от 1 до 5" });

        var created = await _reviewService.CreateReviewAsync(dto);
        return CreatedAtAction(nameof(GetReviews), new { id = created.Id }, created);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<Review>> UpdateStatus(int id, [FromBody] UpdateReviewStatusDto dto)
    {
        var updated = await _reviewService.ToggleApprovalAsync(id, dto.IsApproved);
        if (updated == null) return NotFound(new { message = $"Отзыв #{id} не найден" });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var success = await _reviewService.DeleteReviewAsync(id);
        if (!success) return NotFound(new { message = $"Отзыв #{id} не найден" });
        return Ok(new { message = "Отзыв успешно удален" });
    }
}
