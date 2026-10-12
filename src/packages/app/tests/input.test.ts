import { describe, expect, it } from "vitest";
import { dpadLayout } from "../../render";
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
    expect(directionForSwipe(from, { x: 40, y: 100 })).toBe("left");
    expect(directionForSwipe(from, { x: 160, y: 100 })).toBe("right");
    expect(directionForSwipe(from, { x: 100, y: 40 })).toBe("up");
    expect(directionForSwipe(from, { x: 100, y: 160 })).toBe("down");
  });

  it("prefers the larger axis on a diagonal", () => {
    expect(directionForSwipe(from, { x: 180, y: 130 })).toBe("right");
    expect(directionForSwipe(from, { x: 120, y: 200 })).toBe("down");
  });

  it("ignores a move shorter than the threshold", () => {
    expect(directionForSwipe(from, { x: 100 + SWIPE_MIN_DISTANCE - 1, y: 100 })).toBeNull();
  });
});

describe("touch recognizer", () => {
  const layout = dpadLayout(720, 900);
  const padUp = { x: layout.cx, y: layout.cy - layout.halfSize * 0.8 };
  const padRight = { x: layout.cx + layout.halfSize * 0.8, y: layout.cy };
  const offPad = { x: 400, y: 400 };

  it("turns a d-pad press into a direction", () => {
    const recognizer = createTouchRecognizer(() => layout);
    expect(recognizer.down(padUp).direction).toBe("up");
  });

  it("keeps steering while the pad finger moves", () => {
    const recognizer = createTouchRecognizer(() => layout);
    recognizer.down(padUp);
    expect(recognizer.move(padRight).direction).toBe("right");
  });

  it("turns a swipe into its direction", () => {
    const recognizer = createTouchRecognizer(() => layout);
    recognizer.down(offPad);
    const result = recognizer.up({ x: 300, y: 400 });
    expect(result.direction).toBe("left");
    expect(result.start).toBe(false);
  });

  it("treats a tap as start, not a direction", () => {
    const recognizer = createTouchRecognizer(() => layout);
    recognizer.down(offPad);
    const result = recognizer.up({ x: 405, y: 402 });
    expect(result.direction).toBeNull();
    expect(result.start).toBe(true);
  });

  it("ignores an up with no matching down", () => {
    const recognizer = createTouchRecognizer(() => layout);
    expect(recognizer.up(offPad)).toEqual({ direction: null, start: false });
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

function fakeCanvas(): ReturnType<typeof fakeElement> & {
  width: number;
  height: number;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
} {
  return {
    ...fakeElement(),
    width: 720,
    height: 900,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 900 }),
  };
}

function keyEvent(key: string): FakeEvent {
  return { key, repeat: false, preventDefault: () => {} };
}

function pointerEvent(clientX: number, clientY: number): FakeEvent {
  return { clientX, clientY, preventDefault: () => {} };
}

describe("createGameInput", () => {
  it("still maps the keyboard", () => {
    const target = fakeElement();
    const input = createGameInput(
      target as unknown as Window,
      fakeCanvas() as unknown as HTMLCanvasElement,
      { touch: false },
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
      { touch: false },
    );

    expect(canvas.has("pointerdown")).toBe(false);

    canvas.dispatch("pointerdown", pointerEvent(400, 400));
    canvas.dispatch("pointerup", pointerEvent(300, 400));
    expect(input.desired()).toBeNull();
    expect(input.takeStart()).toBe(false);
  });

  it("steers from the d-pad on a touch device", () => {
    const canvas = fakeCanvas();
    const layout = dpadLayout(canvas.width, canvas.height);
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      { touch: true },
    );

    expect(canvas.has("pointerdown")).toBe(true);

    canvas.dispatch("pointerdown", pointerEvent(layout.cx, layout.cy - layout.halfSize * 0.8));
    expect(input.desired()).toBe("up");
  });

  it("steers from a swipe and starts from a tap on a touch device", () => {
    const canvas = fakeCanvas();
    const input = createGameInput(
      fakeElement() as unknown as Window,
      canvas as unknown as HTMLCanvasElement,
      { touch: true },
    );

    canvas.dispatch("pointerdown", pointerEvent(400, 400));
    canvas.dispatch("pointerup", pointerEvent(300, 400));
    expect(input.desired()).toBe("left");

    canvas.dispatch("pointerdown", pointerEvent(400, 400));
    canvas.dispatch("pointerup", pointerEvent(405, 402));
    expect(input.takeStart()).toBe(true);
  });
});
