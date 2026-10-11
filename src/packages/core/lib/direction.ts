export type Direction = "up" | "down" | "left" | "right";

export type Vector = {
  readonly x: number;
  readonly y: number;
};

export const DIRECTION_VECTORS: Readonly<Record<Direction, Vector>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES: Readonly<Record<Direction, Direction>> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function opposite(direction: Direction): Direction {
  return OPPOSITES[direction];
}
