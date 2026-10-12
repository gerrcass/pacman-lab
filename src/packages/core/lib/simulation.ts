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
  wrapX,
} from "./gridMovement";
import type { GridPosition, Maze } from "./maze";
import {
  createGhostStates,
  isFrightened,
  markGhostEaten,
  markGhostsForReversal,
  updateGhosts,
} from "./ghosts";
import type { GhostState } from "./ghosts";
import { createPelletBoard } from "./pellets";
import type { PelletMarker } from "./pellets";
import { createRng } from "./rng";
import {
  CLASSIC_GHOST_STARTS,
  eyesTilesPerTick,
  frightenedGhostPoints,
  frightenedTilesPerTick,
  frightenedTicksForLevel,
  ghostReleasePellets,
  ghostTilesPerTick,
  scatterChaseSchedule,
} from "./tuning";
import type { GhostId, GhostMode, GhostPhase, GhostStart, HouseGhostId } from "./tuning";

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

export type GhostSnapshot = {
  readonly id: GhostId;
  readonly mode: GhostMode;
  /** The grid tile the Ghost is nearest, x wrapped at the tunnels. */
  readonly tile: GridPosition;
  /** Continuous position in tile units, for smooth rendering. */
  readonly position: GridPosition;
  readonly direction: Direction;
  /** Ticks of Frightened left, or 0 when the Ghost is not Frightened. */
  readonly frightenedTicksLeft: number;
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
  /** The four Ghosts, in Blinky, Pinky, Inky, Clyde order. */
  readonly ghosts: readonly GhostSnapshot[];
};

export type Difficulty = {
  /** How far PacMan travels each fixed tick, in tiles. */
  readonly pacmanTilesPerTick: number;
};

/** Overrides for the Ghost house, mainly for tests and future difficulties. */
export type GhostConfig = {
  /** Initial Ghost states; defaults to the classic arcade homes. */
  readonly starts?: readonly GhostStart[];
  /** Pellets eaten before each house Ghost is released. */
  readonly releasePellets?: Readonly<Record<HouseGhostId, number>>;
  /** Overrides the per-Level Scatter/Chase schedule. */
  readonly schedule?: readonly GhostPhase[];
  /** Starts the Frightened timer, for tests and difficulty experiments. */
  readonly frightenedTicks?: number;
};

export type SimulationConfig = {
  readonly maze: Maze;
  /**
   * Seeds the deterministic RNG. The seed is part of the contract: a config,
   * seed, and intent sequence must reproduce the same snapshot sequence, and
   * Frightened movement draws from it to break equally good flee directions.
   */
  readonly seed: number;
  readonly difficulty?: Difficulty;
  readonly ghosts?: GhostConfig;
};

export type Simulation = {
  step(intent: Intent): void;
  snapshot(): Snapshot;
};

export const DEFAULT_DIFFICULTY: Difficulty = {
  pacmanTilesPerTick: 1 / 8,
};

/** How close PacMan must be to overlap a Ghost, in tiles. */
const GHOST_EAT_DISTANCE = 0.5;
const GHOST_EAT_DISTANCE_SQ = GHOST_EAT_DISTANCE * GHOST_EAT_DISTANCE;

/** The signed distance between two x coordinates, taking the tunnel into account. */
function wrapDelta(delta: number, width: number): number {
  const wrapped = ((delta % width) + width) % width;
  return wrapped > width / 2 ? wrapped - width : wrapped;
}

type Point = { readonly x: number; readonly y: number };

/** Squared distance from a point to the segment a-b. */
function pointSegmentDistanceSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

/** A mover's polyline as points on the tick's [0, 1] timeline. A mover that
 * stops early holds its final point until t = 1. */
type TimedPath = readonly { readonly t: number; readonly x: number; readonly y: number }[];

function timedPath(path: readonly Point[], speed: number): TimedPath {
  const points = [{ t: 0, x: path[0]!.x, y: path[0]!.y }];
  let distance = 0;
  for (let i = 1; i < path.length; i += 1) {
    const previous = path[i - 1]!;
    const current = path[i]!;
    distance += Math.hypot(current.x - previous.x, current.y - previous.y);
    points.push({ t: distance / speed, x: current.x, y: current.y });
  }
  const last = points[points.length - 1]!;
  if (last.t < 1) points.push({ t: 1, x: last.x, y: last.y });
  return points;
}

function sampleAt(path: TimedPath, t: number): Point {
  if (t <= path[0]!.t) return { x: path[0]!.x, y: path[0]!.y };
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (t <= b.t) {
      const span = b.t - a.t;
      const f = span <= 0 ? 0 : (t - a.t) / span;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  const last = path[path.length - 1]!;
  return { x: last.x, y: last.y };
}

/**
 * Whether two constant-speed movers come within `radius` at any shared instant
 * of the tick. Both move in straight lines between their path points, so on
 * each merged time interval the separation is linear and the closest approach
 * is a point-to-segment distance.
 */
function pathsCollide(
  pacmanPath: readonly Point[],
  pacmanSpeed: number,
  ghostPath: readonly Point[],
  ghostSpeed: number,
  width: number,
  radiusSq: number,
): boolean {
  const pacman = timedPath(pacmanPath, pacmanSpeed);
  const ghost = timedPath(ghostPath, ghostSpeed);
  // Put the Ghost's unwrapped path in PacMan's x frame (the tunnel shift).
  const shift =
    wrapDelta(ghostPath[0]!.x - pacmanPath[0]!.x, width) - (ghostPath[0]!.x - pacmanPath[0]!.x);

  const times = [...new Set([...pacman.map((p) => p.t), ...ghost.map((g) => g.t)])].sort(
    (a, b) => a - b,
  );

  const origin = { x: 0, y: 0 };
  for (let i = 0; i < times.length - 1; i += 1) {
    const t0 = times[i]!;
    const t1 = times[i + 1]!;
    const p0 = sampleAt(pacman, t0);
    const p1 = sampleAt(pacman, t1);
    const g0 = sampleAt(ghost, t0);
    const g1 = sampleAt(ghost, t1);
    const relStart = { x: g0.x + shift - p0.x, y: g0.y - p0.y };
    const relEnd = { x: g1.x + shift - p1.x, y: g1.y - p1.y };
    if (pointSegmentDistanceSq(origin, relStart, relEnd) <= radiusSq) return true;
  }
  return false;
}

export function createSimulation(config: SimulationConfig): Simulation {
  const { maze } = config;
  const difficulty = config.difficulty ?? DEFAULT_DIFFICULTY;
  const speed = difficulty.pacmanTilesPerTick;
  const rng = createRng(config.seed);

  const starts = config.ghosts?.starts ?? CLASSIC_GHOST_STARTS;
  const releasePellets = config.ghosts?.releasePellets ?? ghostReleasePellets();
  const scheduleOverride = config.ghosts?.schedule;
  const scheduleFor = (value: number): readonly GhostPhase[] =>
    scheduleOverride ?? scatterChaseSchedule(value);

  let tick = 0;
  let score = 0;
  let level = 1;
  let pelletsEaten = 0;
  const pellets = createPelletBoard(maze);
  const position = { x: maze.pacmanStart.x, y: maze.pacmanStart.y };
  let direction: Direction = "left";
  let next: Direction | null = null;

  let ghosts: GhostState[] = createGhostStates(starts);
  let ghostSpeed = ghostTilesPerTick(level, speed);
  const frightenedSpeed = frightenedTilesPerTick(speed);
  const eyesSpeed = eyesTilesPerTick(speed);
  let frightenedTicks = config.ghosts?.frightenedTicks ?? 0;
  let ghostChain = 0;
  let schedule: readonly GhostPhase[] = scheduleFor(level);
  let phaseIndex = 0;
  let phaseTicks = 0;

  // The tiles this tick's movement touched, in order; Pellets are eaten after
  // the move finishes so a Level-clear reset never happens mid-movement.
  const traversed: GridPosition[] = [];

  // PacMan's motion this tick as an unwrapped polyline, for swept collision.
  let pacmanPath: Point[] = [{ x: position.x, y: position.y }];

  const atCenter = (): boolean => isCentered(position.x) && isCentered(position.y);

  const currentTile = (): GridPosition => ({
    x: wrapX(maze.width, isCentered(position.x) ? Math.round(position.x) : Math.floor(position.x)),
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

  const move = (): void => {
    traversed.length = 0;
    pacmanPath = [{ x: position.x, y: position.y }];

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

      const step = Math.min(budget, distanceToNextCenter(position, direction));
      advancePosition(position, direction, step, maze.width);
      appendPathPoint(pacmanPath, position.x, position.y, maze.width);
      budget -= step;
      if (budget <= EPSILON) break;
    }

    // A tick that ends exactly on a center still counts as reaching it.
    recordTile();
  };

  const currentGlobalMode = (): "scatter" | "chase" => schedule[phaseIndex]?.mode ?? "chase";

  const advanceSchedule = (): void => {
    phaseTicks += 1;
    let phase = schedule[phaseIndex]!;
    while (phaseIndex < schedule.length - 1 && phaseTicks > phase.ticks) {
      phaseTicks -= phase.ticks;
      phaseIndex += 1;
      markGhostsForReversal(ghosts);
      phase = schedule[phaseIndex]!;
    }
  };

  return {
    step(intent: Intent): void {
      tick += 1;
      if (frightenedTicks > 0) frightenedTicks -= 1;
      advanceSchedule();
      if (intent.desired !== null) next = intent.desired;
      move();
      eatTraversed();
      updateGhosts(ghosts, {
        maze,
        pacman: { tile: currentTile(), direction },
        globalMode: currentGlobalMode(),
        speed: ghostSpeed,
        frightenedSpeed,
        eyesSpeed,
        frightenedTicksLeft: frightenedTicks,
        rng,
        pelletsEaten,
        releasePellets,
      });
      resolveGhostEats();
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
        ghosts: ghosts.map((state) => ({
          id: state.id,
          mode: state.mode,
          tile: centeredTile(state.position, maze.width),
          position: { x: state.position.x, y: state.position.y },
          direction: state.direction,
          frightenedTicksLeft: isFrightened(state, frightenedTicks) ? frightenedTicks : 0,
        })),
      };
    },
  };

  function eatTraversed(): void {
    for (const tile of traversed) {
      const consumed = pellets.consume(tile);
      if (consumed === null) continue;
      score += consumed.points;
      pelletsEaten += 1;
      if (pellets.remaining() === 0) {
        advanceLevel();
        return;
      }
      if (consumed.kind === "powerPellet") beginFrightened();
    }
  }

  /** A Power Pellet reverses every Ghost on the grid and starts the timer. */
  function beginFrightened(): void {
    frightenedTicks = frightenedTicksForLevel(level);
    ghostChain = 0;
    for (const state of ghosts) state.eatenRecovering = false;
    markGhostsForReversal(ghosts, true);
  }

  /**
   * Eats any Frightened Ghost PacMan overlaps, doubling the value each time.
   * The check sweeps both movers' paths across the tick, so a fast PacMan or a
   * Ghost that turns mid-tick still collides.
   */
  function resolveGhostEats(): void {
    for (const state of ghosts) {
      if (state.mode !== "frightened") continue;
      if (
        !pathsCollide(
          pacmanPath,
          speed,
          state.path,
          frightenedSpeed,
          maze.width,
          GHOST_EAT_DISTANCE_SQ,
        )
      ) {
        continue;
      }

      score += frightenedGhostPoints(ghostChain);
      ghostChain += 1;
      markGhostEaten(state);
    }
  }

  function advanceLevel(): void {
    level += 1;
    pellets.reset();
    pelletsEaten = 0;
    frightenedTicks = 0;
    ghostChain = 0;
    position.x = maze.pacmanStart.x;
    position.y = maze.pacmanStart.y;
    direction = "left";
    next = null;
    ghosts = createGhostStates(starts);
    ghostSpeed = ghostTilesPerTick(level, speed);
    schedule = scheduleFor(level);
    phaseIndex = 0;
    phaseTicks = 0;
  }
}
