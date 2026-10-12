import type { FruitKind, FruitSnapshot } from "../../core";
import { FRUIT_ACCENTS, FRUIT_COLORS, MAZE_OFFSET_X, MAZE_OFFSET_Y, TILE_SIZE } from "./constants";
import { applyPixelTransform } from "./transform";
import type { Viewport } from "./viewport";

const RADIUS = 4.5;

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A small leaf beside the top of the Fruit. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = FRUIT_ACCENTS.leaf;
  ctx.beginPath();
  ctx.ellipse(x + 3, y - RADIUS - 1, 3, 1.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCherry(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  circle(ctx, x - 3, y + 2, 3, FRUIT_COLORS.cherry);
  circle(ctx, x + 3, y + 2, 3, FRUIT_COLORS.cherry);
  ctx.strokeStyle = FRUIT_ACCENTS.stem;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.quadraticCurveTo(x, y - RADIUS - 4, x + 3, y - RADIUS - 3);
  ctx.moveTo(x + 3, y);
  ctx.quadraticCurveTo(x + 2, y - RADIUS - 3, x + 3, y - RADIUS - 3);
  ctx.stroke();
}

function drawStrawberry(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = FRUIT_COLORS.strawberry;
  ctx.beginPath();
  ctx.moveTo(x - RADIUS, y - 2);
  ctx.quadraticCurveTo(x - RADIUS, y + RADIUS, x, y + RADIUS + 1);
  ctx.quadraticCurveTo(x + RADIUS, y + RADIUS, x + RADIUS, y - 2);
  ctx.arc(x, y - 2, RADIUS, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  leaf(ctx, x - 2, y - 2);
  leaf(ctx, x - 3, y - 1);
}

function drawOrange(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  circle(ctx, x, y + 1, RADIUS, FRUIT_COLORS.orange);
  leaf(ctx, x - 2, y - RADIUS + 1);
}

function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  circle(ctx, x, y + 1, RADIUS, FRUIT_COLORS.apple);
  ctx.fillStyle = FRUIT_ACCENTS.stemDark;
  ctx.fillRect(x - 0.75, y - RADIUS - 2, 1.5, 3);
  leaf(ctx, x - 1, y - RADIUS - 1);
}

function drawMelon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  circle(ctx, x, y + 1, RADIUS, FRUIT_COLORS.melon);
  ctx.strokeStyle = FRUIT_ACCENTS.stripe;
  ctx.lineWidth = 1;
  for (const dx of [-2, 0, 2]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y - RADIUS + 1);
    ctx.quadraticCurveTo(x + dx * 1.4, y + 1, x + dx, y + RADIUS);
    ctx.stroke();
  }
}

function drawGalaxian(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = FRUIT_COLORS.galaxian;
  ctx.beginPath();
  ctx.moveTo(x, y - RADIUS - 2);
  ctx.lineTo(x - RADIUS - 1, y + RADIUS);
  ctx.lineTo(x - 1.5, y + 1);
  ctx.lineTo(x, y + RADIUS + 1);
  ctx.lineTo(x + 1.5, y + 1);
  ctx.lineTo(x + RADIUS + 1, y + RADIUS);
  ctx.closePath();
  ctx.fill();
}

function drawBell(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = FRUIT_COLORS.bell;
  ctx.beginPath();
  ctx.moveTo(x - RADIUS, y + 2);
  ctx.quadraticCurveTo(x - RADIUS, y - RADIUS - 1, x, y - RADIUS - 1);
  ctx.quadraticCurveTo(x + RADIUS, y - RADIUS - 1, x + RADIUS, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - RADIUS - 1, y + 2, RADIUS * 2 + 2, 1.5);
  circle(ctx, x, y + 4.5, 1.4, FRUIT_ACCENTS.stemDark);
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = FRUIT_COLORS.key;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 3, 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = FRUIT_COLORS.key;
  ctx.fillRect(x - 0.75, y - 1, 1.5, 6);
  ctx.fillRect(x + 0.75, y + 2, 2.5, 1.2);
  ctx.fillRect(x + 0.75, y + 4, 2, 1.2);
}

const DRAWERS: Readonly<
  Record<FruitKind, (ctx: CanvasRenderingContext2D, x: number, y: number) => void>
> = {
  cherry: drawCherry,
  strawberry: drawStrawberry,
  orange: drawOrange,
  apple: drawApple,
  melon: drawMelon,
  galaxian: drawGalaxian,
  bell: drawBell,
  key: drawKey,
};

/** Draws the Fruit centered on the two tiles it occupies, if any. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: FruitSnapshot | null,
  viewport: Viewport,
): void {
  if (fruit === null) return;
  applyPixelTransform(ctx, viewport);

  const cx = MAZE_OFFSET_X + (fruit.tile.x + 1) * TILE_SIZE;
  const cy = MAZE_OFFSET_Y + (fruit.tile.y + 0.5) * TILE_SIZE;
  DRAWERS[fruit.kind](ctx, cx, cy);
}
