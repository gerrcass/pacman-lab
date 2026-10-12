import type { Snapshot } from "../../core";
import type { FlowSnapshot, Screen } from "../gameFlow";

/** A playing board with no actors, for the app-layer drivers' tests. */
export function idleBoard(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    tick: 0,
    state: "playing",
    score: 0,
    lives: 3,
    level: 1,
    deathTicksLeft: 0,
    pelletsRemaining: 10,
    pellets: [],
    fruit: null,
    pacman: {
      tile: { x: 0, y: 0 },
      position: { x: 0, y: 0 },
      direction: "left",
      next: null,
    },
    ghosts: [],
    ...overrides,
  };
}

/** Wraps a board in a flow frame on a screen. */
export function frame(screen: Screen, board: Snapshot): FlowSnapshot {
  return {
    screen,
    board,
    score: board.score,
    lives: board.lives,
    level: board.level,
    highScore: 0,
    transition: 0,
  };
}
