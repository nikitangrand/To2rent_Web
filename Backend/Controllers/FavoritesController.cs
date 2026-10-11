using Backend.Application.Interfaces;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    private readonly IFavoriteService _favoriteService;

    public FavoritesController(IFavoriteService favoriteService)
    {
        _favoriteService = favoriteService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Property>>> GetFavorites(int userId)
    {
        var result = await _favoriteService.GetFavoritesAsync(userId);
        return Ok(result);
    }

    [HttpGet("user/{userId}/ids")]
    public async Task<ActionResult<List<int>>> GetFavoriteIds(int userId)
    {
        var result = await _favoriteService.GetFavoritePropertyIdsAsync(userId);
        return Ok(result);
    }

    [HttpPost("user/{userId}/{propertyId}")]
    public async Task<IActionResult> AddFavorite(int userId, int propertyId)
    {
        var success = await _favoriteService.AddFavoriteAsync(userId, propertyId);
        return Ok(new { success, message = "Объект добавлен в избранное" });
    }

    [HttpDelete("user/{userId}/{propertyId}")]
    public async Task<IActionResult> RemoveFavorite(int userId, int propertyId)
    {
        var success = await _favoriteService.RemoveFavoriteAsync(userId, propertyId);
        return Ok(new { success, message = "Объект удален из избранного" });
    }
}
