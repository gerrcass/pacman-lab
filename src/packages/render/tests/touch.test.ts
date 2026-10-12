import { describe, expect, it } from "vitest";
import { dpadDirectionAt, dpadLayout, insideDpad } from "../index";

describe("d-pad layout", () => {
  it("sits inside the canvas, in the bottom-left corner", () => {
    const layout = dpadLayout(720, 900);
    expect(insideDpad(layout.cx, layout.cy, layout)).toBe(true);
    expect(layout.cx - layout.halfSize).toBeGreaterThanOrEqual(0);
    expect(layout.cy + layout.halfSize).toBeLessThanOrEqual(900);
  });

  it("grows with the canvas but stays within its bounds", () => {
    expect(dpadLayout(720, 900).halfSize).toBeGreaterThan(dpadLayout(360, 450).halfSize);
    expect(dpadLayout(4000, 4000).halfSize * 2).toBeLessThanOrEqual(300);
  });
});

describe("d-pad direction", () => {
  const layout = dpadLayout(720, 900);
  const at = (dx: number, dy: number): ReturnType<typeof dpadDirectionAt> =>
    dpadDirectionAt(layout.cx + dx, layout.cy + dy, layout);

  it("maps each arm to its direction", () => {
    expect(at(0, -layout.halfSize)).toBe("up");
    expect(at(0, layout.halfSize)).toBe("down");
    expect(at(-layout.halfSize, 0)).toBe("left");
    expect(at(layout.halfSize, 0)).toBe("right");
  });

  it("steers the dominant axis on a diagonal press", () => {
    expect(at(layout.halfSize, layout.halfSize * 0.5)).toBe("right");
    expect(at(layout.halfSize * 0.5, layout.halfSize)).toBe("down");
  });

  it("returns null in the dead zone at the centre", () => {
    expect(at(0, 0)).toBeNull();
  });

  it("returns null off the pad", () => {
    expect(dpadDirectionAt(0, 0, layout)).toBeNull();
  });
});
