import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';

export interface CellPosition {
  row: number;
  col: number;
}

export interface MoveRecord {
  moveNumber?: number;
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
  id?: string;
  gameMode?: 'TwoPlayer' | 'Computer';
  mode?: 'TwoPlayer' | 'Computer';
  board: string[][];
  currentPlayer: string;
  status: 'InProgress' | 'Won' | 'Draw' | number;
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
   * Normalizes property casing/aliases (id vs gameId, mode vs gameMode) returned by .NET API
   */
  private normalizeResponse(state: GameStateResponse): GameStateResponse {
    if (state) {
      state.gameId = state.gameId || state.id || '';
      state.gameMode = state.gameMode || state.mode || 'TwoPlayer';
    }
    return state;
  }

  /**
   * Creates a new game session on the .NET backend authority
   */
  createGame(mode: 'TwoPlayer' | 'Computer'): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}`, { mode })
      .pipe(
        map(state => this.normalizeResponse(state)),
        tap(state => this.stateSubject.next(state))
      );
  }

  /**
   * Submits a human move to the backend engine
   */
  makeMove(gameId: string, player: string, row: number, col: number): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/moves`, { player, row, col }).pipe(
      map(state => this.normalizeResponse(state)),
      tap(state => this.stateSubject.next(state)),
      catchError(err => {
        console.error('Failed to execute move:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Triggers move rollback on backend
   */
  undo(gameId: string): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/undo`, {})
      .pipe(
        map(state => this.normalizeResponse(state)),
        tap(state => this.stateSubject.next(state))
      );
  }

  /**
   * Resets active board state while preserving cumulative session scores
   */
  resetGame(gameId: string): Observable<GameStateResponse> {
    return this.http.post<GameStateResponse>(`${this.apiUrl}/${gameId}/reset`, {})
      .pipe(
        map(state => this.normalizeResponse(state)),
        tap(state => this.stateSubject.next(state))
      );
  }

  /**
   * Resets accumulated win/draw totals across sessions
   */
  resetScoreboard(): Observable<Scoreboard> {
    return this.http.post<Scoreboard>(`${this.scoreboardUrl}/reset`, {})
      .pipe(
        tap((scoreboard) => {
          const current = this.stateSubject.value;
          if (current) {
            this.stateSubject.next({
              ...current,
              scoreboard: scoreboard || { xWins: 0, oWins: 0, draws: 0 }
            });
          }
        })
      );
  }
}