using Microsoft.AspNetCore.Mvc;
using TicTacToe.Api.Models;
using TicTacToe.Api.Services;

namespace TicTacToe.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ScoreboardController : ControllerBase
{
    private readonly IGameEngine _engine;

    public ScoreboardController(IGameEngine engine) => _engine = engine;

    /// <summary>
    /// Retrieves cumulative match statistics (X wins, O wins, and draws).
    /// </summary>
    /// <returns>The current scoreboard statistics.</returns>
    /// <response code="200">Returns current scoreboard counts.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Scoreboard), StatusCodes.Status200OK)]
    public ActionResult<Scoreboard> GetScoreboard() => Ok(_engine.GetScoreboard());

    /// <summary>
    /// Resets all cumulative match statistics (X wins, O wins, draws) back to zero.
    /// </summary>
    /// <returns>The reset scoreboard object.</returns>
    /// <response code="200">Scoreboard cleared successfully.</response>
    [HttpPost("reset")]
    [ProducesResponseType(typeof(Scoreboard), StatusCodes.Status200OK)]
    public ActionResult<Scoreboard> ResetScoreboard() => Ok(_engine.ResetScoreboard());
}