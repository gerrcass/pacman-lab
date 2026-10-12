import { directionFromDelta } from "../core";
import type { Direction } from "../core";
import {
  DPAD_LAYOUT,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  dpadDirectionAt,
  fitViewport,
  insideDpad,
} from "../render";

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

/** The shortest swipe, in virtual pixels, that counts as a direction. */
export const SWIPE_MIN_DISTANCE = 16;

/**
 * The direction a swipe steers, from the dominant axis between its two points.
 * A move shorter than `SWIPE_MIN_DISTANCE` steers nothing: it is a tap, not a
 * swipe.
 */
export function directionForSwipe(from: TouchPoint, to: TouchPoint): Direction | null {
  return directionFromDelta(to.x - from.x, to.y - from.y, SWIPE_MIN_DISTANCE);
}

/** What one touch event asks the game to do: steer, and/or start a run. */
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
 * Recognizes d-pad presses and swipes from a stream of pointer points on the
 * virtual grid. A press on the pad steers by the pad. Anywhere else, dragging
 * steers live once it passes the swipe threshold, and a press with no drag is a
 * tap: the start/confirm intent. Once a drag has steered, releasing it does not
 * also start.
 */
export function createTouchRecognizer(): TouchRecognizer {
  let swipeStart: TouchPoint | null = null;
  let swipeSteered = false;
  let padActive = false;

  return {
    down(point) {
      if (insideDpad(point.x, point.y, DPAD_LAYOUT)) {
        padActive = true;
        return { direction: dpadDirectionAt(point.x, point.y, DPAD_LAYOUT), start: false };
      }
      swipeStart = point;
      swipeSteered = false;
      return NO_TOUCH_RESULT;
    },
    move(point) {
      if (padActive) {
        return { direction: dpadDirectionAt(point.x, point.y, DPAD_LAYOUT), start: false };
      }
      if (swipeStart === null) return NO_TOUCH_RESULT;

      const direction = directionForSwipe(swipeStart, point);
      if (direction === null) return NO_TOUCH_RESULT;

      swipeStart = point;
      swipeSteered = true;
      return { direction, start: false };
    },
    up(point) {
      if (padActive) {
        padActive = false;
        return NO_TOUCH_RESULT;
      }
      if (swipeStart === null) return NO_TOUCH_RESULT;

      const direction = directionForSwipe(swipeStart, point);
      const started = direction === null && !swipeSteered;
      swipeStart = null;
      swipeSteered = false;
      return { direction, start: started };
    },
    cancel() {
      swipeStart = null;
      swipeSteered = false;
      padActive = false;
    },
  };
}

/** Where a pointer event lands on the 224x288 virtual grid. */
function pointFromPointerEvent(canvas: HTMLCanvasElement, event: PointerEvent): TouchPoint {
  const rect = canvas.getBoundingClientRect();
  const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  const backingX = (event.clientX - rect.left) * scaleX;
  const backingY = (event.clientY - rect.top) * scaleY;
  return {
    x: (backingX - viewport.offsetX) / viewport.scale,
    y: (backingY - viewport.offsetY) / viewport.scale,
  };
}

/**
 * Maps the keyboard and, on touch devices, swipes and the on-screen d-pad to
 * intents. Arrow keys and WASD steer, Space or Enter starts a run, and P or
 * Escape toggles pause. On touch, a swipe or d-pad drag steers, and a tap
 * starts. Start and pause are latched and cleared when the caller takes them,
 * so a press between two frame ticks is never dropped. Touch wiring is skipped
 * entirely when `touch` is false, so pointer events are ignored there.
 */
export function createGameInput(
  target: Window,
  canvas: HTMLCanvasElement,
  touch: boolean,
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

  if (touch) {
    const recognizer = createTouchRecognizer();
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
