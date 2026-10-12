import { directionFromDelta } from "../../core";
import type { Direction } from "../../core";
import { VIRTUAL_HEIGHT } from "./constants";
import { applyPixelTransform } from "./transform";
import type { Viewport } from "./viewport";

/** The d-pad's geometry on the 224x288 virtual grid. */
export type DpadLayout = {
  readonly cx: number;
  readonly cy: number;
  readonly halfSize: number;
  readonly thickness: number;
};

const HALF_SIZE = 26;
const MARGIN = 10;
const THICKNESS = 16;
/** The centre fraction of the pad that reads as no direction. */
const DEAD_ZONE = 0.22;

/** The pad sits in the bottom-left, clear of the life row along the bottom. */
export const DPAD_LAYOUT: DpadLayout = {
  cx: MARGIN + HALF_SIZE,
  cy: VIRTUAL_HEIGHT - MARGIN - HALF_SIZE,
  halfSize: HALF_SIZE,
  thickness: THICKNESS,
};

const PAD_FILL = "rgba(255, 255, 255, 0.16)";
const ARROW_FILL = "rgba(255, 255, 255, 0.72)";

/** Whether a point on the virtual grid lands on the pad's square hit area. */
export function insideDpad(x: number, y: number, layout: DpadLayout): boolean {
  return Math.abs(x - layout.cx) <= layout.halfSize && Math.abs(y - layout.cy) <= layout.halfSize;
}

/**
 * The direction a point on the pad steers, from the dominant axis off centre.
 * A point in the dead zone at the middle, or off the pad, steers nothing.
 */
export function dpadDirectionAt(x: number, y: number, layout: DpadLayout): Direction | null {
  if (!insideDpad(x, y, layout)) return null;
  return directionFromDelta(x - layout.cx, y - layout.cy, layout.halfSize * DEAD_ZONE);
}

/** One blocky arrowhead, built from rows so it stays crisp pixel art. */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: Direction,
  inner: number,
  outer: number,
  halfWidth: number,
): void {
  for (let d = inner; d <= outer; d += 1) {
    const half = Math.round((halfWidth * (outer - d)) / (outer - inner));
    const width = half * 2 + 1;
    switch (direction) {
      case "up":
        ctx.fillRect(cx - half, cy - d, width, 1);
        break;
      case "down":
        ctx.fillRect(cx - half, cy + d, width, 1);
        break;
      case "left":
        ctx.fillRect(cx - d, cy - half, 1, width);
        break;
      case "right":
        ctx.fillRect(cx + d, cy - half, 1, width);
        break;
    }
  }
}

/**
 * Draws the translucent d-pad over the Maze, snapped to the same virtual pixel
 * grid as the rest of the game so it stays crisp at any integer scale. A plus
 * of two bars with a blocky arrow on each arm.
 */
export function drawTouchControls(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  layout: DpadLayout,
): void {
  applyPixelTransform(ctx, viewport);

  const { cx, cy, halfSize, thickness } = layout;
  const half = thickness / 2;

  ctx.fillStyle = PAD_FILL;
  ctx.fillRect(cx - half, cy - halfSize, thickness, halfSize * 2);
  ctx.fillRect(cx - halfSize, cy - half, halfSize * 2, thickness);

  ctx.fillStyle = ARROW_FILL;
  const inner = Math.round(halfSize * 0.42);
  const outer = Math.round(halfSize * 0.86);
  const halfWidth = Math.max(2, Math.round(halfSize * 0.26));
  drawArrow(ctx, cx, cy, "up", inner, outer, halfWidth);
  drawArrow(ctx, cx, cy, "down", inner, outer, halfWidth);
  drawArrow(ctx, cx, cy, "left", inner, outer, halfWidth);
  drawArrow(ctx, cx, cy, "right", inner, outer, halfWidth);
}
