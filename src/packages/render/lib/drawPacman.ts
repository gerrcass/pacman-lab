import { MAZE_COLUMNS } from "../../core";
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
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.fillStyle = COLORS.pacman;

  const facing = FACING[pacman.direction];
  const cy = MAZE_OFFSET_Y + pacman.position.y * TILE_SIZE + TILE_SIZE / 2;
  const drawAt = (tileX: number): void => {
    const cx = MAZE_OFFSET_X + tileX * TILE_SIZE + TILE_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS, facing + MOUTH_ANGLE, facing - MOUTH_ANGLE + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  };

  // Near a tunnel mouth, draw the wrapped copy too so the wrap reads as a slide
  // through the tunnel rather than a teleport across the Maze.
  drawAt(pacman.position.x);
  if (pacman.position.x < 1) drawAt(pacman.position.x + MAZE_COLUMNS);
  else if (pacman.position.x > MAZE_COLUMNS - 1) drawAt(pacman.position.x - MAZE_COLUMNS);
}
