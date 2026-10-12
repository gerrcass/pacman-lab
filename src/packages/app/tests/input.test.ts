import { describe, expect, it } from "vitest";
import { DPAD_LAYOUT } from "../../render";
import {
  SWIPE_MIN_DISTANCE,
  createGameInput,
  createTouchRecognizer,
  directionForKey,
  directionForSwipe,
} from "../input";

describe("directionForKey", () => {
  it("maps the arrow keys and WASD", () => {
    expect(directionForKey("ArrowUp")).toBe("up");
    expect(directionForKey("ArrowDown")).toBe("down");
    expect(directionForKey("ArrowLeft")).toBe("left");
    expect(directionForKey("ArrowRight")).toBe("right");
    expect(directionForKey("w")).toBe("up");
    expect(directionForKey("S")).toBe("down");
    expect(directionForKey("a")).toBe("left");
    expect(directionForKey("d")).toBe("right");
  });

  it("ignores keys that do not steer", () => {
    expect(directionForKey("q")).toBeNull();
    expect(directionForKey("Enter")).toBeNull();
  });
});

describe("directionForSwipe", () => {
  const from = { x: 100, y: 100 };

  it("maps a long swipe to its dominant direction", () => {
    expect(directionForSwipe(from, { x: 100 - SWIPE_MIN_DISTANCE, y: 100 })).toBe("left");
    expect(directionForSwipe(from, { x: 100 + SWIPE_MIN_DISTANCE, y: 100 })).toBe("right");
    expect(directionForSwipe(from, { x: 100, y: 100 - SWIPE_MIN_DISTANCE })).toBe("up");
    expect(directionForSwipe(from, { x: 100, y: 100 + SWIPE_MIN_DISTANCE })).toBe("down");
  });

  it("prefers the larger axis on a diagonal", () => {
    expect(directionForSwipe(from, { x: 160, y: 130 })).toBe("right");
    expect(directionForSwipe(from, { x: 120, y: 160 })).toBe("down");
  });

  it("ignores a move shorter than the threshold", () => {
    expect(directionForSwipe(from, { x: 100 + SWIPE_MIN_DISTANCE - 1, y: 100 })).toBeNull();
  });
});

describe("touch recognizer", () => {
  const padUp = { x: DPAD_LAYOUT.cx, y: DPAD_LAYOUT.cy - DPAD_LAYOUT.halfSize * 0.8 };
  const padRight = { x: DPAD_LAYOUT.cx + DPAD_LAYOUT.halfSize * 0.8, y: DPAD_LAYOUT.cy };
  const offPad = { x: 150, y: 150 };
  const recognizer = (padVisible = true): ReturnType<typeof createTouchRecognizer> =>
    createTouchRecognizer(() => padVisible);

  it("turns a d-pad press into a direction", () => {
    expect(recognizer().down(padUp).direction).toBe("up");
  });

  it("keeps steering while the pad finger moves", () => {
    const touch = recognizer();
    touch.down(padUp);
    expect(touch.move(padRight).direction).toBe("right");
  });

  it("treats a tap on the hidden pad as start, not a direction", () => {
    const touch = recognizer(false);
    expect(touch.down(padUp).direction).toBeNull();
    const result = touch.up(padUp);
    expect(result.direction).toBeNull();
    expect(result.start).toBe(true);
  });

  it("steers live during a swipe, before release", () => {
    const touch = recognizer();
    touch.down(offPad);
    expect(touch.move({ x: 150 - SWIPE_MIN_DISTANCE - 4, y: 150 }).direction).toBe("left");
  });

  it("turns a fast swipe into its direction", () => {
    const touch = recognizer();
    touch.down(offPad);
    const result = touch.up({ x: 150 - SWIPE_MIN_DISTANCE - 4, y: 150 });
    expect(result.direction).toBe("left");
    expect(result.start).toBe(false);
  });

  it("treats a tap as start, not a direction", () => {
    const touch = recognizer();
    touch.down(offPad);
    const result = touch.up({ x: 154, y: 151 });
    expect(result.direction).toBeNull();
    expect(result.start).toBe(true);
  });

  it("does not start when a drag steered then released", () => {
    const touch = recognizer();
    touch.down(offPad);
    touch.move({ x: 150 - SWIPE_MIN_DISTANCE - 4, y: 150 });
    expect(touch.up({ x: 150 - SWIPE_MIN_DISTANCE - 4, y: 150 }).start).toBe(false);
  });

  it("ignores an up with no matching down", () => {
    expect(recognizer().up(offPad)).toEqual({ direction: null, start: false });
  });
});

type FakeEvent = Record<string, unknown>;
type Listener = (event: FakeEvent) => void;

function fakeElement(): {
  addEventListener(type: string, listener: Listener): void;
  dispatch(type: string, event: FakeEvent): void;
  has(type: string): boolean;
} {
  const listeners = new Map<string, Listener[]>();
  return {
    addEventListener(type, listener) {
      const list = listeners.get(type) ?? [];
      list.push(listener);
      listeners.set(type, list);
    },
    dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    has(type) {
      return listeners.has(type);
    },
  };
}

/** A canvas the size of the virtual grid, so pointer coords are virtual coords. */
function fakeCanvas(): ReturnType<typeof fakeElement> & {
  width: number;
  height: number;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
} {
  return {
    ...fakeElement(),
    width: 224,
    height: 288,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 224, height: 288 }),
  };
}

function keyEvent(key: string): FakeEvent {
  return { key, repeat: false, preventDefault: () => {} };
}

function pointerEvent(x: number, y: number, buttons = 1): FakeEvent {
  return { clientX: x, clientY: y, buttons, pointerId: 1, preventDefault: () => {} };
}

describe("createGameInput", () => {
  it("still maps the keyboard", () => {
    const target = fakeElement();
    const input = createGameInput(
      target as unknown as Window,
      fakeCanvas() as unknown as HTMLCanvasElement,
      false,
      () => true,
    );

    target.dispatch("keydown", keyEvent("ArrowUp"));
    expect(input.desired()).toBe("up");

    target.dispatch("keydown", keyEvent("a"));
    expect(input.desired()).toBe("left");

    target.dispatch("keydown", keyEvent(" "));
    expect(input.takeStart()).toBe(true);
    expect(input.takeStart()).toBe(false);
  });

  it("ignores touch on a device without it", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      false,
      () => true,
    );

    expect(canvas.has("pointerdown")).toBe(false);

    canvas.dispatch("pointerdown", pointerEvent(150, 150));
    canvas.dispatch("pointerup", pointerEvent(110, 150));
    expect(input.desired()).toBeNull();
    expect(input.takeStart()).toBe(false);
  });

  it("steers from the d-pad on a touch device", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      true,
      () => true,
    );

    expect(canvas.has("pointerdown")).toBe(true);

    canvas.dispatch(
      "pointerdown",
      pointerEvent(DPAD_LAYOUT.cx, DPAD_LAYOUT.cy - DPAD_LAYOUT.halfSize * 0.8),
    );
    expect(input.desired()).toBe("up");
  });

  it("starts from a tap on the hidden d-pad", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      true,
      () => false,
    );

    const pad = pointerEvent(DPAD_LAYOUT.cx, DPAD_LAYOUT.cy - DPAD_LAYOUT.halfSize * 0.8);
    canvas.dispatch("pointerdown", pad);
    canvas.dispatch("pointerup", pad);
    expect(input.desired()).toBeNull();
    expect(input.takeStart()).toBe(true);
  });

  it("ignores a pointer move with no button held", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      true,
      () => true,
    );

    canvas.dispatch("pointerdown", pointerEvent(150, 150));
    canvas.dispatch("pointermove", pointerEvent(130, 150, 0));
    expect(input.desired()).toBeNull();
  });

  it("steers from a swipe and starts from a tap on a touch device", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      true,
      () => true,
    );

    canvas.dispatch("pointerdown", pointerEvent(150, 150));
    canvas.dispatch("pointerup", pointerEvent(110, 150));
    expect(input.desired()).toBe("left");

    canvas.dispatch("pointerdown", pointerEvent(150, 150));
    canvas.dispatch("pointerup", pointerEvent(154, 151));
    expect(input.takeStart()).toBe(true);
  });
});
