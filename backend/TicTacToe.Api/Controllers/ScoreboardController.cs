using Microsoft.AspNetCore.Mvc;
using TicTacToe.Api.Models;
using TicTacToe.Api.Services;

namespace TicTacToe.Api.Controllers;
[ApiController]
[Route("api/[controller]")]
public class ScoreboardController : ControllerBase
{
    private readonly IGameEngine _engine;

    public ScoreboardController(IGameEngine engine) => _engine = engine;

    [HttpGet]
    public ActionResult<Scoreboard> GetScoreboard() => Ok(_engine.GetScoreboard());

    [HttpPost("reset")]
    public ActionResult<Scoreboard> ResetScoreboard() => Ok(_engine.ResetScoreboard());
}