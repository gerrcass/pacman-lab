import type { PelletMarker } from "../../core";
import {
  COLORS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  PELLET_RADIUS,
  POWER_PELLET_RADIUS,
  TILE_SIZE,
} from "./constants";
import type { Viewport } from "./viewport";

/** Draws the Pellets still left in the Maze. */
export function drawPellets(
  ctx: CanvasRenderingContext2D,
  pellets: readonly PelletMarker[],
  viewport: Viewport,
): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = COLORS.pellet;

  for (const { tile, kind } of pellets) {
    const cx = MAZE_OFFSET_X + tile.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = MAZE_OFFSET_Y + tile.y * TILE_SIZE + TILE_SIZE / 2;
    const radius = kind === "powerPellet" ? POWER_PELLET_RADIUS : PELLET_RADIUS;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
