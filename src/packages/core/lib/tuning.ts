import type { Direction } from "./direction";
import type { GridPosition } from "./maze";

export type GhostId = "blinky" | "pinky" | "inky" | "clyde";

/** The mode a Ghost is in. */
export type GhostMode = "house" | "scatter" | "chase" | "frightened" | "eaten";

/** The two modes the global Scatter/Chase timer alternates between. */
export type GhostPhaseMode = "scatter" | "chase";

export type GhostPhase = {
  readonly mode: GhostPhaseMode;
  /** How long the phase lasts, in fixed ticks; `Infinity` for the final chase. */
  readonly ticks: number;
};

export type GhostStart = {
  readonly id: GhostId;
  readonly tile: GridPosition;
  readonly direction: Direction;
  readonly mode: GhostMode;
};

/** The three Ghosts that start inside the house. */
export type HouseGhostId = "pinky" | "inky" | "clyde";

/** Ticks per second of the fixed simulation step. */
const TICKS_PER_SECOND = 60;

/** The arcade death animation length, in fixed ticks (about 1.5s). */
export const DEATH_TICKS = 90;

function seconds(value: number): number {
  return Math.round(value * TICKS_PER_SECOND);
}

/**
 * The arcade's full speed in tiles per tick. PacMan's base is the arcade's
 * level-1 80% of full speed, so full speed is the base over 0.8; Ghost speed
 * tiers are percentages of this.
 */
function arcadeFullTilesPerTick(pacmanTilesPerTick: number): number {
  return pacmanTilesPerTick / 0.8;
}

/**
 * Arcade ghost house homes for the classic Maze: Blinky starts on the tile
 * above the door, the rest are parked inside (Pinky centre, Inky left, Clyde
 * right).
 */
export const CLASSIC_GHOST_STARTS: readonly GhostStart[] = [
  { id: "blinky", tile: { x: 13, y: 11 }, direction: "left", mode: "scatter" },
  { id: "pinky", tile: { x: 13, y: 14 }, direction: "up", mode: "house" },
  { id: "inky", tile: { x: 11, y: 14 }, direction: "up", mode: "house" },
  { id: "clyde", tile: { x: 16, y: 14 }, direction: "up", mode: "house" },
];

/** Arcade home corners each Ghost retreats to in Scatter. */
export const SCATTER_TARGETS: Readonly<Record<GhostId, GridPosition>> = {
  blinky: { x: 25, y: 0 },
  pinky: { x: 2, y: 0 },
  inky: { x: 27, y: 35 },
  clyde: { x: 0, y: 35 },
};

/** The door path each house Ghost follows out onto the grid. */
export const GHOST_RELEASE_ROUTES: Readonly<Record<HouseGhostId, readonly GridPosition[]>> = {
  pinky: [{ x: 13, y: 11 }],
  inky: [
    { x: 13, y: 14 },
    { x: 13, y: 11 },
  ],
  clyde: [
    { x: 14, y: 14 },
    { x: 14, y: 11 },
  ],
};

/** Arcade Pellet-counter limits: Pellets eaten before each house Ghost is released. */
export function ghostReleasePellets(): Readonly<Record<HouseGhostId, number>> {
  return { pinky: 0, inky: 30, clyde: 60 };
}

/**
 * Arcade Frightened durations in seconds by Level. The timer is per Power
 * Pellet, not per Level; later Levels shrink it, and 0 means a Power Pellet
 * buys no Frightened time at all.
 */
const FRIGHTENED_SECONDS: readonly number[] = [
  6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0, 0,
];

/** How long Frightened lasts on a Level, in fixed ticks. */
export function frightenedTicksForLevel(level: number): number {
  const index = Math.min(Math.max(level, 1), FRIGHTENED_SECONDS.length) - 1;
  return seconds(FRIGHTENED_SECONDS[index] ?? 0);
}

/** The doubling value of each Ghost eaten in a single Frightened stretch. */
export function frightenedGhostPoints(chain: number): number {
  return Math.min(200 * 2 ** chain, 1600);
}

/** Frightened Ghosts crawl at half the arcade's full speed. */
export function frightenedTilesPerTick(pacmanTilesPerTick: number): number {
  return arcadeFullTilesPerTick(pacmanTilesPerTick) * 0.5;
}

/** A Ghost's eyes race home at the arcade's full speed. */
export function eyesTilesPerTick(pacmanTilesPerTick: number): number {
  return arcadeFullTilesPerTick(pacmanTilesPerTick);
}

/**
 * The arcade Scatter/Chase schedule, in ticks. Every Level has the same shape;
 * the differences are the Scatter length (7s, or 5s from level 5), the long
 * third Chase (20s on level 1, then ~17 minutes), and a last Scatter that
 * lasts 5s on level 1 and a single tick beyond it. The final chase never ends.
 */
export function scatterChaseSchedule(level: number): readonly GhostPhase[] {
  const scatterSeconds = level >= 5 ? 5 : 7;
  const thirdChaseSeconds = level === 1 ? 20 : level >= 5 ? 1037 : 1033;
  const lastScatterSeconds = level === 1 ? 5 : 1 / 60;
  return [
    { mode: "scatter", ticks: seconds(scatterSeconds) },
    { mode: "chase", ticks: seconds(20) },
    { mode: "scatter", ticks: seconds(scatterSeconds) },
    { mode: "chase", ticks: seconds(20) },
    { mode: "scatter", ticks: seconds(5) },
    { mode: "chase", ticks: seconds(thirdChaseSeconds) },
    { mode: "scatter", ticks: seconds(lastScatterSeconds) },
    { mode: "chase", ticks: Infinity },
  ];
}

/** The arcade ghost speed in tiles per tick, from the per-Level speed tiers. */
export function ghostTilesPerTick(level: number, pacmanTilesPerTick: number): number {
  const tier = level === 1 ? 0.75 : level <= 4 ? 0.85 : 0.95;
  return arcadeFullTilesPerTick(pacmanTilesPerTick) * tier;
}
