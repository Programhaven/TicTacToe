using System.Collections.Concurrent;
using TicTacToe.Api.Models;

namespace TicTacToe.Api.Services;

public class GameEngine : IGameEngine
{
    private readonly ConcurrentDictionary<Guid, GameSession> _sessions = new();
    private readonly Scoreboard _scoreboard = new();
    private readonly object _scoreLock = new();

    public GameStateResponse CreateGame(GameMode mode)
    {
        var session = new GameSession { Mode = mode };
        _sessions[session.GameId] = session;
        return MapToResponse(session);
    }

    public GameStateResponse? GetGame(Guid gameId)
    {
        return _sessions.TryGetValue(gameId, out var session) ? MapToResponse(session) : null;
    }

    public GameStateResponse MakeMove(Guid gameId, MakeMoveRequest request)
    {
        if (!_sessions.TryGetValue(gameId, out var session))
            throw new KeyNotFoundException("Game session not found.");

        ValidateMove(session, request);

        ExecuteSingleMove(session, request.Player, request.Row, request.Col);

        if (session.Status == GameStatus.InProgress && session.Mode == GameMode.Computer && session.CurrentPlayer == 'O')
        {
            var (compRow, compCol) = CalculateComputerMove(session.Board);
            ExecuteSingleMove(session, 'O', compRow, compCol);
        }

        return MapToResponse(session);
    }

    public GameStateResponse UndoMove(Guid gameId)
    {
        if (!_sessions.TryGetValue(gameId, out var session))
            throw new KeyNotFoundException("Game session not found.");

        if (session.Status != GameStatus.InProgress)
            throw new InvalidOperationException("Undo is disabled for completed games.");

        if (session.MoveHistory.Count == 0)
            throw new InvalidOperationException("No moves available to undo.");

        if (session.Mode == GameMode.TwoPlayer)
        {
            RevertLastMove(session);
        }
        else
        {
            if (session.MoveHistory.Count >= 2)
            {
                RevertLastMove(session); // Remove Computer 'O'
                RevertLastMove(session); // Remove Human 'X'
            }
            else if (session.MoveHistory.Count == 1)
            {
                RevertLastMove(session);
            }
        }

        return MapToResponse(session);
    }

    public GameStateResponse ResetGame(Guid gameId)
    {
        if (!_sessions.TryGetValue(gameId, out var session))
            throw new KeyNotFoundException("Game session not found.");

        session.Board = new char[3, 3];
        session.CurrentPlayer = 'X';
        session.Status = GameStatus.InProgress;
        session.Winner = null;
        session.WinningCells.Clear();
        session.MoveHistory.Clear();
        session.ScoreboardUpdated = false;

        return MapToResponse(session);
    }

    public Scoreboard GetScoreboard() => _scoreboard;

    public Scoreboard ResetScoreboard()
    {
        lock (_scoreLock)
        {
            _scoreboard.XWins = 0;
            _scoreboard.OWins = 0;
            _scoreboard.Draws = 0;
        }
        return _scoreboard;
    }

    private void ValidateMove(GameSession session, MakeMoveRequest request)
    {
        if (session.Status != GameStatus.InProgress)
            throw new InvalidOperationException("Cannot make move on completed game.");

        if (request.Row < 0 || request.Row > 2 || request.Col < 0 || request.Col > 2)
            throw new ArgumentOutOfRangeException("Move position out of board bounds.");

        if (session.Board[request.Row, request.Col] != '\0')
            throw new InvalidOperationException("Target cell is already occupied.");

        if (request.Player != session.CurrentPlayer)
            throw new InvalidOperationException($"It is not Player {request.Player}'s turn.");
    }

    private void ExecuteSingleMove(GameSession session, char player, int row, int col)
    {
        session.Board[row, col] = player;
        session.MoveHistory.Add(new MoveRecord(session.MoveHistory.Count + 1, player, row, col));

        if (CheckWin(session.Board, player, out var winningCells))
        {
            session.Status = GameStatus.Won;
            session.Winner = player;
            session.WinningCells = winningCells;
            UpdateScoreboard(session);
        }
        else if (session.MoveHistory.Count == 9)
        {
            session.Status = GameStatus.Draw;
            UpdateScoreboard(session);
        }
        else
        {
            session.CurrentPlayer = player == 'X' ? 'O' : 'X';
        }
    }

    private void RevertLastMove(GameSession session)
    {
        var lastMove = session.MoveHistory[^1];
        session.Board[lastMove.Row, lastMove.Col] = '\0';
        session.MoveHistory.RemoveAt(session.MoveHistory.Count - 1);
        session.CurrentPlayer = lastMove.Player;
    }

    private void UpdateScoreboard(GameSession session)
    {
        if (session.ScoreboardUpdated) return;

        lock (_scoreLock)
        {
            if (session.Status == GameStatus.Won)
            {
                if (session.Winner == 'X') _scoreboard.XWins++;
                else if (session.Winner == 'O') _scoreboard.OWins++;
            }
            else if (session.Status == GameStatus.Draw)
            {
                _scoreboard.Draws++;
            }
            session.ScoreboardUpdated = true;
        }
    }

    private (int Row, int Col) CalculateComputerMove(char[,] board)
    {
        // Priority 1: Win if possible
        if (TryFindCompletingMove(board, 'O', out var winMove)) return winMove;

        // Priority 2: Block human win
        if (TryFindCompletingMove(board, 'X', out var blockMove)) return blockMove;

        // Priority 3: Center cell
        if (board[1, 1] == '\0') return (1, 1);

        // Priority 4: Take open corner
        var corners = new[] { (0, 0), (0, 2), (2, 0), (2, 2) };
        foreach (var (r, c) in corners)
            if (board[r, c] == '\0') return (r, c);

        // Priority 5: Any available open cell
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 3; c++)
                if (board[r, c] == '\0') return (r, c);

        throw new InvalidOperationException("No available moves.");
    }

    private bool TryFindCompletingMove(char[,] board, char player, out (int Row, int Col) move)
    {
        for (int r = 0; r < 3; r++)
        {
            for (int c = 0; c < 3; c++)
            {
                if (board[r, c] == '\0')
                {
                    board[r, c] = player;
                    bool isWin = CheckWin(board, player, out _);
                    board[r, c] = '\0';
                    if (isWin)
                    {
                        move = (r, c);
                        return true;
                    }
                }
            }
        }
        move = (-1, -1);
        return false;
    }

    private bool CheckWin(char[,] board, char p, out List<CellPosition> winningCells)
    {
        winningCells = new List<CellPosition>();

        // Check Rows
        for (int r = 0; r < 3; r++)
        {
            if (board[r, 0] == p && board[r, 1] == p && board[r, 2] == p)
            {
                winningCells.AddRange(new[] { new CellPosition(r, 0), new CellPosition(r, 1), new CellPosition(r, 2) });
                return true;
            }
        }

        // Check Columns
        for (int c = 0; c < 3; c++)
        {
            if (board[0, c] == p && board[1, c] == p && board[2, c] == p)
            {
                winningCells.AddRange(new[] { new CellPosition(0, c), new CellPosition(1, c), new CellPosition(2, c) });
                return true;
            }
        }

        // Check Main Diagonal
        if (board[0, 0] == p && board[1, 1] == p && board[2, 2] == p)
        {
            winningCells.AddRange(new[] { new CellPosition(0, 0), new CellPosition(1, 1), new CellPosition(2, 2) });
            return true;
        }

        // Check Anti-Diagonal
        if (board[0, 2] == p && board[1, 1] == p && board[2, 0] == p)
        {
            winningCells.AddRange(new[] { new CellPosition(0, 2), new CellPosition(1, 1), new CellPosition(2, 0) });
            return true;
        }

        return false;
    }

    private GameStateResponse MapToResponse(GameSession s)
    {
        var grid = new string[3][];
        for (int r = 0; r < 3; r++)
        {
            grid[r] = new string[3];
            for (int c = 0; c < 3; c++)
                grid[r][c] = s.Board[r, c] == '\0' ? "" : s.Board[r, c].ToString();
        }

        return new GameStateResponse
        {
            GameId = s.GameId,
            Board = grid,
            CurrentPlayer = s.CurrentPlayer.ToString(),
            GameMode = s.Mode.ToString(),
            Status = s.Status.ToString(),
            Winner = s.Winner?.ToString(),
            WinningCells = s.WinningCells,
            MoveHistory = s.MoveHistory,
            Scoreboard = _scoreboard
        };
    }
}