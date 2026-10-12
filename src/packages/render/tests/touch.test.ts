import { describe, expect, it } from "vitest";
import { DPAD_LAYOUT, dpadDirectionAt, insideDpad } from "../index";

describe("d-pad layout", () => {
  it("sits on the virtual grid with its square inside the canvas", () => {
    expect(insideDpad(DPAD_LAYOUT.cx, DPAD_LAYOUT.cy, DPAD_LAYOUT)).toBe(true);
    expect(DPAD_LAYOUT.cx - DPAD_LAYOUT.halfSize).toBeGreaterThanOrEqual(0);
    expect(DPAD_LAYOUT.cy + DPAD_LAYOUT.halfSize).toBeLessThanOrEqual(288);
  });
});

describe("d-pad direction", () => {
  const { cx, cy, halfSize } = DPAD_LAYOUT;
  const at = (dx: number, dy: number): ReturnType<typeof dpadDirectionAt> =>
    dpadDirectionAt(cx + dx, cy + dy, DPAD_LAYOUT);

  it("maps each arm to its direction", () => {
    expect(at(0, -halfSize)).toBe("up");
    expect(at(0, halfSize)).toBe("down");
    expect(at(-halfSize, 0)).toBe("left");
    expect(at(halfSize, 0)).toBe("right");
  });

  it("steers the dominant axis on a diagonal press", () => {
    expect(at(halfSize, halfSize * 0.5)).toBe("right");
    expect(at(halfSize * 0.5, halfSize)).toBe("down");
  });

  it("returns null in the dead zone at the centre", () => {
    expect(at(0, 0)).toBeNull();
  });

  it("returns null off the pad", () => {
    expect(dpadDirectionAt(0, 0, DPAD_LAYOUT)).toBeNull();
  });
});
