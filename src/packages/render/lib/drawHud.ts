import type { Snapshot } from "../../core";
import { COLORS, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./constants";
import { drawPacmanWedge } from "./drawPacman";
import { drawText, drawTextCentered, textWidth } from "./font";
import type { Viewport } from "./viewport";

const FONT = { pixel: 2, color: COLORS.hud } as const;
const MARGIN = 8;
const LABEL_Y = 2;
const VALUE_Y = 13;
const CENTER_X = VIRTUAL_WIDTH / 2;

const LIFE_RADIUS = 4;
const LIFE_MOUTH = Math.PI / 5;
const LIFE_Y = VIRTUAL_HEIGHT - 8;
const LIFE_START_X = 10;
const LIFE_GAP = 12;

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Draws the HUD: score, high score, Level, and one PacMan icon per life left. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  snapshot: Snapshot,
  viewport: Viewport,
  highScore: number,
): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;

  const score = pad(snapshot.score, 6);
  drawText(ctx, "SCORE", MARGIN, LABEL_Y, FONT);
  drawText(ctx, score, MARGIN, VALUE_Y, FONT);

  const highLabel = "HIGH SCORE";
  const highValue = pad(highScore, 6);
  drawTextCentered(ctx, highLabel, CENTER_X, LABEL_Y, FONT);
  drawTextCentered(ctx, highValue, CENTER_X, VALUE_Y, FONT);

  const levelLabel = "LEVEL";
  const level = pad(snapshot.level, 2);
  drawText(
    ctx,
    levelLabel,
    VIRTUAL_WIDTH - MARGIN - textWidth(levelLabel, FONT.pixel),
    LABEL_Y,
    FONT,
  );
  drawText(ctx, level, VIRTUAL_WIDTH - MARGIN - textWidth(level, FONT.pixel), VALUE_Y, FONT);

  ctx.fillStyle = COLORS.pacman;
  for (let i = 0; i < snapshot.lives; i += 1) {
    drawPacmanWedge(ctx, LIFE_START_X + i * LIFE_GAP, LIFE_Y, LIFE_RADIUS, Math.PI, LIFE_MOUTH);
  }
}
