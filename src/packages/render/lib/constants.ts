export const TILE_SIZE = 8;
export const MAZE_OFFSET_X = 0;
export const MAZE_OFFSET_Y = 24;

export const VIRTUAL_WIDTH = 224;
export const VIRTUAL_HEIGHT = 288;

export const PELLET_RADIUS = 1.5;
export const POWER_PELLET_RADIUS = 3;
export const WALL_THICKNESS = 1;

/** Frightened Ghosts flash for the last two seconds before they recover. */
export const FRIGHTENED_FLASH_TICKS = 120;
export const FRIGHTENED_FLASH_INTERVAL = 15;

export const COLORS = {
  background: "#000000",
  wall: "#2121de",
  pellet: "#ffb8ae",
  door: "#ffb8ff",
  pacman: "#ffff00",
  hud: "#ffffff",
  ghostEye: "#ffffff",
  ghostEyeFlash: "#ff0000",
  ghostPupil: "#2121de",
  frightened: "#2121de",
  frightenedFlash: "#ffffff",
} as const;

/** The classic Ghost colours, by Ghost. */
export const GHOST_COLORS = {
  blinky: "#ff0000",
  pinky: "#ffb8ff",
  inky: "#00ffff",
  clyde: "#ffb852",
} as const;
