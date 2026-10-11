import { MAZE_COLUMNS, MAZE_ROWS } from "../../core";
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
  ctx.save();
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);

  // Keep every copy inside the Maze, so the wrapped sprite near a tunnel mouth
  // never leaks into the letterbox beside the Maze.
  ctx.beginPath();
  ctx.rect(MAZE_OFFSET_X, MAZE_OFFSET_Y, MAZE_COLUMNS * TILE_SIZE, MAZE_ROWS * TILE_SIZE);
  ctx.clip();

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

  // Near a tunnel mouth, draw the wrapped copies too so the wrap reads as a slide
  // through the tunnel rather than a teleport across the Maze. Clipping removes
  // the copies that fall outside the Maze.
  for (const offset of [-MAZE_COLUMNS, 0, MAZE_COLUMNS]) {
    drawAt(pacman.position.x + offset);
  }

  ctx.restore();
}
