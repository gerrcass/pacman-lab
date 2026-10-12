import {
  COLORS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  TILE_SIZE,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from "./constants";
import { applyPixelTransform } from "./transform";
import type { Viewport } from "./viewport";

/**
 * One Pellet-eat particle, in tile units so the effects survive a resize. The
 * app's effects service emits these; the render layer only draws them.
 */
export type Particle = {
  /** Centre position in tile units; integer tile centres sit at n + 0.5. */
  readonly x: number;
  readonly y: number;
  /** Velocity in tiles per tick. */
  readonly vx: number;
  readonly vy: number;
  /** Draw radius in tile units. */
  readonly radius: number;
  /** Ticks of life left. */
  readonly life: number;
  /** The life it started with, so the fade can use the ratio. */
  readonly maxLife: number;
  /** Whether this came from a Power Pellet, drawn larger and brighter. */
  readonly power: boolean;
};

function clampAlpha(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Draws the Pellet-eat particles, fading out as their life runs down. */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly Particle[],
  viewport: Viewport,
): void {
  if (particles.length === 0) return;

  applyPixelTransform(ctx, viewport);
  for (const particle of particles) {
    ctx.globalAlpha = clampAlpha(particle.life / particle.maxLife);
    ctx.fillStyle = particle.power ? COLORS.powerParticle : COLORS.pellet;
    ctx.beginPath();
    ctx.arc(
      MAZE_OFFSET_X + particle.x * TILE_SIZE,
      MAZE_OFFSET_Y + particle.y * TILE_SIZE,
      particle.radius * TILE_SIZE,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Scanline spacing and opacity, and the corner darkening, of the CRT filter. */
const CRT_SCANLINE_STEP = 2;
const CRT_SCANLINE_ALPHA = 0.16;
const CRT_VIGNETTE = 0.35;

/**
 * Draws the optional CRT filter: a scanline grid over the field and a soft
 * vignette in screen space. Off by default, so the caller only draws it when on.
 */
export function drawCrt(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyPixelTransform(ctx, viewport);
  ctx.globalAlpha = CRT_SCANLINE_ALPHA;
  ctx.fillStyle = COLORS.background;
  for (let y = 0; y < VIRTUAL_HEIGHT; y += CRT_SCANLINE_STEP) {
    ctx.fillRect(0, y, VIRTUAL_WIDTH, 1);
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${CRT_VIGNETTE})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
