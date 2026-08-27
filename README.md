# Tic Tac Toe Platform (.NET 8 / Angular 17)

Production-ready Tic Tac Toe engine featuring strict backend state ownership, a deterministic 5-tier AI opponent, and mode-specific state rollbacks.

## Tech Stack
* **Backend:** .NET 8 Web API, C#, xUnit
* **Frontend:** Angular 17 (Standalone Components), RxJS, TypeScript
* **State Management:** In-Memory Concurrent Dictionary (`ConcurrentDictionary<Guid, GameSession>`)

---

## Local Setup & Execution Guide

### Prerequisites
* .NET 8.0 SDK
* Node.js v18+ and npm

### 1. Run the Backend API
```bash
cd backend/TicTacToe.Api
dotnet restore
dotnet run --urls="http://localhost:5000"