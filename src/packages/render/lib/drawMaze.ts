import { tileAt } from "../../core";
import type { Maze, TileType } from "../../core";
import {
  COLORS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  PELLET_RADIUS,
  POWER_PELLET_RADIUS,
  TILE_SIZE,
} from "./constants";
import type { Viewport } from "./viewport";

function isWall(maze: Maze, x: number, y: number): boolean {
  const tile = tileAt(maze, x, y);
  return tile === undefined || tile === "wall";
}

function drawWall(ctx: CanvasRenderingContext2D, maze: Maze, x: number, y: number): void {
  const px = MAZE_OFFSET_X + x * TILE_SIZE;
  const py = MAZE_OFFSET_Y + y * TILE_SIZE;

  ctx.beginPath();
  if (!isWall(maze, x, y - 1)) {
    ctx.moveTo(px, py);
    ctx.lineTo(px + TILE_SIZE, py);
  }
  if (!isWall(maze, x, y + 1)) {
    ctx.moveTo(px, py + TILE_SIZE);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
  }
  if (!isWall(maze, x - 1, y)) {
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + TILE_SIZE);
  }
  if (!isWall(maze, x + 1, y)) {
    ctx.moveTo(px + TILE_SIZE, py);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
  }
  ctx.stroke();
}

function drawPellet(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number): void {
  const cx = MAZE_OFFSET_X + x * TILE_SIZE + TILE_SIZE / 2;
  const cy = MAZE_OFFSET_Y + y * TILE_SIZE + TILE_SIZE / 2;
  const radius = type === "powerPellet" ? POWER_PELLET_RADIUS : PELLET_RADIUS;

  ctx.fillStyle = COLORS.pellet;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const px = MAZE_OFFSET_X + x * TILE_SIZE;
  const py = MAZE_OFFSET_Y + y * TILE_SIZE;

  ctx.fillStyle = COLORS.door;
  ctx.fillRect(px, py + TILE_SIZE * 0.3, TILE_SIZE, TILE_SIZE * 0.4);
}

export function drawMaze(ctx: CanvasRenderingContext2D, maze: Maze, viewport: Viewport): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = 1;

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const type = tileAt(maze, x, y);
      if (type === "wall") {
        drawWall(ctx, maze, x, y);
      } else if (type === "pellet" || type === "powerPellet") {
        drawPellet(ctx, type, x, y);
      } else if (type === "door") {
        drawDoor(ctx, x, y);
      }
    }
  }
}
