using Backend.Application.Interfaces;
using Backend.Domain.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InquiriesController : ControllerBase
{
    private readonly IInquiryService _inquiryService;

    public InquiriesController(IInquiryService inquiryService)
    {
        _inquiryService = inquiryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Inquiry>>> GetInquiries([FromQuery] string? status)
    {
        var result = await _inquiryService.GetInquiriesAsync(status);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Inquiry>> CreateInquiry([FromBody] CreateInquiryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message)) return BadRequest(new { message = "Текст сообщения обязателен" });

        var created = await _inquiryService.CreateInquiryAsync(dto);
        return CreatedAtAction(nameof(GetInquiries), new { id = created.Id }, created);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<Inquiry>> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var updated = await _inquiryService.UpdateInquiryStatusAsync(id, dto.Status);
        if (updated == null) return NotFound(new { message = $"Запрос #{id} не найден" });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInquiry(int id)
    {
        var success = await _inquiryService.DeleteInquiryAsync(id);
        if (!success) return NotFound(new { message = $"Запрос #{id} не найден" });
        return Ok(new { message = $"Запрос #{id} успешно удален" });
    }
}
