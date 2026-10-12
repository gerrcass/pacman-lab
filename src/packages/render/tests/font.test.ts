import { describe, expect, it } from "vitest";
import { SCREEN_LABELS, missingGlyphs } from "../index";

describe("the pixel font", () => {
  it("has a glyph for every character the screens draw", () => {
    for (const label of SCREEN_LABELS) {
      expect(missingGlyphs(label), `label "${label}"`).toEqual([]);
    }
  });

  it("has a glyph for every digit", () => {
    expect(missingGlyphs("0123456789")).toEqual([]);
  });

  it("reports the characters it cannot draw", () => {
    expect(missingGlyphs("A?Z")).toEqual(["?"]);
  });
});
