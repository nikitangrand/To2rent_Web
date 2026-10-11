using Backend.Application.Interfaces;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;

    public StatsController(IStatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet]
    public async Task<ActionResult<StatsDto>> GetStats()
    {
        var result = await _statsService.GetStatsAsync();
        return Ok(result);
    }
}
