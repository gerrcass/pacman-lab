import type { Direction } from "../core";
import { dpadDirectionAt, dpadLayout, insideDpad } from "../render";
import type { DpadLayout } from "../render";

const DIRECTION_KEYS: Readonly<Record<string, Direction>> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

export function directionForKey(key: string): Direction | null {
  return DIRECTION_KEYS[key.toLowerCase()] ?? null;
}

export type GameInput = {
  /** The latest direction pressed, or null if no direction has been pressed. */
  desired(): Direction | null;
  /** True once per Space or Enter press, for starting or restarting a run. */
  takeStart(): boolean;
  /** True once per P or Escape press, for toggling pause. */
  takePause(): boolean;
  /** True once per M press, for toggling mute. */
  takeMute(): boolean;
};

const PAUSE_KEYS = new Set(["p", "escape"]);

/** Whether a key toggles mute (M). */
function isMuteKey(key: string): boolean {
  return key.toLowerCase() === "m";
}

export type TouchPoint = {
  readonly x: number;
  readonly y: number;
};

/** The shortest swipe, in canvas pixels, that counts as a direction. */
export const SWIPE_MIN_DISTANCE = 24;

/**
 * The direction a swipe steers, from the dominant axis between its two points.
 * A move shorter than `minDistance` steers nothing: it is a tap, not a swipe.
 */
export function directionForSwipe(
  from: TouchPoint,
  to: TouchPoint,
  minDistance: number = SWIPE_MIN_DISTANCE,
): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;

  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** What one touch event asks the game to do: steer, and/or confirm. */
export type TouchResult = {
  readonly direction: Direction | null;
  readonly start: boolean;
};

const NO_TOUCH_RESULT: TouchResult = { direction: null, start: false };

/** A pointer-gesture state machine that decides direction and start intents. */
export type TouchRecognizer = {
  down(point: TouchPoint): TouchResult;
  move(point: TouchPoint): TouchResult;
  up(point: TouchPoint): TouchResult;
  cancel(): void;
};

/**
 * Recognizes d-pad presses and swipes from a stream of pointer points. A press
 * on the pad steers by the pad; anywhere else, a long drag is a swipe and a
 * short one is a tap (the start/confirm intent). The layout is read fresh each
 * event, so a resized canvas stays in step with what is drawn.
 */
export function createTouchRecognizer(
  layout: () => DpadLayout,
  minSwipe: number = SWIPE_MIN_DISTANCE,
): TouchRecognizer {
  let swipeStart: TouchPoint | null = null;
  let padActive = false;

  return {
    down(point) {
      const pad = layout();
      if (insideDpad(point.x, point.y, pad)) {
        padActive = true;
        return { direction: dpadDirectionAt(point.x, point.y, pad), start: false };
      }
      swipeStart = point;
      return NO_TOUCH_RESULT;
    },
    move(point) {
      if (!padActive) return NO_TOUCH_RESULT;
      const pad = layout();
      return { direction: dpadDirectionAt(point.x, point.y, pad), start: false };
    },
    up(point) {
      if (padActive) {
        padActive = false;
        return NO_TOUCH_RESULT;
      }
      if (swipeStart === null) return NO_TOUCH_RESULT;

      const direction = directionForSwipe(swipeStart, point, minSwipe);
      swipeStart = null;
      return { direction, start: direction === null };
    },
    cancel() {
      swipeStart = null;
      padActive = false;
    },
  };
}

export type GameInputOptions = {
  /** Whether the device has touch input. When false, touch events are ignored. */
  readonly touch?: boolean;
};

function pointFromPointerEvent(canvas: HTMLCanvasElement, event: PointerEvent): TouchPoint {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

/**
 * Maps the keyboard and, on touch devices, swipes and the on-screen d-pad to
 * intents. Arrow keys and WASD steer, Space or Enter starts a run, and P or
 * Escape toggles pause. On touch, a swipe or d-pad press steers and a tap
 * starts. Start and pause are latched and cleared when the caller takes them,
 * so a press between two frame ticks is never dropped. Touch wiring is skipped
 * entirely on a device without touch, so pointer events are ignored there.
 */
export function createGameInput(
  target: Window,
  canvas: HTMLCanvasElement,
  options: GameInputOptions = {},
): GameInput {
  let desired: Direction | null = null;
  let startLatched = false;
  let pauseLatched = false;
  let muteLatched = false;

  target.addEventListener("keydown", (event) => {
    // Ignore auto-repeat: a held key is one press, not a press every tick.
    if (event.repeat) return;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startLatched = true;
      return;
    }

    if (PAUSE_KEYS.has(event.key.toLowerCase())) {
      event.preventDefault();
      pauseLatched = true;
      return;
    }

    if (isMuteKey(event.key)) {
      event.preventDefault();
      muteLatched = true;
      return;
    }

    const direction = directionForKey(event.key);
    if (direction === null) return;
    event.preventDefault();
    desired = direction;
  });

  if (options.touch === true) {
    const recognizer = createTouchRecognizer(() => dpadLayout(canvas.width, canvas.height));
    const apply = (result: TouchResult): void => {
      if (result.direction !== null) desired = result.direction;
      if (result.start) startLatched = true;
    };

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      apply(recognizer.down(pointFromPointerEvent(canvas, event)));
    });
    canvas.addEventListener("pointermove", (event) => {
      apply(recognizer.move(pointFromPointerEvent(canvas, event)));
    });
    canvas.addEventListener("pointerup", (event) => {
      apply(recognizer.up(pointFromPointerEvent(canvas, event)));
    });
    canvas.addEventListener("pointercancel", () => recognizer.cancel());
  }

  return {
    desired: () => desired,
    takeStart: () => {
      const pressed = startLatched;
      startLatched = false;
      return pressed;
    },
    takePause: () => {
      const pressed = pauseLatched;
      pauseLatched = false;
      return pressed;
    },
    takeMute: () => {
      const pressed = muteLatched;
      muteLatched = false;
      return pressed;
    },
  };
}
