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
};

/** Arrow keys and WASD steer PacMan; the latest direction pressed is the intent. */
export function createDirectionInput(target: Window): DirectionInput {
  let desired: Direction | null = null;

  target.addEventListener("keydown", (event) => {
    const direction = directionForKey(event.key);
    if (direction === null) return;
    event.preventDefault();
    desired = direction;
  });

  return { desired: () => desired };
}
