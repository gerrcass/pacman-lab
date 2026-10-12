import type { Snapshot } from "../../core";
import { COLORS, VIRTUAL_WIDTH } from "./constants";
import { drawText, textWidth } from "./font";
import type { Viewport } from "./viewport";

const FONT = { pixel: 2, color: COLORS.hud } as const;
const MARGIN = 8;
const LABEL_Y = 2;
const VALUE_Y = 13;

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Draws the HUD band above the Maze: score on the left, Level on the right. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  snapshot: Snapshot,
  viewport: Viewport,
): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.imageSmoothingEnabled = false;

  const score = pad(snapshot.score, 6);
  drawText(ctx, "SCORE", MARGIN, LABEL_Y, FONT);
  drawText(ctx, score, MARGIN, VALUE_Y, FONT);

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
}
