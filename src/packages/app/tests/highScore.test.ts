import { describe, expect, it } from "vitest";
import { HIGH_SCORE_KEY, createLocalStorageHighScore } from "../highScore";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  } as Storage;
}

describe("the localStorage high score store", () => {
  it("reads a stored high score", () => {
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORE_KEY, "4240");
    expect(createLocalStorageHighScore(HIGH_SCORE_KEY, storage).read()).toBe(4240);
  });

  it("reads 0 when nothing is stored", () => {
    expect(createLocalStorageHighScore(HIGH_SCORE_KEY, memoryStorage()).read()).toBe(0);
  });

  it("reads 0 for a corrupt value", () => {
    const storage = memoryStorage();
    storage.setItem(HIGH_SCORE_KEY, "not-a-number");
    expect(createLocalStorageHighScore(HIGH_SCORE_KEY, storage).read()).toBe(0);
  });

  it("writes a whole number that survives a fresh read", () => {
    const storage = memoryStorage();
    createLocalStorageHighScore(HIGH_SCORE_KEY, storage).write(1234.9);
    expect(storage.getItem(HIGH_SCORE_KEY)).toBe("1234");
    expect(createLocalStorageHighScore(HIGH_SCORE_KEY, storage).read()).toBe(1234);
  });

  it("reads 0 when reading storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    } as unknown as Storage;
    expect(createLocalStorageHighScore(HIGH_SCORE_KEY, storage).read()).toBe(0);
  });

  it("keeps the score in memory when writing throws", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage full");
      },
    } as unknown as Storage;
    const store = createLocalStorageHighScore(HIGH_SCORE_KEY, storage);
    store.write(500);
    expect(store.read()).toBe(500);
  });
});
