import { COLORS, VIRTUAL_WIDTH } from "./constants";
import { padNumber } from "./format";
import { drawTextCentered } from "./font";
import type { FontStyle } from "./font";
import { applyPixelTransform } from "./transform";
import type { Viewport } from "./viewport";

const CENTER_X = VIRTUAL_WIDTH / 2;

const WORDMARK_TEXT = "PAC-MAN";
const PROMPT_TEXT = "PRESS SPACE";
const READY_TEXT = "READY!";
const PAUSED_TEXT = "PAUSED";
const LEVEL_CLEAR_TEXT = "LEVEL CLEAR";
const GAME_OVER_TEXT = "GAME OVER";
const SCORE_LABEL = "SCORE";
const HIGH_SCORE_LABEL = "HIGH SCORE";

/**
 * Every static label the screens draw. The font test checks each one against
 * the glyph table, so a new screen with an unmapped character fails the test
 * instead of drawing a blank cell.
 */
export const SCREEN_LABELS = [
  WORDMARK_TEXT,
  PROMPT_TEXT,
  READY_TEXT,
  PAUSED_TEXT,
  LEVEL_CLEAR_TEXT,
  GAME_OVER_TEXT,
  SCORE_LABEL,
  HIGH_SCORE_LABEL,
];

const WORDMARK: FontStyle = { pixel: 5, color: COLORS.pacman };
const PROMPT: FontStyle = { pixel: 2, color: COLORS.hud };
const BANNER: FontStyle = { pixel: 3, color: COLORS.pacman };
const OVERLAY: FontStyle = { pixel: 3, color: COLORS.hud };
const GAME_OVER: FontStyle = { pixel: 4, color: "#ff0000" };
const GAME_OVER_DETAIL: FontStyle = { pixel: 2, color: COLORS.hud };

function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** The startup screen: a black field with the wordmark, before the title. */
export function drawBoot(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  clearCanvas(ctx);
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, WORDMARK_TEXT, CENTER_X, 130, WORDMARK);
}

/** The title screen: the wordmark, the start prompt, and the high score. */
export function drawTitle(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  highScore: number,
): void {
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, WORDMARK_TEXT, CENTER_X, 96, WORDMARK);
  drawTextCentered(ctx, PROMPT_TEXT, CENTER_X, 168, PROMPT);
  drawTextCentered(ctx, `${HIGH_SCORE_LABEL} ${padNumber(highScore, 6)}`, CENTER_X, 196, PROMPT);
}

/** The READY prompt shown in the Maze before each Level. */
export function drawReady(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, READY_TEXT, CENTER_X, 160, BANNER);
}

/** The PAUSED banner shown over a frozen board. */
export function drawPaused(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, PAUSED_TEXT, CENTER_X, 148, OVERLAY);
}

/** The LEVEL CLEAR banner shown over the emptied Maze between Levels. */
export function drawLevelClear(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, LEVEL_CLEAR_TEXT, CENTER_X, 148, BANNER);
}

/** The game over screen: the run score, the persisted high score, and how to play again. */
export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  score: number,
  highScore: number,
): void {
  applyPixelTransform(ctx, viewport);
  drawTextCentered(ctx, GAME_OVER_TEXT, CENTER_X, 120, GAME_OVER);
  drawTextCentered(ctx, `${SCORE_LABEL} ${padNumber(score, 6)}`, CENTER_X, 168, GAME_OVER_DETAIL);
  drawTextCentered(
    ctx,
    `${HIGH_SCORE_LABEL} ${padNumber(highScore, 6)}`,
    CENTER_X,
    188,
    GAME_OVER_DETAIL,
  );
  drawTextCentered(ctx, PROMPT_TEXT, CENTER_X, 214, PROMPT);
}

/**
 * The black fade between screens, `alpha` from 1 (black) to 0 (clear). Drawn as
 * a translucent layer over the frame the caller already rendered, so the new
 * screen shows through as the fade falls.
 */
export function drawTransition(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;
}
