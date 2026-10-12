import { CLASSIC_MAZE_ROWS, parseMaze } from "./lib/maze";

export { CLASSIC_MAZE_ROWS, MAZE_COLUMNS, MAZE_ROWS, parseMaze, tileAt } from "./lib/maze";
export type { GridPosition, Maze, Tile, TileType } from "./lib/maze";

export type { Direction } from "./lib/direction";

export { createSimulation } from "./lib/simulation";
export type {
  Difficulty,
  FruitSnapshot,
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
export type { FruitConfig } from "./lib/fruit";

export {
  DEATH_TICKS,
  FRUIT_SPAWN_PELLETS,
  FRUIT_SPAWN_TILE,
  FRUIT_TICKS,
  frightenedGhostPoints,
  frightenedTicksForLevel,
  fruitForLevel,
  ghostReleasePellets,
  ghostTilesPerTick,
  scatterChaseSchedule,
} from "./lib/tuning";
export type {
  FruitKind,
  FruitSpec,
  GhostId,
  GhostMode,
  GhostPhase,
  GhostPhaseMode,
  GhostStart,
  HouseGhostId,
} from "./lib/tuning";

export const CLASSIC_MAZE = parseMaze(CLASSIC_MAZE_ROWS);
