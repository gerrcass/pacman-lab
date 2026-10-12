import { DIRECTION_VECTORS, opposite } from "./direction";
import type { Direction } from "./direction";
import { tileAt } from "./maze";
import type { GridPosition, Maze } from "./maze";
import { createPelletBoard } from "./pellets";
import type { PelletMarker } from "./pellets";

/** One tick's worth of player intent: the direction the player is asking for. */
export type Intent = {
  readonly desired: Direction | null;
};

export type PacmanSnapshot = {
  /** The grid tile PacMan occupies. */
  readonly tile: GridPosition;
  /** Continuous position in tile units, tile centers at integers, for smooth rendering. */
  readonly position: GridPosition;
  readonly direction: Direction;
  /** The buffered turn, applied at the first tile center where it is legal. */
  readonly next: Direction | null;
};

export type Snapshot = {
  readonly tick: number;
  /** Points scored so far, across all Levels. */
  readonly score: number;
  /** The 1-based Level being played. */
  readonly level: number;
  /** How many Pellets and Power Pellets are left in the current Maze. */
  readonly pelletsRemaining: number;
  /** The Pellets still on the board, with their kind, for the render layer. */
  readonly pellets: readonly PelletMarker[];
  readonly pacman: PacmanSnapshot;
};

export type Difficulty = {
  /** How far PacMan travels each fixed tick, in tiles. */
  readonly pacmanTilesPerTick: number;
};

export type SimulationConfig = {
  readonly maze: Maze;
  /**
   * Seeds the deterministic RNG. Movement draws no randomness yet, but the seed
   * is part of the contract: a config, seed, and intent sequence must reproduce
   * the same snapshot sequence once randomness (Ghosts, Fruit) arrives.
   */
  readonly seed: number;
  readonly difficulty?: Difficulty;
};

export type Simulation = {
  step(intent: Intent): void;
  snapshot(): Snapshot;
};

export const DEFAULT_DIFFICULTY: Difficulty = {
  pacmanTilesPerTick: 1 / 8,
};

const EPSILON = 1e-6;

function isCentered(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPSILON;
}

function wrapX(maze: Maze, x: number): number {
  return ((x % maze.width) + maze.width) % maze.width;
}

function isWalkable(maze: Maze, x: number, y: number): boolean {
  const type = tileAt(maze, wrapX(maze, x), y);
  return type === "empty" || type === "pellet" || type === "powerPellet";
}

export function createSimulation(config: SimulationConfig): Simulation {
  const { maze } = config;
  const difficulty = config.difficulty ?? DEFAULT_DIFFICULTY;
  const speed = difficulty.pacmanTilesPerTick;

  let tick = 0;
  let score = 0;
  let level = 1;
  const pellets = createPelletBoard(maze);
  const position = { x: maze.pacmanStart.x, y: maze.pacmanStart.y };
  let direction: Direction = "left";
  let next: Direction | null = null;

  // The tiles this tick's movement touched, in order; Pellets are eaten after
  // the move finishes so a Level-clear reset never happens mid-movement.
  const traversed: GridPosition[] = [];

  const atCenter = (): boolean => isCentered(position.x) && isCentered(position.y);

  const currentTile = (): GridPosition => ({
    x: wrapX(maze, isCentered(position.x) ? Math.round(position.x) : Math.floor(position.x)),
    y: isCentered(position.y) ? Math.round(position.y) : Math.floor(position.y),
  });

  /** Notes the tile center PacMan has reached, skipping a repeat of the previous one. */
  const recordTile = (): void => {
    if (!atCenter()) return;
    const tile = currentTile();
    const last = traversed[traversed.length - 1];
    if (last === undefined || last.x !== tile.x || last.y !== tile.y) traversed.push(tile);
  };

  const canEnter = (from: GridPosition, towards: Direction): boolean => {
    const vector = DIRECTION_VECTORS[towards];
    return isWalkable(maze, from.x + vector.x, from.y + vector.y);
  };

  /** Distance from the current position to the next tile center in `direction`. */
  const distanceToNextCenter = (): number => {
    const vector = DIRECTION_VECTORS[direction];
    if (vector.x > 0) return isCentered(position.x) ? 1 : Math.ceil(position.x) - position.x;
    if (vector.x < 0) return isCentered(position.x) ? 1 : position.x - Math.floor(position.x);
    if (vector.y > 0) return isCentered(position.y) ? 1 : Math.ceil(position.y) - position.y;
    return isCentered(position.y) ? 1 : position.y - Math.floor(position.y);
  };

  const advanceBy = (distance: number): void => {
    const vector = DIRECTION_VECTORS[direction];
    position.x = wrapX(maze, position.x + vector.x * distance);
    position.y += vector.y * distance;
  };

  const move = (): void => {
    traversed.length = 0;

    // A reversal needs no tile center, so it applies the moment it is asked for.
    if (next !== null && next === opposite(direction)) {
      direction = next;
      next = null;
    }

    // Spend this tick's distance, re-deciding the buffered turn at every tile
    // center crossed. This keeps turns exact at speeds that do not divide a tile.
    let budget = speed;
    for (;;) {
      if (atCenter()) {
        recordTile();
        if (next !== null && canEnter(currentTile(), next)) {
          direction = next;
          next = null;
        }
        if (!canEnter(currentTile(), direction)) break;
      }

      const step = Math.min(budget, distanceToNextCenter());
      advanceBy(step);
      budget -= step;
      if (budget <= EPSILON) break;
    }

    // A tick that ends exactly on a center still counts as reaching it.
    recordTile();
  };

  return {
    step(intent: Intent): void {
      tick += 1;
      if (intent.desired !== null) next = intent.desired;
      move();
      eatTraversed();
    },

    snapshot(): Snapshot {
      return {
        tick,
        score,
        level,
        pelletsRemaining: pellets.remaining(),
        pellets: pellets.markers(),
        pacman: {
          tile: currentTile(),
          position: { x: position.x, y: position.y },
          direction,
          next,
        },
      };
    },
  };

  function eatTraversed(): void {
    for (const tile of traversed) {
      const consumed = pellets.consume(tile);
      if (consumed === null) continue;
      score += consumed.points;
      if (pellets.remaining() === 0) {
        advanceLevel();
        return;
      }
    }
  }

  function advanceLevel(): void {
    level += 1;
    pellets.reset();
    position.x = maze.pacmanStart.x;
    position.y = maze.pacmanStart.y;
    direction = "left";
    next = null;
  }
}
