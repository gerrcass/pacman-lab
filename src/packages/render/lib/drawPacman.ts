import type { Direction, PacmanSnapshot } from "../../core";
import { COLORS, MAZE_OFFSET_X, MAZE_OFFSET_Y, TILE_SIZE } from "./constants";
import type { Viewport } from "./viewport";

const RADIUS = TILE_SIZE / 2 - 0.5;
const MOUTH_ANGLE = Math.PI / 5;

const FACING: Readonly<Record<Direction, number>> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export function drawPacman(
  ctx: CanvasRenderingContext2D,
  pacman: PacmanSnapshot,
  viewport: Viewport,
): void {
  const cx = MAZE_OFFSET_X + pacman.position.x * TILE_SIZE + TILE_SIZE / 2;
  const cy = MAZE_OFFSET_Y + pacman.position.y * TILE_SIZE + TILE_SIZE / 2;
  const facing = FACING[pacman.direction];

  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.fillStyle = COLORS.pacman;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, RADIUS, facing + MOUTH_ANGLE, facing - MOUTH_ANGLE + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}
