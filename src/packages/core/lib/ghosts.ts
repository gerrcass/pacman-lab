import { DIRECTION_VECTORS, opposite } from "./direction";
import type { Direction } from "./direction";
import {
  EPSILON,
  advancePosition,
  centeredTile,
  distanceToNextCenter,
  isCentered,
  isWalkable,
} from "./gridMovement";
import type { Position } from "./gridMovement";
import type { GridPosition, Maze } from "./maze";
import { chaseTarget, scatterTarget } from "./targeting";
import { GHOST_RELEASE_ROUTES } from "./tuning";
import type { GhostId, GhostMode, GhostPhaseMode, GhostStart } from "./tuning";

type HouseGhostId = "pinky" | "inky" | "clyde";

export type GhostState = {
  readonly id: GhostId;
  mode: GhostMode;
  position: Position;
  direction: Direction;
  readonly home: GridPosition;
  /** True while the Ghost is walking its door route out of the house. */
  leaving: boolean;
  route: GridPosition[];
  exitTile: GridPosition | null;
  bobDirection: Direction;
};

/** Arcade tie-break order when several directions tie on distance. */
const DIRECTION_ORDER: readonly Direction[] = ["up", "left", "down", "right"];
const BOB_AMPLITUDE = 0.25;

export function createGhostStates(starts: readonly GhostStart[]): GhostState[] {
  return starts.map((entry) => ({
    id: entry.id,
    mode: entry.mode,
    position: { x: entry.tile.x, y: entry.tile.y },
    direction: entry.direction,
    home: { x: entry.tile.x, y: entry.tile.y },
    leaving: false,
    route: [],
    exitTile: null,
    bobDirection: "up",
  }));
}

/** Reverses every Ghost that is on the grid, used on a Scatter/Chase change. */
export function reverseGhostStates(states: readonly GhostState[]): void {
  for (const state of states) {
    if (state.leaving || state.mode === "house") continue;
    if (state.mode === "scatter" || state.mode === "chase") {
      state.direction = opposite(state.direction);
    }
  }
}

export type GhostContext = {
  readonly maze: Maze;
  readonly pacmanTile: GridPosition;
  readonly pacmanDirection: Direction;
  readonly globalMode: GhostPhaseMode;
  readonly speed: number;
  readonly pelletsEaten: number;
  readonly releaseDots: Readonly<Record<HouseGhostId, number>>;
};

export function updateGhosts(states: readonly GhostState[], context: GhostContext): void {
  // Targets read every Ghost's tile as of the start of the tick, then each
  // Ghost steps in a fixed order, so a tick is deterministic.
  const tiles = new Map<GhostId, GridPosition>();
  for (const state of states) {
    tiles.set(state.id, centeredTile(state.position, context.maze.width));
  }
  const blinkyTile = tiles.get("blinky") ?? context.pacmanTile;

  for (const state of states) {
    if (state.leaving) {
      followRoute(state, context.speed);
      continue;
    }

    if (state.mode === "house") {
      if (state.id !== "blinky" && context.pelletsEaten >= context.releaseDots[state.id]) {
        beginLeaving(state, context.globalMode);
      } else {
        bob(state, context.speed);
      }
      continue;
    }

    if (state.mode === "scatter" || state.mode === "chase") {
      // On the grid the Ghost's mode follows the global Scatter/Chase timer.
      state.mode = context.globalMode;
      const tile = tiles.get(state.id) ?? centeredTile(state.position, context.maze.width);
      const target =
        state.mode === "scatter"
          ? scatterTarget(state.id)
          : chaseTarget(state.id, tile, context.pacmanTile, context.pacmanDirection, blinkyTile);
      moveGhost(context.maze, state, context.speed, target);
    }
  }
}

function beginLeaving(state: GhostState, globalMode: GhostPhaseMode): void {
  const route = GHOST_RELEASE_ROUTES[state.id as HouseGhostId];
  state.leaving = true;
  state.mode = globalMode;
  state.route = route.map((tile) => ({ ...tile }));
  state.exitTile = { ...route[route.length - 1]! };
  state.position.y = state.home.y;
}

/** Walks the scripted door route; the house is not part of the Ghost's AI. */
function followRoute(state: GhostState, speed: number): void {
  let budget = speed;
  while (budget > EPSILON && state.route.length > 0) {
    const waypoint = state.route[0]!;
    const dx = waypoint.x - state.position.x;
    const dy = waypoint.y - state.position.y;

    if (Math.abs(dx) > EPSILON) {
      const step = Math.min(budget, Math.abs(dx));
      state.position.x += Math.sign(dx) * step;
      state.direction = dx > 0 ? "right" : "left";
      budget -= step;
    } else if (Math.abs(dy) > EPSILON) {
      const step = Math.min(budget, Math.abs(dy));
      state.position.y += Math.sign(dy) * step;
      state.direction = dy > 0 ? "down" : "up";
      budget -= step;
    } else {
      state.route.shift();
    }
  }

  if (state.route.length === 0 && state.exitTile !== null) {
    state.position.x = state.exitTile.x;
    state.position.y = state.exitTile.y;
    state.exitTile = null;
    state.leaving = false;
    state.direction = "left";
  }
}

/** A parked Ghost rocks gently up and down inside the house. */
function bob(state: GhostState, speed: number): void {
  state.position.y += DIRECTION_VECTORS[state.bobDirection].y * speed;
  const min = state.home.y - BOB_AMPLITUDE;
  const max = state.home.y + BOB_AMPLITUDE;
  if (state.position.y <= min) {
    state.position.y = min;
    state.bobDirection = "down";
  } else if (state.position.y >= max) {
    state.position.y = max;
    state.bobDirection = "up";
  }
}

/**
 * At a tile center a Ghost picks the walkable neighbour (never reversing) whose
 * tile is closest to the target, ties broken up, left, down, right. If the only
 * way out is back the way it came, it takes it.
 */
function chooseDirection(
  maze: Maze,
  state: GhostState,
  tile: GridPosition,
  target: GridPosition,
): Direction {
  const reverse = opposite(state.direction);
  const passes = (direction: Direction): boolean => {
    const vector = DIRECTION_VECTORS[direction];
    return isWalkable(maze, tile.x + vector.x, tile.y + vector.y);
  };
  const forward = DIRECTION_ORDER.filter((d) => d !== reverse && passes(d));
  const options = forward.length > 0 ? forward : [reverse].filter(passes);
  if (options.length === 0) return state.direction;

  let best = options[0]!;
  let bestDistance = Infinity;
  for (const direction of options) {
    const vector = DIRECTION_VECTORS[direction];
    const dx = tile.x + vector.x - target.x;
    const dy = tile.y + vector.y - target.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = direction;
    }
  }
  return best;
}

function moveGhost(maze: Maze, state: GhostState, speed: number, target: GridPosition): void {
  let budget = speed;
  for (;;) {
    if (isCentered(state.position.x) && isCentered(state.position.y)) {
      const tile = centeredTile(state.position, maze.width);
      state.direction = chooseDirection(maze, state, tile, target);
      const vector = DIRECTION_VECTORS[state.direction];
      if (!isWalkable(maze, tile.x + vector.x, tile.y + vector.y)) break;
    }

    const step = Math.min(budget, distanceToNextCenter(state.position, state.direction));
    if (step <= EPSILON) break;
    advancePosition(state.position, state.direction, step, maze.width);
    budget -= step;
    if (budget <= EPSILON) break;
  }
}
