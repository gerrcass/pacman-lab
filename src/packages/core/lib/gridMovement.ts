import { DIRECTION_VECTORS } from "./direction";
import type { Direction } from "./direction";
import { tileAt } from "./maze";
import type { GridPosition, Maze } from "./maze";

export const EPSILON = 1e-6;

/** A continuous position in tile units that callers advance in place. */
export type Position = {
  x: number;
  y: number;
};

export function isCentered(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPSILON;
}

export function wrapX(width: number, x: number): number {
  return ((x % width) + width) % width;
}

/** A tile the walker may occupy: corridors and the tiles carrying Pellets. */
export function isWalkable(maze: Maze, x: number, y: number): boolean {
  const type = tileAt(maze, wrapX(maze.width, x), y);
  return type === "empty" || type === "pellet" || type === "powerPellet";
}

/** The in-bounds tile nearest a continuous position, x wrapped around the tunnels. */
export function centeredTile(position: GridPosition, width: number): GridPosition {
  return { x: wrapX(width, Math.round(position.x)), y: Math.round(position.y) };
}

/** Distance from a position to the next tile center in `direction`. */
export function distanceToNextCenter(position: GridPosition, direction: Direction): number {
  const vector = DIRECTION_VECTORS[direction];
  if (vector.x > 0) return isCentered(position.x) ? 1 : Math.ceil(position.x) - position.x;
  if (vector.x < 0) return isCentered(position.x) ? 1 : position.x - Math.floor(position.x);
  if (vector.y > 0) return isCentered(position.y) ? 1 : Math.ceil(position.y) - position.y;
  return isCentered(position.y) ? 1 : position.y - Math.floor(position.y);
}

/** Moves a position `distance` tiles in `direction`, wrapping x through the tunnels. */
export function advancePosition(
  position: Position,
  direction: Direction,
  distance: number,
  width: number,
): void {
  const vector = DIRECTION_VECTORS[direction];
  position.x = wrapX(width, position.x + vector.x * distance);
  position.y += vector.y * distance;
}
