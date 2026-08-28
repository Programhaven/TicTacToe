using Microsoft.AspNetCore.Mvc;
using TicTacToe.Api.Models;
using TicTacToe.Api.Services;

namespace TicTacToe.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class GamesController : ControllerBase
{
    private readonly IGameEngine _engine;

    public GamesController(IGameEngine engine) => _engine = engine;

    /// <summary>
    /// Creates a new game session.
    /// </summary>
    /// <param name="req">Game creation payload specifying the game mode.</param>
    /// <returns>The initial game state response.</returns>
    /// <response code="200">Game session successfully created.</response>
    /// <response code="400">Invalid game creation request.</response>
    [HttpPost]
    [ProducesResponseType(typeof(GameStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<GameStateResponse> CreateGame([FromBody] CreateGameRequest req)
    {
        try
        {
            return Ok(_engine.CreateGame(req.Mode));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves the current state of a game session by its unique ID.
    /// </summary>
    /// <param name="id">The unique GUID of the game session.</param>
    /// <returns>The current game state response.</returns>
    /// <response code="200">Returns the requested game state.</response>
    /// <response code="404">Game session was not found.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(GameStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<GameStateResponse> GetGame(Guid id)
    {
        var game = _engine.GetGame(id);
        return game != null ? Ok(game) : NotFound(new { message = $"Game session '{id}' was not found." });
    }

    /// <summary>
    /// Submits a move for an active game session.
    /// </summary>
    /// <param name="id">The unique GUID of the game session.</param>
    /// <param name="req">Move request details containing player symbol and board coordinates.</param>
    /// <returns>The updated game state response.</returns>
    /// <response code="200">Move executed successfully; returns updated game state.</response>
    /// <response code="400">Invalid move, cell occupied, or turn out of order.</response>
    /// <response code="404">Game session was not found.</response>
    [HttpPost("{id:guid}/moves")]
    [ProducesResponseType(typeof(GameStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<GameStateResponse> MakeMove(Guid id, [FromBody] MakeMoveRequest req)
    {
        try
        {
            return Ok(_engine.MakeMove(id, req));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Undoes the last move (or move pair in Computer mode) for a game session.
    /// </summary>
    /// <param name="id">The unique GUID of the game session.</param>
    /// <returns>The restored game state response.</returns>
    /// <response code="200">Move undone successfully; returns restored game state.</response>
    /// <response code="400">No moves available to undo or invalid operation.</response>
    /// <response code="404">Game session was not found.</response>
    [HttpPost("{id:guid}/undo")]
    [ProducesResponseType(typeof(GameStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<GameStateResponse> Undo(Guid id)
    {
        try
        {
            return Ok(_engine.UndoMove(id));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Resets the game board for an existing game session.
    /// </summary>
    /// <param name="id">The unique GUID of the game session.</param>
    /// <returns>The reset game state response.</returns>
    /// <response code="200">Game session reset successfully.</response>
    /// <response code="404">Game session was not found.</response>
    [HttpPost("{id:guid}/reset")]
    [ProducesResponseType(typeof(GameStateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<GameStateResponse> Reset(Guid id)
    {
        try
        {
            return Ok(_engine.ResetGame(id));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}