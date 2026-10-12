export type FontStyle = {
  /** Size of one font pixel, in virtual pixels. */
  readonly pixel: number;
  readonly color: string;
};

export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;
const GLYPH_SPACING = 1;

/** A 3x5 bitmap font: each glyph is five rows of three cells, `#` a lit pixel. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  "0": ["###", "# #", "# #", "# #", "###"],
  "1": [" # ", "## ", " # ", " # ", "###"],
  "2": ["###", "  #", "###", "#  ", "###"],
  "3": ["###", "  #", "###", "  #", "###"],
  "4": ["# #", "# #", "###", "  #", "  #"],
  "5": ["###", "#  ", "###", "  #", "###"],
  "6": ["###", "#  ", "###", "# #", "###"],
  "7": ["###", "  #", "  #", "  #", "  #"],
  "8": ["###", "# #", "###", "# #", "###"],
  "9": ["###", "# #", "###", "  #", "###"],
  A: ["###", "# #", "###", "# #", "# #"],
  B: ["## ", "# #", "## ", "# #", "## "],
  C: ["###", "#  ", "#  ", "#  ", "###"],
  D: ["## ", "# #", "# #", "# #", "## "],
  E: ["###", "#  ", "###", "#  ", "###"],
  F: ["###", "#  ", "###", "#  ", "#  "],
  G: ["###", "#  ", "# #", "# #", "###"],
  H: ["# #", "# #", "###", "# #", "# #"],
  I: ["###", " # ", " # ", " # ", "###"],
  J: ["  #", "  #", "  #", "# #", "###"],
  K: ["# #", "# #", "## ", "# #", "# #"],
  L: ["#  ", "#  ", "#  ", "#  ", "###"],
  M: ["# #", "###", "###", "# #", "# #"],
  N: ["# #", "###", "# #", "# #", "# #"],
  O: ["###", "# #", "# #", "# #", "###"],
  P: ["###", "# #", "###", "#  ", "#  "],
  Q: ["###", "# #", "# #", "###", "  #"],
  R: ["###", "# #", "###", "## ", "# #"],
  S: ["###", "#  ", "###", "  #", "###"],
  T: ["###", " # ", " # ", " # ", " # "],
  U: ["# #", "# #", "# #", "# #", "###"],
  V: ["# #", "# #", "# #", "# #", " # "],
  W: ["# #", "# #", "###", "###", "# #"],
  X: ["# #", "# #", " # ", "# #", "# #"],
  Y: ["# #", "# #", "###", " # ", " # "],
  Z: ["###", "  #", " # ", "#  ", "###"],
  " ": ["   ", "   ", "   ", "   ", "   "],
  "-": ["   ", "   ", "###", "   ", "   "],
};

export function textWidth(text: string, pixel: number): number {
  if (text.length === 0) return 0;
  return text.length * GLYPH_WIDTH * pixel + (text.length - 1) * GLYPH_SPACING * pixel;
}

/** Draws `text` in the current transform, one 3x5 glyph per character. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: FontStyle,
): void {
  const { pixel, color } = style;
  ctx.fillStyle = color;

  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[" "];
    if (glyph !== undefined) {
      for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
        const bits = glyph[row] ?? "";
        for (let col = 0; col < GLYPH_WIDTH; col += 1) {
          if (bits[col] === "#") {
            ctx.fillRect(cursor + col * pixel, y + row * pixel, pixel, pixel);
          }
        }
      }
    }
    cursor += (GLYPH_WIDTH + GLYPH_SPACING) * pixel;
  }
}
