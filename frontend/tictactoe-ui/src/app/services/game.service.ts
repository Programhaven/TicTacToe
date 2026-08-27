import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';


export interface CellPosition {
  row: number;
  col: number;
}

export interface MoveRecord {
  moveNumber: number;
  player: string;
  row: number;
  col: number;
}

export interface Scoreboard {
  xWins: number;
  oWins: number;
  draws: number;
}

export interface GameStateResponse {
  gameId: string;
  gameMode: 'TwoPlayer' | 'Computer';
  board: string[][];
  currentPlayer: string;
  status: 'InProgress' | 'Won' | 'Draw';
  winner?: string;
  winningCells?: CellPosition[];
  moveHistory: MoveRecord[];
  scoreboard: Scoreboard;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:5000/api/games';
  private scoreboardUrl = 'http://localhost:5000/api/scoreboard';

  private stateSubject = new BehaviorSubject<GameStateResponse | null>(null);
  public state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Creates a new game session on the .NET backend authority
   */
    createGame(mode: 'TwoPlayer' | 'Computer'): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}`, { mode })
      .pipe(tap(state => this.stateSubject.next(state)));
  }

  /**
   * Submits a human move to the backend engine
  */
  makeMove(gameId: string, player: string, row: number, col: number): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/moves`, { player, row, col }).pipe(
        tap(state => this.stateSubject.next(state)),
        catchError(err => {
        console.error('Failed to execute move:', err);
        return throwError(() => err);
        })
    );
 }

  /**
   * UNDO IMPLEMENTATION:
   * Triggers single-move rollback (2-Player) or atomic double-move rollback (VS Computer)
   */
  undo(gameId: string): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/undo`, {})
      .pipe(tap(state => this.stateSubject.next(state)));
  }

  /**
   * Resets the active game session while preserving overall session scoreboard metrics
   */
  resetGame(gameId: string): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/reset`, {})
      .pipe(tap(state => this.stateSubject.next(state)));
  }

  /**
   * Resets accumulated win/draw totals across sessions
   */
  resetScoreboard(): Observable<Scoreboard> {
    return this.http.post<Scoreboard>(`${this.scoreboardUrl}/reset`, {})
      .pipe(
        tap(() => {
          const current = this.stateSubject.value;
          if (current) {
            this.stateSubject.next({
              ...current,
              scoreboard: { xWins: 0, oWins: 0, draws: 0 }
            });
          }
        })
      );
  }
}