using TicTacToe.Api.Models;
using TicTacToe.Api.Services;
using Xunit;

namespace TicTacToe.Tests;

public class GameEngineTests
{
    private readonly GameEngine _engine = new();

    [Fact]
    public void MakeMove_ValidMove_UpdatesBoardAndSwapsTurn()
    {
        var game = _engine.CreateGame(GameMode.TwoPlayer);
        var response = _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0));

        Assert.Equal("X", response.Board[0][0]);
        Assert.Equal("O", response.CurrentPlayer);
        Assert.Single(response.MoveHistory);
    }

    [Fact]
    public void MakeMove_OccupiedCell_ThrowsException()
    {
        var game = _engine.CreateGame(GameMode.TwoPlayer);
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0));

        Assert.Throws<InvalidOperationException>(() =>
            _engine.MakeMove(game.GameId, new MakeMoveRequest('O', 0, 0)));
    }

    [Fact]
    public void CheckWin_RowCompletion_SetsWonStatusAndScoreboard()
    {
        var game = _engine.CreateGame(GameMode.TwoPlayer);
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('O', 1, 0));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 1));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('O', 1, 1));
        var finalState = _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 2));

        Assert.Equal("Won", finalState.Status);
        Assert.Equal("X", finalState.Winner);
        Assert.Equal(3, finalState.WinningCells.Count);
        Assert.Equal(1, finalState.Scoreboard.XWins);
    }

    [Fact]
    public void ComputerMode_PriorityBlock_PreventsHumanWin()
    {
        var game = _engine.CreateGame(GameMode.Computer);
        
        // X plays (0,0) -> Computer takes center (1,1) per Priority 3
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0));
        
        // X plays (0,1) setting up row win at (0,2)
        var state = _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 1));

        // Computer must block at (0,2) per Priority 2
        Assert.Equal("O", state.Board[0][2]);
    }

    [Fact]
    public void Undo_ComputerMode_RollsBackTwoMoves()
    {
        var game = _engine.CreateGame(GameMode.Computer);
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0)); // Computer responds with O
        
        var undoneState = _engine.UndoMove(game.GameId);

        Assert.Empty(undoneState.MoveHistory);
        Assert.Equal("X", undoneState.CurrentPlayer);
        Assert.Equal("", undoneState.Board[0][0]);
    }

    [Fact]
    public void Undo_TerminalState_ThrowsExceptionUnderOptionA()
    {
        var game = _engine.CreateGame(GameMode.TwoPlayer);
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 0));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('O', 1, 0));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 1));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('O', 1, 1));
        _engine.MakeMove(game.GameId, new MakeMoveRequest('X', 0, 2)); // X Wins

        Assert.Throws<InvalidOperationException>(() => _engine.UndoMove(game.GameId));
    }
}