import { DIRECTION_VECTORS } from "./direction";
import type { Direction } from "./direction";
import type { GridPosition } from "./maze";
import { SCATTER_TARGETS } from "./tuning";
import type { GhostId } from "./tuning";

/** Where PacMan is and which way he faces, the reference every Chase rule needs. */
export type PacManPose = {
  readonly tile: GridPosition;
  readonly direction: Direction;
};

/** Clyde breaks off to his corner within this many tiles (arcade uses 8). */
const CLYDE_BREAK_OFF_DISTANCE = 8;

/**
 * A tile `count` ahead of `tile` in `direction`. When the direction is up,
 * `count` is also subtracted from x, reproducing the arcade's Pinky/Inky
 * "overflow" quirk.
 */
function ahead(tile: GridPosition, direction: Direction, count: number): GridPosition {
  if (direction === "up") return { x: tile.x - count, y: tile.y - count };
  const vector = DIRECTION_VECTORS[direction];
  return { x: tile.x + vector.x * count, y: tile.y + vector.y * count };
}

export function scatterTarget(id: GhostId): GridPosition {
  return { ...SCATTER_TARGETS[id] };
}

/**
 * Each Ghost's Chase target, per the arcade rules: Blinky aims at PacMan;
 * Pinky four tiles ahead of him; Inky at the vector doubled from Blinky
 * through two tiles ahead of PacMan; Clyde at PacMan when far, his corner when
 * close.
 */
export function chaseTarget(
  id: GhostId,
  ghostTile: GridPosition,
  pacman: PacManPose,
  blinkyTile: GridPosition,
): GridPosition {
  switch (id) {
    case "blinky":
      return { ...pacman.tile };
    case "pinky":
      return ahead(pacman.tile, pacman.direction, 4);
    case "inky": {
      const pivot = ahead(pacman.tile, pacman.direction, 2);
      return { x: pivot.x + (pivot.x - blinkyTile.x), y: pivot.y + (pivot.y - blinkyTile.y) };
    }
    case "clyde": {
      const dx = ghostTile.x - pacman.tile.x;
      const dy = ghostTile.y - pacman.tile.y;
      const far = dx * dx + dy * dy >= CLYDE_BREAK_OFF_DISTANCE * CLYDE_BREAK_OFF_DISTANCE;
      return far ? { ...pacman.tile } : scatterTarget("clyde");
    }
  }
}
