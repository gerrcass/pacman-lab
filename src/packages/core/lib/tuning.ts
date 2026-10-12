import type { Direction } from "./direction";
import type { GridPosition } from "./maze";

export type GhostId = "blinky" | "pinky" | "inky" | "clyde";

/** The mode a Ghost is in. `frightened` and `eaten` are wired in later tickets. */
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

function seconds(value: number): number {
  return Math.round(value * TICKS_PER_SECOND);
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
  // PacMan's base speed is the arcade's level-1 80% of full speed, so full speed
  // is the base over 0.8; the Ghost tiers are percentages of that full speed.
  const arcadeFullSpeed = pacmanTilesPerTick / 0.8;
  const tier = level === 1 ? 0.75 : level <= 4 ? 0.85 : 0.95;
  return arcadeFullSpeed * tier;
}
