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

/**
 * The dominant-axis direction of a delta, or null when its larger component is
 * below `minMagnitude`. Used to turn a swipe or an off-centre press into a
 * direction; a tie resolves to the horizontal axis.
 */
export function directionFromDelta(dx: number, dy: number, minMagnitude: number): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minMagnitude) return null;

  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
