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
    public async Task<ActionResult<IEnumerable<Review>>> GetReviews([FromQuery] bool onlyApproved = true)
    {
        var result = await _reviewService.GetReviewsAsync(onlyApproved);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Review>> CreateReview([FromBody] CreateReviewDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Author)) return BadRequest(new { message = "Укажите имя" });
        if (string.IsNullOrWhiteSpace(dto.Comment)) return BadRequest(new { message = "Напишите текст отзыва" });

        var created = await _reviewService.CreateReviewAsync(dto);
        return CreatedAtAction(nameof(GetReviews), new { id = created.Id }, created);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var success = await _reviewService.DeleteReviewAsync(id);
        if (!success) return NotFound(new { message = $"Отзыв #{id} не найден" });
        return Ok(new { message = "Отзыв успешно удален" });
    }
}
