import type { HighScoreStore } from "./gameFlow";

/** Where the high score lives in localStorage when no key is given. */
export const HIGH_SCORE_KEY = "pacman.highScore";

/**
 * A HighScoreStore backed by localStorage. Reads that are missing or corrupt
 * resolve to 0, so a bad value never breaks the title or game over screens.
 */
export function createLocalStorageHighScore(
  key: string = HIGH_SCORE_KEY,
  storage: Storage = window.localStorage,
): HighScoreStore {
  return {
    read: () => {
      const raw = storage.getItem(key);
      if (raw === null) return 0;
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    },
    write: (value) => {
      storage.setItem(key, String(Math.floor(value)));
    },
  };
}
