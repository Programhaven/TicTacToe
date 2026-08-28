import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { App } from './app';
import { GameService, GameStateResponse } from './services/game.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App Component Frontend Unit Tests', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let mockGameService: {
    createGame: ReturnType<typeof vi.fn>;
    makeMove: ReturnType<typeof vi.fn>;
    undo: ReturnType<typeof vi.fn>;
    resetGame: ReturnType<typeof vi.fn>;
    resetScoreboard: ReturnType<typeof vi.fn>;
  };

  const getFreshInitialState = (): GameStateResponse => ({
    gameId: 'test-session-123',
    board: [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ],
    currentPlayer: 'X',
    status: 'InProgress',
    winningCells: [],
    moveHistory: [],
    scoreboard: { xWins: 0, oWins: 0, draws: 0 },
    gameMode: 'TwoPlayer'
  });

  // Helper to read current state whether using Signals or plain properties
  const getState = (comp: any): GameStateResponse => {
    return typeof comp.state === 'function' ? comp.state() : comp.state;
  };

  // Helper to safely set state whether using Signals or plain properties
  const updateState = (comp: any, newState: GameStateResponse) => {
    if (typeof comp.state === 'function' && typeof comp.state.set === 'function') {
      comp.state.set(newState);
    } else {
      comp.state = newState;
    }
  };

  beforeEach(async () => {
    mockGameService = {
      createGame: vi.fn().mockReturnValue(of(getFreshInitialState())),
      makeMove: vi.fn().mockReturnValue(of(getFreshInitialState())),
      undo: vi.fn().mockReturnValue(of(getFreshInitialState())),
      resetGame: vi.fn().mockReturnValue(of(getFreshInitialState())),
      resetScoreboard: vi.fn().mockReturnValue(of({ xWins: 0, oWins: 0, draws: 0 }))
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: GameService, useValue: mockGameService }]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // 1. Component Rendering
  describe('Component Rendering', () => {
    it('should render the board grid, controls, and scoreboard elements', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.board')).toBeTruthy();
      expect(compiled.querySelector('.mode-selector')).toBeTruthy();
      expect(compiled.querySelector('.scoreboard-bar')).toBeTruthy();
    });

    it('should render cell text dynamically based on component board state', () => {
      const updatedState: GameStateResponse = {
        ...getFreshInitialState(),
        board: [
          ['X', 'O', ''],
          ['', '', ''],
          ['', '', '']
        ]
      };

      updateState(component, updatedState);
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('.cell');
      expect(cells[0].textContent?.trim()).toBe('X');
      expect(cells[1].textContent?.trim()).toBe('O');
    });
  });

  // 2. API Integration Points (Online Mode)
  describe('API Integration Points', () => {
    beforeEach(() => {
      component.mode = 'ONLINE';
      updateState(component, {
        ...getFreshInitialState(),
        moveHistory: [{ row: 0, col: 0, player: 'X' }]
      });
    });

    it('should dispatch makeMove HTTP payload to GameService', () => {
      mockGameService.makeMove.mockReturnValue(of({ ...getFreshInitialState(), currentPlayer: 'O' }));

      component.makeMove(0, 0);

      expect(mockGameService.makeMove).toHaveBeenCalledWith('test-session-123', 'X', 0, 0);
    });

    it('should dispatch undo HTTP request to GameService', () => {
      mockGameService.undo.mockReturnValue(of(getFreshInitialState()));

      component.undo();

      expect(mockGameService.undo).toHaveBeenCalledWith('test-session-123');
    });

    it('should dispatch resetGame HTTP request to GameService', () => {
      mockGameService.resetGame.mockReturnValue(of(getFreshInitialState()));

      component.resetGame();

      expect(mockGameService.resetGame).toHaveBeenCalledWith('test-session-123');
    });

    it('should dispatch resetScoreboard HTTP request to GameService', () => {
      mockGameService.resetScoreboard.mockReturnValue(of({ xWins: 0, oWins: 0, draws: 0 }));

      component.resetScoreboard();

      expect(mockGameService.resetScoreboard).toHaveBeenCalled();
    });
  });

  // 3. Core Game Logic Tests (Local Mode)
  describe('Core Game Operations & State Rules', () => {
    beforeEach(() => {
      component.initializeLocalState('TwoPlayer');
    });

    it('Valid move: updates board state and appends to move history', () => {
      component.makeMove(0, 0);
      const state = getState(component);
      expect(state.board[0][0]).toBe('X');
      expect(state.moveHistory.length).toBe(1);
    });

    it('Invalid move: prevents selection of an already occupied cell', () => {
      component.makeMove(0, 0);
      component.makeMove(0, 0);

      const state = getState(component);
      expect(state.board[0][0]).toBe('X');
      expect(state.moveHistory.length).toBe(1);
    });

    it('Turn switching: alternates active player turn from X to O', () => {
      expect(getState(component).currentPlayer).toBe('X');

      component.makeMove(0, 0);

      expect(getState(component).currentPlayer).toBe('O');
    });

    it('Row win: identifies 3 matching markers in a horizontal row', () => {
      component.makeMove(0, 0); // X
      component.makeMove(1, 0); // O
      component.makeMove(0, 1); // X
      component.makeMove(1, 1); // O
      component.makeMove(0, 2); // X Wins

      const state = getState(component);
      expect(component.isWon()).toBe(true);
      expect(state.winner).toBe('X');
    });

    it('Column win: identifies 3 matching markers in a vertical column', () => {
      component.makeMove(0, 0); // X
      component.makeMove(0, 1); // O
      component.makeMove(1, 0); // X
      component.makeMove(1, 1); // O
      component.makeMove(2, 0); // X Wins

      const state = getState(component);
      expect(component.isWon()).toBe(true);
      expect(state.winner).toBe('X');
    });

    it('Diagonal win: identifies 3 matching markers diagonally', () => {
      component.makeMove(0, 0); // X
      component.makeMove(0, 1); // O
      component.makeMove(1, 1); // X
      component.makeMove(0, 2); // O
      component.makeMove(2, 2); // X Wins

      const state = getState(component);
      expect(component.isWon()).toBe(true);
      expect(state.winner).toBe('X');
    });

    it('Draw: declares draw state when full grid contains no win line', () => {
      component.makeMove(0, 0); // X
      component.makeMove(0, 1); // O
      component.makeMove(0, 2); // X
      component.makeMove(1, 1); // O
      component.makeMove(1, 0); // X
      component.makeMove(1, 2); // O
      component.makeMove(2, 1); // X
      component.makeMove(2, 0); // O
      component.makeMove(2, 2); // X

      expect(component.isDraw()).toBe(true);
    });

    it('Move after game completion: prevents moves after game reaches win status', () => {
      component.makeMove(0, 0); // X
      component.makeMove(1, 0); // O
      component.makeMove(0, 1); // X
      component.makeMove(1, 1); // O
      component.makeMove(0, 2); // X Wins

      expect(component.isWon()).toBe(true);

      component.makeMove(2, 2);
      expect(getState(component).board[2][2]).toBe('');
    });

    it('Undo in two-player mode: reverts 1 move step and updates player turn', () => {
      component.makeMove(0, 0); // X
      expect(getState(component).currentPlayer).toBe('O');

      component.undo();

      const state = getState(component);
      expect(state.board[0][0]).toBe('');
      expect(state.currentPlayer).toBe('X');
      expect(state.moveHistory.length).toBe(0);
    });

    it('Undo in computer mode: rolls back both player and computer moves together', () => {
      component.initializeLocalState('Computer');
      component.makeMove(0, 0); // Human X (Computer O auto-plays)

      expect(getState(component).moveHistory.length).toBe(2);

      component.undo();

      const state = getState(component);
      expect(state.moveHistory.length).toBe(0);
      expect(state.board[0][0]).toBe('');
      expect(state.currentPlayer).toBe('X');
    });

    it('Computer move selection: executes AI turn logic automatically', () => {
      component.initializeLocalState('Computer');

      const currentState = getState(component);
      const targetState: GameStateResponse = {
        ...currentState,
        board: [
          ['O', 'O', ''],
          ['X', 'X', ''],
          ['', '', '']
        ],
        currentPlayer: 'O'
      };

      updateState(component, targetState);

      component['makeComputerMove']();

      const updatedState = getState(component);
      expect(updatedState.board[0][2]).toBe('O');
    });

    it('Reset game: clears board grid while retaining current scoreboard values', () => {
      const currentState = getState(component);
      updateState(component, {
        ...currentState,
        scoreboard: { xWins: 2, oWins: 1, draws: 0 }
      });

      component.makeMove(0, 0);
      component.resetGame();

      const state = getState(component);
      expect(state.board).toEqual([
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]);
      expect(state.scoreboard).toEqual({ xWins: 2, oWins: 1, draws: 0 });
    });

    it('Scoreboard update: increments win counters on victory', () => {
      component.makeMove(0, 0); // X
      component.makeMove(1, 0); // O
      component.makeMove(0, 1); // X
      component.makeMove(1, 1); // O
      component.makeMove(0, 2); // X Wins

      expect(getState(component).scoreboard.xWins).toBe(1);
    });
  });
});