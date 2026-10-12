import { CLASSIC_MAZE_ROWS, parseMaze } from "./lib/maze";

export { CLASSIC_MAZE_ROWS, MAZE_COLUMNS, MAZE_ROWS, parseMaze, tileAt } from "./lib/maze";
export type { GridPosition, Maze, Tile, TileType } from "./lib/maze";

export type { Direction } from "./lib/direction";

export { createSimulation } from "./lib/simulation";
export type {
  Difficulty,
  GameState,
  GhostConfig,
  GhostSnapshot,
  Intent,
  PacmanSnapshot,
  Simulation,
  SimulationConfig,
  Snapshot,
} from "./lib/simulation";
export type { PelletKind, PelletMarker } from "./lib/pellets";

export {
  DEATH_TICKS,
  frightenedGhostPoints,
  frightenedTicksForLevel,
  ghostReleasePellets,
  ghostTilesPerTick,
  scatterChaseSchedule,
} from "./lib/tuning";
export type {
  GhostId,
  GhostMode,
  GhostPhase,
  GhostPhaseMode,
  GhostStart,
  HouseGhostId,
} from "./lib/tuning";

export const CLASSIC_MAZE = parseMaze(CLASSIC_MAZE_ROWS);
