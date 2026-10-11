import type { Maze } from "../../core";
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
  if (x < 0 || y < 0 || x >= maze.width || y >= maze.height) return true;
  return maze.tiles[y]?.[x]?.type === "wall";
}

function drawWalls(ctx: CanvasRenderingContext2D, maze: Maze): void {
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = 1;

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (maze.tiles[y]?.[x]?.type !== "wall") continue;

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
  }
}

function drawPellets(ctx: CanvasRenderingContext2D, maze: Maze): void {
  ctx.fillStyle = COLORS.pellet;

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const type = maze.tiles[y]?.[x]?.type;
      if (type !== "pellet" && type !== "powerPellet") continue;

      const cx = MAZE_OFFSET_X + x * TILE_SIZE + TILE_SIZE / 2;
      const cy = MAZE_OFFSET_Y + y * TILE_SIZE + TILE_SIZE / 2;
      const radius = type === "powerPellet" ? POWER_PELLET_RADIUS : PELLET_RADIUS;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDoors(ctx: CanvasRenderingContext2D, maze: Maze): void {
  ctx.fillStyle = COLORS.door;

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (maze.tiles[y]?.[x]?.type !== "door") continue;
      const px = MAZE_OFFSET_X + x * TILE_SIZE;
      const py = MAZE_OFFSET_Y + y * TILE_SIZE;
      ctx.fillRect(px, py + TILE_SIZE * 0.3, TILE_SIZE, TILE_SIZE * 0.4);
    }
  }
}

export function drawMaze(ctx: CanvasRenderingContext2D, maze: Maze, viewport: Viewport): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;

  drawWalls(ctx, maze);
  drawPellets(ctx, maze);
  drawDoors(ctx, maze);
}
