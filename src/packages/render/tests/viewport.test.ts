import { describe, expect, it } from "vitest";
import { fitViewport } from "../index";

describe("fitViewport", () => {
  it("scales the content up by whole pixels and centers it", () => {
    expect(fitViewport(1000, 1000, 224, 288)).toEqual({ scale: 3, offsetX: 164, offsetY: 68 });
  });

  it("uses the tighter axis when the window is not the content aspect ratio", () => {
    expect(fitViewport(448, 576, 224, 288)).toEqual({ scale: 2, offsetX: 0, offsetY: 0 });
    expect(fitViewport(448, 1000, 224, 288)).toEqual({ scale: 2, offsetX: 0, offsetY: 212 });
  });

  it("never scales below one pixel per source pixel", () => {
    expect(fitViewport(100, 100, 224, 288)).toEqual({ scale: 1, offsetX: -62, offsetY: -94 });
  });
});
