using System.Text.Json.Serialization;

namespace TicTacToe.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GameMode
{
    TwoPlayer,
    Computer
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GameStatus
{
    InProgress,
    Won,
    Draw
}

public record CellPosition(int Row, int Col);

public record MoveRecord(int MoveNumber, char Player, int Row, int Col);

public class Scoreboard
{
    public int XWins { get; set; }
    public int OWins { get; set; }
    public int Draws { get; set; }
}

public class GameSession
{
    public Guid GameId { get; set; } = Guid.NewGuid();
    public char[,] Board { get; set; } = new char[3, 3];
    public char CurrentPlayer { get; set; } = 'X';
    public GameMode Mode { get; set; } = GameMode.TwoPlayer;
    public GameStatus Status { get; set; } = GameStatus.InProgress;
    public char? Winner { get; set; }
    public List<CellPosition> WinningCells { get; set; } = new();
    public List<MoveRecord> MoveHistory { get; set; } = new();
    public bool ScoreboardUpdated { get; set; } = false;
}

public record CreateGameRequest(GameMode Mode);
public record MakeMoveRequest(char Player, int Row, int Col);

public class GameStateResponse
{
    public Guid GameId { get; set; }
    public string[][] Board { get; set; } = new string[3][];
    public string CurrentPlayer { get; set; } = string.Empty;
    public string GameMode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Winner { get; set; }
    public List<CellPosition> WinningCells { get; set; } = new();
    public List<MoveRecord> MoveHistory { get; set; } = new();
    public Scoreboard Scoreboard { get; set; } = new();
}