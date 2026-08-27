import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, GameStateResponse } from './services/game.service';
import { catchError, of, take, timeout } from 'rxjs';

export interface WinningCell {
  row: number;
  col: number;
}

type Mode = 'ONLINE' | 'OFFLINE';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  state: GameStateResponse | null = null;
  isSubmitting = false;
  mode: Mode = 'OFFLINE';

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    // 1. Render local interactive board immediately
    this.initializeLocalState();

    // 2. Background connection attempt
    this.gameService.createGame('TwoPlayer')
      .pipe(
        timeout(2000),
        take(1),
        catchError((err) => {
          console.warn('Backend unavailable. Operating in OFFLINE mode:', err);
          this.mode = 'OFFLINE';
          return of(null);
        })
      )
      .subscribe((newState) => {
        if (newState && newState.gameId) {
          this.state = newState;
          this.mode = 'ONLINE';
        }
      });
  }

  initializeLocalState(): void {
    this.state = {
      gameId: '',
      board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ],
      currentPlayer: 'X',
      status: 'InProgress',
      winner: undefined,
      winningCells: [],
      moveHistory: [],
      scoreboard: { xWins: 0, oWins: 0, draws: 0 },
      gameMode: 'TwoPlayer'
    };
    this.mode = 'OFFLINE';
    this.isSubmitting = false;
  }

  isGameActive(): boolean {
    if (!this.state) return false;
    return this.state.status === 'InProgress' || (this.state.status as any) === 0;
  }

  isWon(): boolean {
    if (!this.state) return false;
    return this.state.status === 'Won' || (this.state.status as any) === 1;
  }

  isDraw(): boolean {
    if (!this.state) return false;
    return this.state.status === 'Draw' || (this.state.status as any) === 2;
  }

  makeMove(row: number, col: number): void {
    if (!this.state || !this.isGameActive()) return;
    if (this.state.board[row][col] !== '') return;

    const previousGameId = this.state.gameId;
    const previousPlayer = this.state.currentPlayer;

    // Apply move locally immediately (never locks UI)
    this.applyLocalMove(row, col);

    // Sync move to backend in background
    if (this.mode === 'ONLINE' && previousGameId) {
      this.gameService.makeMove(previousGameId, previousPlayer, row, col)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend move sync failed. Demoting to OFFLINE mode:', err);
            this.mode = 'OFFLINE';
            if (this.state) this.state.gameId = '';
            return of(null);
          })
        )
        .subscribe();
    }
  }

  private applyLocalMove(row: number, col: number): void {
    if (!this.state) return;

    const activePlayer = this.state.currentPlayer;

    if (!this.state.moveHistory) {
      this.state.moveHistory = [];
    }
    this.state.moveHistory.push({ row, col, player: activePlayer } as any);

    this.state.board[row][col] = activePlayer;
    this.checkLocalGameRules();

    if (this.isGameActive()) {
      this.state.currentPlayer = activePlayer === 'X' ? 'O' : 'X';
    }
    
    this.isSubmitting = false;
  }

  private checkLocalGameRules(): void {
    if (!this.state) return;

    const b = this.state.board;
    const lines = [
      [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
      [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
      [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
    ];

    for (const line of lines) {
      const [[r1,c1], [r2,c2], [r3,c3]] = line;
      if (b[r1][c1] && b[r1][c1] === b[r2][c2] && b[r1][c1] === b[r3][c3]) {
        this.state.status = 'Won';
        this.state.winner = b[r1][c1];
        this.state.winningCells = [{row: r1, col: c1}, {row: r2, col: c2}, {row: r3, col: c3}];
        
        if (b[r1][c1] === 'X') this.state.scoreboard.xWins++;
        else if (b[r1][c1] === 'O') this.state.scoreboard.oWins++;
        return;
      }
    }

    const isFull = b.every(row => row.every(cell => cell !== ''));
    if (isFull) {
      this.state.status = 'Draw';
      this.state.scoreboard.draws++;
    }
  }

  undo(): void {
    if (this.isUndoDisabled() || !this.state) return;

    const previousGameId = this.state.gameId;

    // 1. Instant local undo execution
    this.applyLocalUndo();

    // 2. Non-blocking background sync if online
    if (this.mode === 'ONLINE' && previousGameId) {
      this.gameService.undo(previousGameId)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend undo sync failed. Demoting to OFFLINE mode:', err);
            this.mode = 'OFFLINE';
            if (this.state) this.state.gameId = '';
            return of(null);
          })
        )
        .subscribe();
    }
  }

  private applyLocalUndo(): void {
    if (!this.state || !this.state.moveHistory || this.state.moveHistory.length === 0) return;

    const lastMove = this.state.moveHistory.pop() as any;
    if (lastMove) {
      this.state.board[lastMove.row][lastMove.col] = '';
      this.state.currentPlayer = lastMove.player || (this.state.currentPlayer === 'X' ? 'O' : 'X');
      this.state.status = 'InProgress';
      this.state.winner = undefined;
      this.state.winningCells = [];
    }
    this.isSubmitting = false;
  }

  isUndoDisabled(): boolean {
    if (!this.state) return true;
    const hasNoMoves = !this.state.moveHistory || this.state.moveHistory.length === 0;
    return hasNoMoves;
  }

  resetGame(): void {
    const currentScoreboard = this.state?.scoreboard || { xWins: 0, oWins: 0, draws: 0 };
    const previousGameId = this.state?.gameId;

    // 1. Instant local board clear
    this.resetLocalBoard(currentScoreboard);

    // 2. Non-blocking background reset sync if online
    if (this.mode === 'ONLINE' && previousGameId) {
      this.gameService.resetGame(previousGameId)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend reset sync failed. Demoting to OFFLINE mode:', err);
            this.mode = 'OFFLINE';
            if (this.state) this.state.gameId = '';
            return of(null);
          })
        )
        .subscribe();
    }
  }

  private resetLocalBoard(scoreboard: { xWins: number; oWins: number; draws: number }): void {
    this.state = {
      gameId: this.state?.gameId || '',
      board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ],
      currentPlayer: 'X',
      status: 'InProgress',
      winner: undefined,
      winningCells: [],
      moveHistory: [],
      scoreboard: scoreboard,
      gameMode: 'TwoPlayer'
    };
    this.isSubmitting = false;
  }

  isWinningCell(row: number, col: number): boolean {
    if (!this.state?.winningCells) return false;
    return this.state.winningCells.some((cell: WinningCell) => cell.row === row && cell.col === col);
  }
}