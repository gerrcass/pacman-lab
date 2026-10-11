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

export function opposite(direction: Direction): Direction {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}
