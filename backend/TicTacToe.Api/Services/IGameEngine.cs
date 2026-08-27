using System.Collections.Concurrent;
using TicTacToe.Api.Models;

namespace TicTacToe.Api.Services;

public interface IGameEngine
{
    GameStateResponse CreateGame(GameMode mode);
    GameStateResponse? GetGame(Guid gameId);
    GameStateResponse MakeMove(Guid gameId, MakeMoveRequest request);
    GameStateResponse UndoMove(Guid gameId);
    GameStateResponse ResetGame(Guid gameId);
    Scoreboard GetScoreboard();
    Scoreboard ResetScoreboard();
}

