import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, GameStateResponse } from './services/game.service';
import { catchError, of, take, timeout } from 'rxjs';

export interface WinningCell {
  row: number;
  col: number;
}

export interface MoveRecord {
  row: number;
  col: number;
  player: 'X' | 'O';
}

type Mode = 'ONLINE' | 'OFFLINE';
type GameMode = 'TwoPlayer' | 'Computer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  state: GameStateResponse | null = null;
  mode: Mode = 'OFFLINE';

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.initializeLocalState('TwoPlayer');

    this.gameService
      .createGame('TwoPlayer')
      .pipe(
        timeout(2000),
        take(1),
        catchError((err) => {
          console.warn('Backend unavailable. Operating in OFFLINE mode:', err);
          this.mode = 'OFFLINE';
          return of(null);
        }),
      )
      .subscribe((newState) => {
        if (
          newState &&
          (newState.gameId || (newState as any).id) &&
          this.state?.gameMode === 'TwoPlayer'
        ) {
          this.state = this.normalizeState(newState);
          this.mode = 'ONLINE';
        }
      });
  }

  initializeLocalState(selectedGameMode: GameMode = 'TwoPlayer'): void {
    const currentScoreboard = this.state?.scoreboard
      ? { ...this.state.scoreboard }
      : { xWins: 0, oWins: 0, draws: 0 };

    this.state = {
      gameId: '',
      board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
      currentPlayer: 'X',
      status: 'InProgress',
      winner: undefined,
      winningCells: [],
      moveHistory: [],
      scoreboard: currentScoreboard,
      gameMode: selectedGameMode,
    };
    this.mode = 'OFFLINE';
  }

  onModeChange(event: Event): void {
    const selectedMode = (event.target as HTMLSelectElement).value as GameMode;
    const currentScoreboard = this.state?.scoreboard
      ? { ...this.state.scoreboard }
      : { xWins: 0, oWins: 0, draws: 0 };

    this.resetLocalBoard(currentScoreboard, selectedMode);

    // Only invoke backend session creation when switching to TwoPlayer online mode
    if (this.mode === 'ONLINE' && selectedMode === 'TwoPlayer') {
      this.gameService
        .createGame(selectedMode)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend session creation failed on mode change:', err);
            return of(null);
          }),
        )
        .subscribe((newState) => {
          if (newState) {
            this.state = this.normalizeState(newState);
            if (this.state) {
              this.state.scoreboard = { ...currentScoreboard };
            }
          }
        });
    }
  }

  private normalizeState(rawState: GameStateResponse): GameStateResponse {
    const savedGameMode = this.state?.gameMode || 'TwoPlayer';
    const savedGameId = rawState.gameId || (rawState as any).id || this.state?.gameId || '';
    const currentScoreboard = this.state?.scoreboard
      ? { ...this.state.scoreboard }
      : { xWins: 0, oWins: 0, draws: 0 };

    if (!rawState.moveHistory) {
      rawState.moveHistory = [];
    }

    rawState.scoreboard = rawState.scoreboard || currentScoreboard;
    rawState.gameId = savedGameId;
    rawState.gameMode = savedGameMode;
    return rawState;
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

    const previousGameId = this.state.gameId || (this.state as any).id;
    const previousPlayer = this.state.currentPlayer;

    this.applyLocalMove(row, col);

    if (this.mode === 'ONLINE' && previousGameId && this.state.gameMode === 'TwoPlayer') {
      this.gameService
        .makeMove(previousGameId, previousPlayer, row, col)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend move sync failed:', err);
            return of(null);
          }),
        )
        .subscribe((newState) => {
          if (newState && this.mode === 'ONLINE' && this.state?.gameMode === 'TwoPlayer') {
            this.state = this.normalizeState(newState);
          }
        });
    }

    if (
      this.state.gameMode === 'Computer' &&
      this.isGameActive() &&
      this.state.currentPlayer === 'O'
    ) {
      this.makeComputerMove();
    }
  }

  private makeComputerMove(): void {
    if (!this.state || !this.isGameActive() || this.state.currentPlayer !== 'O') return;

    const board = this.state.board;

    const checkWin = (b: string[][], player: string): boolean => {
      const lines = [
        [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
        [
          [1, 0],
          [1, 1],
          [1, 2],
        ],
        [
          [2, 0],
          [2, 1],
          [2, 2],
        ],
        [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        [
          [0, 2],
          [1, 2],
          [2, 2],
        ],
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
        [
          [0, 2],
          [1, 1],
          [2, 0],
        ],
      ];
      return lines.some((line) => line.every(([r, c]) => b[r][c] === player));
    };

    const findBestMove = (): { row: number; col: number } | null => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === '') {
            board[r][c] = 'O';
            const win = checkWin(board, 'O');
            board[r][c] = '';
            if (win) return { row: r, col: c };
          }
        }
      }

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === '') {
            board[r][c] = 'X';
            const win = checkWin(board, 'X');
            board[r][c] = '';
            if (win) return { row: r, col: c };
          }
        }
      }

      if (board[1][1] === '') return { row: 1, col: 1 };

      const corners = [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ];
      const openCorners = corners.filter((c) => board[c.row][c.col] === '');
      if (openCorners.length > 0) return openCorners[0];

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === '') return { row: r, col: c };
        }
      }

      return null;
    };

    const bestMove = findBestMove();
    if (bestMove) {
      this.applyLocalMove(bestMove.row, bestMove.col);
    }
  }

  private applyLocalMove(row: number, col: number): void {
    if (!this.state) return;

    const activePlayer = this.state.currentPlayer;

    const newBoard = this.state.board.map((r) => [...r]);
    newBoard[row][col] = activePlayer;

    const updatedHistory = [
      ...(this.state.moveHistory || []),
      { row, col, player: activePlayer } as any,
    ];

    this.state = {
      ...this.state,
      board: newBoard,
      moveHistory: updatedHistory,
    };

    this.checkLocalGameRules();

    if (this.isGameActive()) {
      this.state.currentPlayer = activePlayer === 'X' ? 'O' : 'X';
    }
  }

  private checkLocalGameRules(): void {
    if (!this.state || this.state.status !== 'InProgress') return;

    const b = this.state.board;
    const lines = [
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ];

    for (const line of lines) {
      const [[r1, c1], [r2, c2], [r3, c3]] = line;
      if (b[r1][c1] && b[r1][c1] === b[r2][c2] && b[r1][c1] === b[r3][c3]) {
        this.state.status = 'Won';
        this.state.winner = b[r1][c1];
        this.state.winningCells = [
          { row: r1, col: c1 },
          { row: r2, col: c2 },
          { row: r3, col: c3 },
        ];

        if (!this.state.scoreboard) {
          this.state.scoreboard = { xWins: 0, oWins: 0, draws: 0 };
        }
        if (b[r1][c1] === 'X') {
          this.state.scoreboard.xWins++;
        } else if (b[r1][c1] === 'O') {
          this.state.scoreboard.oWins++;
        }
        return;
      }
    }

    const isFull = b.every((row) => row.every((cell) => cell !== ''));
    if (isFull) {
      this.state.status = 'Draw';
      if (!this.state.scoreboard) {
        this.state.scoreboard = { xWins: 0, oWins: 0, draws: 0 };
      }
      this.state.scoreboard.draws++;
    }
  }

  undo(): void {
    if (this.isUndoDisabled() || !this.state) return;

    const targetGameId = this.state.gameId || (this.state as any).id;

    if (this.state.gameMode === 'Computer') {
      if (this.state.moveHistory && this.state.moveHistory.length > 0) {
        if (this.state.moveHistory[this.state.moveHistory.length - 1].player === 'O') {
          this.applyLocalUndo();
        }
        if (this.state.moveHistory.length > 0) {
          this.applyLocalUndo();
        }
      }
    } else {
      this.applyLocalUndo();

      if (this.mode === 'ONLINE' && targetGameId && this.state.gameMode === 'TwoPlayer') {
        this.gameService
          .undo(targetGameId)
          .pipe(
            timeout(2000),
            take(1),
            catchError((err) => {
              console.warn('Backend undo sync failed:', err);
              return of(null);
            }),
          )
          .subscribe((newState) => {
            if (newState && this.mode === 'ONLINE') {
              this.state = this.normalizeState(newState);
            }
          });
      }
    }
  }

  private applyLocalUndo(): void {
    if (!this.state || !this.state.moveHistory || this.state.moveHistory.length === 0) return;

    if (this.state.scoreboard) {
      if (this.state.status === 'Won') {
        if (this.state.winner === 'X' && this.state.scoreboard.xWins > 0) {
          this.state.scoreboard.xWins--;
        } else if (this.state.winner === 'O' && this.state.scoreboard.oWins > 0) {
          this.state.scoreboard.oWins--;
        }
      } else if (this.state.status === 'Draw' && this.state.scoreboard.draws > 0) {
        this.state.scoreboard.draws--;
      }
    }

    const updatedHistory = [...this.state.moveHistory];
    const lastMove = updatedHistory.pop() as any;

    if (lastMove) {
      const newBoard = this.state.board.map((r) => [...r]);
      newBoard[lastMove.row][lastMove.col] = '';

      this.state = {
        ...this.state,
        board: newBoard,
        moveHistory: updatedHistory,
        currentPlayer: lastMove.player,
        status: 'InProgress',
        winner: undefined,
        winningCells: [],
      };
    }
  }

  isUndoDisabled(): boolean {
    if (!this.state) return true;
    return !this.state.moveHistory || this.state.moveHistory.length === 0;
  }

  resetGame(): void {
    const currentScoreboard = this.state?.scoreboard
      ? { ...this.state.scoreboard }
      : { xWins: 0, oWins: 0, draws: 0 };
    const currentGameMode = this.state?.gameMode || 'TwoPlayer';
    const currentGameId = this.state?.gameId || (this.state as any)?.id;

    this.resetLocalBoard(currentScoreboard, currentGameMode);

    // Only dispatch backend reset if ONLINE AND in TwoPlayer mode
    if (this.mode === 'ONLINE' && currentGameId && currentGameMode === 'TwoPlayer') {
      this.gameService
        .resetGame(currentGameId)
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend reset failed, creating new game session:', err);
            return this.gameService.createGame(currentGameMode).pipe(
              timeout(2000),
              take(1),
              catchError(() => of(null)),
            );
          }),
        )
        .subscribe((newState) => {
          if (newState) {
            this.state = this.normalizeState(newState);
            if (this.state) {
              this.state.scoreboard = { ...currentScoreboard };
            }
          }
        });
    }
  }

  resetScoreboard(): void {
    if (!this.state) return;
    this.state.scoreboard = { xWins: 0, oWins: 0, draws: 0 };

    if (this.mode === 'ONLINE') {
      this.gameService
        .resetScoreboard()
        .pipe(
          timeout(2000),
          take(1),
          catchError((err) => {
            console.warn('Backend resetScoreboard failed:', err);
            return of(null);
          }),
        )
        .subscribe();
    }
  }

  private resetLocalBoard(
    scoreboard: { xWins: number; oWins: number; draws: number },
    gameMode: GameMode,
  ): void {
    this.state = {
      gameId: this.state?.gameId || (this.state as any)?.id || '',
      board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
      currentPlayer: 'X',
      status: 'InProgress',
      winner: undefined,
      winningCells: [],
      moveHistory: [],
      scoreboard: { ...scoreboard },
      gameMode: gameMode,
    };
  }

  isWinningCell(row: number, col: number): boolean {
    if (!this.state?.winningCells) return false;
    return this.state.winningCells.some(
      (cell: WinningCell) => cell.row === row && cell.col === col,
    );
  }
}
