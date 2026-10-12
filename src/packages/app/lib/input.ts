import type { Direction } from "../../core";

const KEYS: Readonly<Record<string, Direction>> = {
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
  return KEYS[key.toLowerCase()] ?? null;
}

export type DirectionInput = {
  desired(): Direction | null;
  /** True once per Space or Enter press, for starting or restarting a run. */
  consumeStart(): boolean;
};

/** Arrow keys and WASD steer PacMan; the latest direction pressed is the intent. */
export function createDirectionInput(target: Window): DirectionInput {
  let desired: Direction | null = null;
  let startPressed = false;

  target.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startPressed = true;
      return;
    }

    const direction = directionForKey(event.key);
    if (direction === null) return;
    event.preventDefault();
    desired = direction;
  });

  return {
    desired: () => desired,
    consumeStart: () => {
      const pressed = startPressed;
      startPressed = false;
      return pressed;
    },
  };
}
