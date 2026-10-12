import { COLORS, VIRTUAL_WIDTH } from "./constants";
import { drawTextCentered } from "./font";
import type { FontStyle } from "./font";
import type { Viewport } from "./viewport";

const CENTER_X = VIRTUAL_WIDTH / 2;

const WORDMARK: FontStyle = { pixel: 5, color: COLORS.pacman };
const PROMPT: FontStyle = { pixel: 2, color: COLORS.hud };
const BANNER: FontStyle = { pixel: 3, color: COLORS.pacman };
const OVERLAY: FontStyle = { pixel: 3, color: COLORS.hud };
const GAME_OVER: FontStyle = { pixel: 4, color: "#ff0000" };
const GAME_OVER_DETAIL: FontStyle = { pixel: 2, color: COLORS.hud };

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function applyScreenTransform(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;
}

function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** The startup screen: a black field with the wordmark, before the title. */
export function drawBoot(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  clearCanvas(ctx);
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "PAC-MAN", CENTER_X, 130, WORDMARK);
}

/** The title screen: the wordmark, the start prompt, and the high score. */
export function drawTitle(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  highScore: number,
): void {
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "PAC-MAN", CENTER_X, 96, WORDMARK);
  drawTextCentered(ctx, "PRESS SPACE", CENTER_X, 168, PROMPT);
  drawTextCentered(ctx, `HIGH SCORE ${pad(highScore, 6)}`, CENTER_X, 196, PROMPT);
}

/** The READY prompt shown in the Maze before each Level. */
export function drawReady(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "READY!", CENTER_X, 160, BANNER);
}

/** The PAUSED banner shown over a frozen board. */
export function drawPaused(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "PAUSED", CENTER_X, 148, OVERLAY);
}

/** The LEVEL CLEAR banner shown over the emptied Maze between Levels. */
export function drawLevelClear(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "LEVEL CLEAR", CENTER_X, 148, BANNER);
}

/** The game over screen: the run score and the persisted high score. */
export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  score: number,
  highScore: number,
): void {
  applyScreenTransform(ctx, viewport);
  drawTextCentered(ctx, "GAME OVER", CENTER_X, 120, GAME_OVER);
  drawTextCentered(ctx, `SCORE ${pad(score, 6)}`, CENTER_X, 168, GAME_OVER_DETAIL);
  drawTextCentered(ctx, `HIGH SCORE ${pad(highScore, 6)}`, CENTER_X, 188, GAME_OVER_DETAIL);
}

/** The black fade between screens, `alpha` from 1 (black) to 0 (clear). */
export function drawTransition(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  clearCanvas(ctx);
  ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;
}
