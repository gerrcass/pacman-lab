import type { HighScoreStore } from "./gameFlow";

/** Where the high score lives in localStorage when no key is given. */
export const HIGH_SCORE_KEY = "pacman.highScore";

function parse(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * A HighScoreStore backed by localStorage. Storage can be blocked or full, so
 * every access is guarded: a missing or corrupt value reads as 0, and when
 * storage is unavailable the score still lives in memory for the session.
 */
export function createLocalStorageHighScore(
  key: string = HIGH_SCORE_KEY,
  storage?: Storage,
): HighScoreStore {
  const backing = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  let cached = 0;
  let loaded = false;
  const store = backing();

  return {
    read: () => {
      if (!loaded) {
        loaded = true;
        try {
          cached = parse(store?.getItem(key));
        } catch {
          cached = 0;
        }
      }
      return cached;
    },
    write: (value) => {
      cached = Math.floor(value);
      loaded = true;
      try {
        store?.setItem(key, String(cached));
      } catch {
        // Storage is blocked or full; keep the score in memory.
      }
    },
  };
}
