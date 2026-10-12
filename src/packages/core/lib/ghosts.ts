import { DIRECTION_VECTORS, opposite } from "./direction";
import type { Direction } from "./direction";
import {
  EPSILON,
  advancePosition,
  appendPathPoint,
  centeredTile,
  distanceToNextCenter,
  isCentered,
  isWalkable,
} from "./gridMovement";
import type { Position } from "./gridMovement";
import type { GridPosition, Maze } from "./maze";
import type { Rng } from "./rng";
import { chaseTarget, scatterTarget } from "./targeting";
import type { PacManPose } from "./targeting";
import { GHOST_RELEASE_ROUTES } from "./tuning";
import type { GhostId, GhostMode, GhostPhaseMode, GhostStart, HouseGhostId } from "./tuning";

export type GhostState = {
  readonly id: GhostId;
  mode: GhostMode;
  position: Position;
  direction: Direction;
  readonly home: GridPosition;
  /** True while the Ghost is walking its door route out of the house. */
  leaving: boolean;
  /**
   * True from the moment a Ghost is eaten until the current Frightened ends, so
   * it does not turn blue again for the rest of the stretch it was eaten in.
   */
  eatenRecovering: boolean;
  route: GridPosition[];
  exitTile: GridPosition | null;
  bobDirection: Direction;
  /** Set on a Scatter/Chase change; the Ghost reverses on its next move. */
  pendingReverse: boolean;
  /** This tick's motion as an unwrapped polyline, for swept collision. */
  path: Position[];
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
    eatenRecovering: false,
    route: [],
    exitTile: null,
    bobDirection: "up",
    pendingReverse: false,
    path: [],
  }));
}

/** Flags every on-grid Ghost to reverse on its next move. A Scatter/Chase
 * change leaves Frightened Ghosts alone; a Power Pellet reverses them too. */
export function markGhostsForReversal(
  states: readonly GhostState[],
  includeFrightened = false,
): void {
  for (const state of states) {
    if (state.leaving || state.mode === "house" || state.mode === "eaten") continue;
    if (state.mode === "frightened" && !includeFrightened) continue;
    state.pendingReverse = true;
  }
}

/** Whether a Ghost is Frightened: on the grid, timer running, not yet eaten. */
export function isFrightened(state: GhostState, frightenedTicksLeft: number): boolean {
  return frightenedTicksLeft > 0 && !state.eatenRecovering && state.mode !== "eaten";
}

/** Sends a Ghost home as eyes after PacMan eats it. */
export function markGhostEaten(state: GhostState): void {
  state.mode = "eaten";
  state.eatenRecovering = true;
  state.leaving = false;
  state.route = [];
  state.exitTile = null;
  state.pendingReverse = false;
}

export type GhostContext = {
  readonly maze: Maze;
  readonly pacman: PacManPose;
  readonly globalMode: GhostPhaseMode;
  /** Scatter/Chase speed, in tiles per tick. */
  readonly speed: number;
  /** Frightened speed, in tiles per tick. */
  readonly frightenedSpeed: number;
  /** Eyes speed, in tiles per tick. */
  readonly eyesSpeed: number;
  readonly frightenedTicksLeft: number;
  readonly rng: Rng;
  readonly pelletsEaten: number;
  readonly releasePellets: Readonly<Record<HouseGhostId, number>>;
};

export function updateGhosts(states: readonly GhostState[], context: GhostContext): void {
  // Targets read every Ghost's tile as of the start of the tick, then each
  // Ghost steps in a fixed order, so a tick is deterministic.
  const tiles = new Map<GhostId, GridPosition>();
  for (const state of states) {
    tiles.set(state.id, centeredTile(state.position, context.maze.width));
    if (context.frightenedTicksLeft === 0) state.eatenRecovering = false;
    state.path = [{ x: state.position.x, y: state.position.y }];
  }
  const blinkyTile = tiles.get("blinky") ?? context.pacman.tile;

  for (const state of states) {
    if (state.mode === "eaten") {
      updateEaten(state, context);
      continue;
    }

    if (state.leaving) {
      followRoute(state, context.speed);
      continue;
    }

    if (state.mode === "house") {
      if (state.id !== "blinky" && context.pelletsEaten >= context.releasePellets[state.id]) {
        beginLeaving(state, context.globalMode);
      } else {
        bob(state, context.speed);
      }
      continue;
    }

    // On the grid the Ghost's mode follows the global Scatter/Chase timer,
    // unless a Power Pellet has it Frightened.
    const frightened = isFrightened(state, context.frightenedTicksLeft);
    state.mode = frightened ? "frightened" : context.globalMode;
    const tile = tiles.get(state.id) ?? centeredTile(state.position, context.maze.width);

    // A forced reversal on a mode change wins over the direction choice at the
    // tile center the Ghost is standing on.
    const committed = state.pendingReverse;
    if (committed) {
      state.direction = opposite(state.direction);
      state.pendingReverse = false;
    }

    if (frightened) {
      const flee = (from: GridPosition): Direction =>
        chooseFleeDirection(context.maze, state, from, context.pacman.tile, context.rng);
      moveGhostPath(context.maze, state, context.frightenedSpeed, flee, committed, null);
      continue;
    }

    const target =
      state.mode === "scatter"
        ? scatterTarget(state.id)
        : chaseTarget(state.id, tile, context.pacman, blinkyTile);
    const pursue = (from: GridPosition): Direction =>
      chooseDirection(context.maze, state, from, target);
    moveGhostPath(context.maze, state, context.speed, pursue, committed, null);
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
  walkRoute(state, speed, () => {
    if (state.exitTile === null) return;
    state.position.x = state.exitTile.x;
    state.position.y = state.exitTile.y;
    state.exitTile = null;
    state.leaving = false;
    state.direction = "left";
  });
}

/** An eaten Ghost's eyes race home, then it rejoins play. The eyes may cross
 * the house door, so they can reach a home inside the house on any maze. */
function updateEaten(state: GhostState, context: GhostContext): void {
  const pursue = (from: GridPosition): Direction =>
    chooseDirection(context.maze, state, from, state.home, true);
  const arrived = moveGhostPath(
    context.maze,
    state,
    context.eyesSpeed,
    pursue,
    false,
    state.home,
    true,
  );
  if (arrived) finalizeReturn(state, context);
}

/** Puts a returned Ghost back into play: on the grid for Blinky, home for the rest. */
function finalizeReturn(state: GhostState, context: GhostContext): void {
  state.route = [];
  state.exitTile = null;
  state.pendingReverse = false;
  state.position.x = state.home.x;
  state.position.y = state.home.y;

  if (state.id === "blinky") {
    state.mode = context.globalMode;
    return;
  }

  state.mode = "house";
  state.leaving = false;
  state.bobDirection = "up";
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
 * Steps a position along a list of waypoints at `speed` tiles per tick, then
 * calls `onArrive` once the route is drained.
 */
function walkRoute(state: GhostState, speed: number, onArrive: () => void): void {
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

  if (state.route.length === 0) onArrive();
}

/** The walkable neighbours a Ghost may take, never reversing unless it must. */
function forwardOptions(
  maze: Maze,
  state: GhostState,
  tile: GridPosition,
  allowDoor = false,
): Direction[] {
  const reverse = opposite(state.direction);
  const passes = (direction: Direction): boolean => {
    const vector = DIRECTION_VECTORS[direction];
    return isWalkable(maze, tile.x + vector.x, tile.y + vector.y, allowDoor);
  };
  const forward = DIRECTION_ORDER.filter((d) => d !== reverse && passes(d));
  return forward.length > 0 ? forward : [reverse].filter(passes);
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
  allowDoor = false,
): Direction {
  const options = forwardOptions(maze, state, tile, allowDoor);
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

/**
 * A Frightened Ghost flees: at a tile center it takes the walkable neighbour
 * farthest from PacMan, never reversing. Equally distant options are broken by
 * the seeded RNG, so Frightened movement stays deterministic. If the only way
 * out is back the way it came, it takes it.
 */
function chooseFleeDirection(
  maze: Maze,
  state: GhostState,
  tile: GridPosition,
  pacmanTile: GridPosition,
  rng: Rng,
): Direction {
  const options = forwardOptions(maze, state, tile);
  if (options.length === 0) return state.direction;

  let best: Direction[] = [];
  let bestDistance = -1;
  for (const direction of options) {
    const vector = DIRECTION_VECTORS[direction];
    const dx = tile.x + vector.x - pacmanTile.x;
    const dy = tile.y + vector.y - pacmanTile.y;
    const distance = dx * dx + dy * dy;
    if (distance > bestDistance) {
      bestDistance = distance;
      best = [direction];
    } else if (distance === bestDistance) {
      best.push(direction);
    }
  }
  return best.length === 1 ? best[0]! : best[rng.int(best.length)]!;
}

/**
 * Steps a Ghost `speed` tiles along the grid, re-choosing direction with
 * `choose` at every tile center it reaches (except the first when `commitStart`
 * pins a forced reversal). Returns true if it settles on `stopAt`.
 */
function moveGhostPath(
  maze: Maze,
  state: GhostState,
  speed: number,
  choose: (tile: GridPosition) => Direction,
  commitStart: boolean,
  stopAt: GridPosition | null,
  allowDoor = false,
): boolean {
  let budget = speed;
  let atFirstCenter = true;
  for (;;) {
    if (isCentered(state.position.x) && isCentered(state.position.y)) {
      const tile = centeredTile(state.position, maze.width);
      if (stopAt !== null && tile.x === stopAt.x && tile.y === stopAt.y) return true;

      if (!(atFirstCenter && commitStart)) {
        state.direction = choose(tile);
      }
      const vector = DIRECTION_VECTORS[state.direction];
      if (!isWalkable(maze, tile.x + vector.x, tile.y + vector.y, allowDoor)) break;
    }
    atFirstCenter = false;

    const step = Math.min(budget, distanceToNextCenter(state.position, state.direction));
    if (step <= EPSILON) break;
    advancePosition(state.position, state.direction, step, maze.width);
    appendPathPoint(state.path, state.position.x, state.position.y, maze.width);
    budget -= step;
    if (budget <= EPSILON) break;
  }
  return false;
}
