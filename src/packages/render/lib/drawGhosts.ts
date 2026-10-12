import type { Direction, GhostSnapshot } from "../../core";
import { MAZE_COLUMNS, MAZE_ROWS } from "../../core";
import {
  COLORS,
  FRIGHTENED_FLASH_INTERVAL,
  FRIGHTENED_FLASH_TICKS,
  GHOST_COLORS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  TILE_SIZE,
} from "./constants";
import type { Viewport } from "./viewport";

const RADIUS = TILE_SIZE / 2 - 1;
const EYE_OFFSET_X = RADIUS * 0.38;
const EYE_OFFSET_Y = RADIUS * 0.12;
const EYE_RADIUS = RADIUS * 0.34;
const PUPIL_RADIUS = RADIUS * 0.17;

const PUPIL_SHIFT: Readonly<Record<Direction, { x: number; y: number }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** The body colour to paint, or null for an eaten Ghost reduced to eyes. */
function bodyColor(ghost: GhostSnapshot): string | null {
  if (ghost.mode === "eaten") return null;
  if (ghost.frightenedTicksLeft === 0) return GHOST_COLORS[ghost.id];
  const flashing = ghost.frightenedTicksLeft <= FRIGHTENED_FLASH_TICKS;
  const flashOn =
    flashing && Math.floor(ghost.frightenedTicksLeft / FRIGHTENED_FLASH_INTERVAL) % 2 === 1;
  return flashOn ? COLORS.frightenedFlash : COLORS.frightened;
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: GhostSnapshot,
  cx: number,
  cy: number,
): void {
  const color = bodyColor(ghost);

  if (color !== null) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, Math.PI, 0);
    ctx.lineTo(cx + RADIUS, cy + RADIUS * 0.7);
    ctx.lineTo(cx + RADIUS * 0.5, cy + RADIUS * 0.35);
    ctx.lineTo(cx, cy + RADIUS * 0.7);
    ctx.lineTo(cx - RADIUS * 0.5, cy + RADIUS * 0.35);
    ctx.lineTo(cx - RADIUS, cy + RADIUS * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  const eyeColor = color === COLORS.frightenedFlash ? COLORS.ghostEyeFlash : COLORS.ghostEye;
  const shift = PUPIL_SHIFT[ghost.direction];
  const pupilDx = shift.x * RADIUS * 0.22;
  const pupilDy = shift.y * RADIUS * 0.22;
  for (const side of [-1, 1]) {
    const ex = cx + side * EYE_OFFSET_X;
    const ey = cy - EYE_OFFSET_Y;
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(ex, ey, EYE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.ghostPupil;
    ctx.beginPath();
    ctx.arc(ex + pupilDx, ey + pupilDy, PUPIL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draws the four Ghosts at their continuous positions, wrapping at the tunnels. */
export function drawGhosts(
  ctx: CanvasRenderingContext2D,
  ghosts: readonly GhostSnapshot[],
  viewport: Viewport,
): void {
  ctx.save();
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;

  ctx.beginPath();
  ctx.rect(MAZE_OFFSET_X, MAZE_OFFSET_Y, MAZE_COLUMNS * TILE_SIZE, MAZE_ROWS * TILE_SIZE);
  ctx.clip();

  for (const ghost of ghosts) {
    const cy = MAZE_OFFSET_Y + ghost.position.y * TILE_SIZE + TILE_SIZE / 2;
    for (const offset of [-MAZE_COLUMNS, 0, MAZE_COLUMNS]) {
      const cx = MAZE_OFFSET_X + (ghost.position.x + offset) * TILE_SIZE + TILE_SIZE / 2;
      drawGhost(ctx, ghost, cx, cy);
    }
  }

  ctx.restore();
}
