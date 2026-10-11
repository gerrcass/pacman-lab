import { CLASSIC_MAZE_ROWS, parseMaze } from "./lib/maze";

export { CLASSIC_MAZE_ROWS, MAZE_COLUMNS, MAZE_ROWS, parseMaze } from "./lib/maze";
export type { GridPosition, Maze, Tile, TileType } from "./lib/maze";

export const CLASSIC_MAZE = parseMaze(CLASSIC_MAZE_ROWS);
