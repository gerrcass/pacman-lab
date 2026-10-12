import type { Viewport } from "./viewport";

/** Sets the pixel-art transform: whole-pixel scaling, no image smoothing. */
export function applyPixelTransform(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;
}
