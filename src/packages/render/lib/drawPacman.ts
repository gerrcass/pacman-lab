import { DEATH_TICKS, MAZE_COLUMNS, MAZE_ROWS } from "../../core";
import type { Direction, Snapshot } from "../../core";
import { COLORS, MAZE_OFFSET_X, MAZE_OFFSET_Y, TILE_SIZE } from "./constants";
import { applyPixelTransform } from "./transform";
import type { Viewport } from "./viewport";

const RADIUS = TILE_SIZE / 2 - 0.5;
const MOUTH_ANGLE = Math.PI / 5;

const FACING: Readonly<Record<Direction, number>> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/** The mouth half-angle at a point through the death animation: it opens from
 * the resting mouth until PacMan has swallowed himself and vanished. */
function mouthAngle(deathTicksLeft: number): number {
  const progress = 1 - deathTicksLeft / DEATH_TICKS;
  return MOUTH_ANGLE + progress * (Math.PI - MOUTH_ANGLE);
}

/** Fills one PacMan wedge, a circle with a bite of `mouth` radians out of it. */
export function drawPacmanWedge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  facing: number,
  mouth: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, facing + mouth, facing - mouth + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

export function drawPacman(
  ctx: CanvasRenderingContext2D,
  snapshot: Snapshot,
  viewport: Viewport,
): void {
  // The death animation ended with PacMan gone; leave him gone on the game over screen.
  if (snapshot.state === "gameOver") return;

  const pacman = snapshot.pacman;
  ctx.save();
  applyPixelTransform(ctx, viewport);

  // Keep every copy inside the Maze, so the wrapped sprite near a tunnel mouth
  // never leaks into the letterbox beside the Maze.
  ctx.beginPath();
  ctx.rect(MAZE_OFFSET_X, MAZE_OFFSET_Y, MAZE_COLUMNS * TILE_SIZE, MAZE_ROWS * TILE_SIZE);
  ctx.clip();

  ctx.fillStyle = COLORS.pacman;
  const facing = FACING[pacman.direction];
  const mouth = snapshot.state === "death" ? mouthAngle(snapshot.deathTicksLeft) : MOUTH_ANGLE;
  const cy = MAZE_OFFSET_Y + pacman.position.y * TILE_SIZE + TILE_SIZE / 2;
  const drawAt = (tileX: number): void => {
    const cx = MAZE_OFFSET_X + tileX * TILE_SIZE + TILE_SIZE / 2;
    drawPacmanWedge(ctx, cx, cy, RADIUS, facing, mouth);
  };

  // Near a tunnel mouth, draw the wrapped copies too so the wrap reads as a slide
  // through the tunnel rather than a teleport across the Maze. Clipping removes
  // the copies that fall outside the Maze.
  for (const offset of [-MAZE_COLUMNS, 0, MAZE_COLUMNS]) {
    drawAt(pacman.position.x + offset);
  }

  ctx.restore();
}
