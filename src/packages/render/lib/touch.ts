import type { Direction } from "../../core";

/** The on-screen d-pad's geometry, in canvas backing pixels. */
export type DpadLayout = {
  readonly cx: number;
  readonly cy: number;
  readonly halfSize: number;
  readonly thickness: number;
};

const MIN_SIZE = 112;
const MAX_SIZE = 300;
const SIZE_FRACTION = 0.34;
const MARGIN_FRACTION = 0.2;
const THICKNESS_FRACTION = 0.34;
/** The centre fraction of the pad that reads as no direction. */
const DEAD_ZONE = 0.22;

const PAD_FILL = "rgba(255, 255, 255, 0.14)";
const PAD_EDGE = "rgba(255, 255, 255, 0.3)";
const ARROW_FILL = "rgba(255, 255, 255, 0.78)";

/**
 * Places the d-pad in the bottom-left corner, sized from the shorter canvas
 * axis and clamped so it stays thumb-sized on a phone and sane on a desktop.
 */
export function dpadLayout(width: number, height: number): DpadLayout {
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.min(width, height) * SIZE_FRACTION));
  const halfSize = size / 2;
  const margin = size * MARGIN_FRACTION;
  return {
    cx: margin + halfSize,
    cy: height - margin - halfSize,
    halfSize,
    thickness: size * THICKNESS_FRACTION,
  };
}

/** Whether a point lands on the pad's square hit area. */
export function insideDpad(x: number, y: number, layout: DpadLayout): boolean {
  return Math.abs(x - layout.cx) <= layout.halfSize && Math.abs(y - layout.cy) <= layout.halfSize;
}

/**
 * The direction a point on the pad steers, from the dominant axis off centre.
 * A point in the dead zone at the middle, or off the pad, steers nothing.
 */
export function dpadDirectionAt(x: number, y: number, layout: DpadLayout): Direction | null {
  if (!insideDpad(x, y, layout)) return null;

  const dx = x - layout.cx;
  const dy = y - layout.cy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < layout.halfSize * DEAD_ZONE) return null;

  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: Direction,
  size: number,
): void {
  const w = size * 0.9;
  ctx.beginPath();
  switch (direction) {
    case "up":
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx - w, cy + size * 0.7);
      ctx.lineTo(cx + w, cy + size * 0.7);
      break;
    case "down":
      ctx.moveTo(cx, cy + size);
      ctx.lineTo(cx - w, cy - size * 0.7);
      ctx.lineTo(cx + w, cy - size * 0.7);
      break;
    case "left":
      ctx.moveTo(cx - size, cy);
      ctx.lineTo(cx + size * 0.7, cy - w);
      ctx.lineTo(cx + size * 0.7, cy + w);
      break;
    case "right":
      ctx.moveTo(cx + size, cy);
      ctx.lineTo(cx - size * 0.7, cy - w);
      ctx.lineTo(cx - size * 0.7, cy + w);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the translucent d-pad in screen pixels, over the scaled Maze. A plus
 * of two bars with an arrow on each arm, so the touch target reads as a
 * direction control rather than part of the board.
 */
export function drawTouchControls(ctx: CanvasRenderingContext2D, layout: DpadLayout): void {
  const { cx, cy, halfSize, thickness } = layout;
  const half = thickness / 2;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = PAD_FILL;
  ctx.fillRect(cx - half, cy - halfSize, thickness, halfSize * 2);
  ctx.fillRect(cx - halfSize, cy - half, halfSize * 2, thickness);

  ctx.strokeStyle = PAD_EDGE;
  ctx.lineWidth = Math.max(1, halfSize * 0.06);
  ctx.strokeRect(cx - half, cy - halfSize, thickness, halfSize * 2);
  ctx.strokeRect(cx - halfSize, cy - half, halfSize * 2, thickness);

  ctx.fillStyle = ARROW_FILL;
  const arrow = halfSize * 0.3;
  const arm = halfSize * 0.62;
  drawArrow(ctx, cx, cy - arm, "up", arrow);
  drawArrow(ctx, cx, cy + arm, "down", arrow);
  drawArrow(ctx, cx - arm, cy, "left", arrow);
  drawArrow(ctx, cx + arm, cy, "right", arrow);

  ctx.restore();
}
