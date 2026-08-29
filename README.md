##Tic Tac Toe Platform (.NET 8 / Angular 17)
Production-ready Tic Tac Toe engine featuring strict backend state ownership, a deterministic 5-tier AI opponent, and mode-specific state rollbacks.

1. **Project Overview**

   This application is a full-stack Tic Tac Toe platform built with an Angular 17 standalone component frontend and an ASP.NET Core (.NET 8) Web API backend engine.
   The backend serves as the single authority for game rules, move validations, board state transitions, win checks, and scorekeeping.
   The application supports two-player local matches, a computer AI opponent, move history logs, persistent session scoreboard tracking, and undo operations.

2. **Tech Stack**

   **1.Backend:** .NET 8 Web API, C#, xUnit, FluentAssertions

   **2.Frontend:** Angular 17 (Standalone Components), RxJS, TypeScript

   **3.State Management:** In-Memory Concurrent Dictionary (ConcurrentDictionary<Guid, GameSession>)

   **4.Styling:** HTML5, CSS3 (Flexbox Layout)

3. **Features Implemented**

   **Interactive Game Board:** 3x3 grid displaying player moves with highlighted winning cells upon victory.

   **Game Modes:** Dynamic switching between Two-Player local mode and Play Against Computer mode.

   **Deterministic 5-Tier Computer AI:** Heuristic decision hierarchy (Win check --> Block opponent win --> Center square selection --> Opposite corner selection --> First available cell).

   **Real-Time Game Status:** Status messages showing the current turn, winner declarations, or draw alerts.

   **Session Scoreboard:** Real-time tracking of X Wins, O Wins, and Draws.

   **Move History Log:** Chronological table displaying move index, active player, and grid coordinates (Row, Column).

   **Game Action Controls:**

   **Reset Game:** Clears the board grid and move history while preserving session scoreboard tallies.

   **Undo Last Move:** Rolls back recent moves (reverts 1 move in Two-Player mode; dual-move rollback in Computer mode).

   **Reset Scoreboard:** Resets session win/draw tallies back to zero.

   **Offline Fallback Guard:** Automatically triggers in-memory local fallback if the backend API server is unreachable.

4. **How to Run the Backend Locally**

   **Prerequisites**

   .NET 8.0 SDK

   **Execution Steps**

   **1.Navigate to the API directory:**
   Bash - cd backend\TicTacToe.Api\

   **2.Restore package dependencies:**
   Bash - dotnet restore

   **3.Start the Web API server:**  
    Bash - dotnet run --urls="http://localhost:5000"

   **4.Access the API documentation and Swagger UI at http://localhost:5000/swagger**

5. **How to Run the Frontend Locally**

   **Prerequisites**

   Node.js (v18 or higher)

   Angular CLI (npm install -g @angular/cli)

   **Execution Steps**

   **1.Navigate to the frontend directory:**

   Bash - cd frontend\tictactoe-ui\src\

   **2.Install npm packages:**

   Bash -npm install

   **3.Run the Angular development server:**

   Bash -npm start

   **4.Open a browser and navigate to http://localhost:4200**

6. **API Endpoint Summary**

   All backend game interactions are exposed via REST endpoints hosted at http://localhost:5000:

   **HTTP**&emsp; **Method**&emsp; **Endpoint Path Description**

   POST &emsp;/api/games &emsp;Initializes a new game session (TwoPlayer or Computer).

   POST &emsp; /api/games/{gameId}/moves &emsp;Validates and applies a move payload { player, row, col }.

   POST &emsp; /api/games/{gameId}/undo &emsp;Reverts the last move step on the backend server state.

   POST &emsp; /api/games/{gameId}/reset &emsp;Resets board cells and move log without clearing session scores.

   POST &emsp; /api/scoreboard/reset &emsp; Resets active scoreboard win/draw counters to zero.

   GET &emsp;/api/games/{gameId} &emsp;Retrieves current game state

   GET &emsp;/api/scoreboard: &emsp;Fetches active scoreboard counters.

7. **How to Run Tests**

   **Backend Unit Tests (.NET / xUnit)**
   Executes backend test coverage for move validation, turn switching, win conditions (row, column, diagonal), draw detection,
   and state rollbacks:

   Bash - cd backend/TicTacToe.Tests -> dotnet test

   **Frontend Unit Tests (Angular /)**
   Executes frontend test coverage for UI layout rendering, computer move selection rules, service integrations, and undo interactions:

   Bash -cd frontend/tictactoe-ui/src/app -> ng test

8. **AI Tools and Prompt Summary**

   Google Gemini was utilized as an AI pair-programmer to assist with:

   **Backend Architecture:** Structuring thread-safe state management using ConcurrentDictionary<Guid, GameSession>.

   **State Reconciliation:** Building RxJS pipe handlers in Angular to normalize API DTOs into frontend component state models.

   **AI Decision Heuristics:** Implementing the 5-tier rule hierarchy for computer moves.

   **Unit Test Suites:** Generating comprehensive Jasmine frontend specs and xUnit backend test cases.

9. **Design Decisions**

   **Backend Authority:** The .NET API server retains exclusive ownership over game state rules, move validation, and score tracking. The Angular UI acts as a dynamic presentation layer.

   **Thread-Safe State Management:** Uses ConcurrentDictionary<Guid, GameSession> to store active game instances safely in server memory.

   **Mode-Specific Undo Rollback:** In Computer mode, clicking Undo automatically reverts both the AI's move and the human player's move to return turn control to the user.

   **Optimistic Local Execution:** The frontend includes an offline connection guard to ensure uninterrupted gameplay if network access to the API server is unavailable.

10. **Clarifications and Assumptions**

    **Undo and Scoreboard Behavior**

    **This application implements Option B:**
    Allow Undo After Completion.

    Players can use the "Undo Move" button even after a game has ended in a win or draw.  
    Reversing a game-ending move decrements the respective win/draw counter on the scoreboard and restores the game status back to InProgress

11. **Known Limitations**

    **In-Memory Volatility:** Game session state and scoreboard tallies reside in server RAM and reset if the .NET process stops or restarts.

    **Single-Node Execution:** Uses local memory dictionaries instead of a distributed cache (e.g., Redis), requiring sticky sessions for multi-node deployments.

12. **Future Improvements**

    **Database Persistence:** Integrate Entity Framework Core with PostgreSQL or SQLite to persist game history and overall player analytics.

    **Real-time WebSockets:** Incorporate SignalR for real-time online multiplayer matches across separate browsers or devices.

    **Unbeatable Minimax AI:** Add an optional difficulty level powered by the Minimax algorithm.
