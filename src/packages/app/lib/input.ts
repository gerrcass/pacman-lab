import type { Direction } from "../../core";

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
};

const PAUSE_KEYS = new Set(["p", "escape"]);

/**
 * Maps the keyboard to intents: arrow keys and WASD steer, Space or Enter
 * starts a run, and P or Escape toggles pause. Start and pause are latched on
 * keydown and cleared when the caller takes them, so a press between two frame
 * ticks is never dropped.
 */
export function createGameInput(target: Window): GameInput {
  let desired: Direction | null = null;
  let startLatched = false;
  let pauseLatched = false;

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

    const direction = directionForKey(event.key);
    if (direction === null) return;
    event.preventDefault();
    desired = direction;
  });

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
  };
}
