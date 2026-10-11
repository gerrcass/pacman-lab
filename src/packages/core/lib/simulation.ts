import { DIRECTION_VECTORS, opposite } from "./direction";
import type { Direction } from "./direction";
import { tileAt } from "./maze";
import type { GridPosition, Maze } from "./maze";

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

/**
 * Advance a continuous coordinate by `speed` along `step` (+1 or -1), stopping
 * at the last tile center whose onward tile is a wall. `walkable` is asked about
 * tiles on the moving axis.
 */
function advance(
  coordinate: number,
  step: 1 | -1,
  speed: number,
  walkable: (tile: number) => boolean,
): number {
  const target = coordinate + step * speed;
  // The first tile center at or ahead of the coordinate, in the direction of travel.
  let center = isCentered(coordinate)
    ? Math.round(coordinate)
    : step > 0
      ? Math.ceil(coordinate)
      : Math.floor(coordinate);
  let furthest = coordinate;

  while (walkable(center)) {
    if (step > 0 ? center > target + EPSILON : center < target - EPSILON) {
      return target;
    }
    furthest = center;
    center += step;
  }

  return step > 0 ? Math.min(target, furthest) : Math.max(target, furthest);
}

export function createSimulation(config: SimulationConfig): Simulation {
  const { maze } = config;
  const difficulty = config.difficulty ?? DEFAULT_DIFFICULTY;
  const speed = difficulty.pacmanTilesPerTick;

  let tick = 0;
  const position = { x: maze.pacmanStart.x, y: maze.pacmanStart.y };
  let direction: Direction = "left";
  let next: Direction | null = null;

  const currentTile = (): GridPosition => ({
    x: wrapX(maze, isCentered(position.x) ? Math.round(position.x) : Math.floor(position.x)),
    y: isCentered(position.y) ? Math.round(position.y) : Math.floor(position.y),
  });

  const canEnter = (from: GridPosition, towards: Direction): boolean => {
    const vector = DIRECTION_VECTORS[towards];
    return isWalkable(maze, from.x + vector.x, from.y + vector.y);
  };

  const move = (): void => {
    const vector = DIRECTION_VECTORS[direction];
    if (vector.x !== 0) {
      position.x = advance(position.x, vector.x > 0 ? 1 : -1, speed, (tile) =>
        isWalkable(maze, tile, position.y),
      );
      position.x = wrapX(maze, position.x);
    } else {
      position.y = advance(position.y, vector.y > 0 ? 1 : -1, speed, (tile) =>
        isWalkable(maze, position.x, tile),
      );
    }
  };

  return {
    step(intent: Intent): void {
      tick += 1;
      if (intent.desired !== null) next = intent.desired;

      const aligned = isCentered(position.x) && isCentered(position.y);
      const tile = currentTile();

      if (next !== null) {
        if (next === opposite(direction) || (aligned && canEnter(tile, next))) {
          direction = next;
          next = null;
        }
      }

      move();
    },

    snapshot(): Snapshot {
      return {
        tick,
        pacman: {
          tile: currentTile(),
          position: { x: position.x, y: position.y },
          direction,
          next,
        },
      };
    },
  };
}
