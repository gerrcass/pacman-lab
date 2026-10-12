import type { GridPosition } from "./maze";
import { FRUIT_SPAWN_PELLETS, FRUIT_SPAWN_TILE, FRUIT_TICKS, fruitForLevel } from "./tuning";
import type { FruitKind } from "./tuning";

export type FruitState = {
  readonly kind: FruitKind;
  /** The left of the two tiles the Fruit occupies. */
  readonly tile: GridPosition;
  readonly points: number;
  ticksLeft: number;
};

/** Overrides for the Fruit, mainly for tests; defaults to the arcade tables. */
export type FruitConfig = {
  /** Pellets eaten within a Level at which each Fruit appears, in order. */
  readonly spawnPellets?: readonly number[];
  /** The left of the two tiles the Fruit occupies. */
  readonly spawnTile?: GridPosition;
  /** How long the Fruit stays before it disappears, in ticks. */
  readonly ticks?: number;
};

export type FruitBoard = {
  /** The Fruit on the board, or null when none is showing. */
  active(): FruitState | null;
  /** Shows the Level's Fruit when its pellet count crosses the next spawn point. */
  maybeSpawn(level: number, pelletsEaten: number): void;
  /** Ages the Fruit; it disappears once its time runs out. */
  tick(): void;
  /** Eats the Fruit when PacMan reaches either of its tiles; returns its points. */
  consume(tiles: readonly GridPosition[]): number;
  /** Removes the Fruit but remembers which spawn points are spent. */
  clear(): void;
  /** Clears the Fruit and the spawn history, for a fresh Level. */
  reset(): void;
};

/** Whether a tile is one of the two the Fruit occupies. */
function onFruit(fruit: FruitState, tile: GridPosition): boolean {
  return tile.y === fruit.tile.y && (tile.x === fruit.tile.x || tile.x === fruit.tile.x + 1);
}

/**
 * Tracks the Fruit: when it appears, where it sits, how long it lasts, and what
 * eating it scores. The next spawn point is spent as it is crossed, so a Fruit
 * still on the board when the next point arrives does not reappear.
 */
export function createFruitBoard(config: FruitConfig = {}): FruitBoard {
  const spawnPellets = config.spawnPellets ?? FRUIT_SPAWN_PELLETS;
  const spawnTile = config.spawnTile ?? FRUIT_SPAWN_TILE;
  const ticks = config.ticks ?? FRUIT_TICKS;

  let fruit: FruitState | null = null;
  let nextSpawn = 0;

  return {
    active: () => fruit,

    maybeSpawn(level, pelletsEaten) {
      // Spend every spawn point the pellet count has crossed this tick. The
      // first one shows a Fruit if none is on the board; the rest are spent, so
      // a point crossed while a Fruit is up never queues a second Fruit.
      let shown = fruit !== null;
      while (nextSpawn < spawnPellets.length && pelletsEaten >= spawnPellets[nextSpawn]!) {
        nextSpawn += 1;
        if (shown) continue;
        const spec = fruitForLevel(level);
        fruit = { kind: spec.kind, tile: spawnTile, points: spec.points, ticksLeft: ticks };
        shown = true;
      }
    },

    tick() {
      if (fruit === null) return;
      fruit.ticksLeft -= 1;
      if (fruit.ticksLeft <= 0) fruit = null;
    },

    consume(tiles) {
      if (fruit === null) return 0;
      for (const tile of tiles) {
        if (!onFruit(fruit, tile)) continue;
        const points = fruit.points;
        fruit = null;
        return points;
      }
      return 0;
    },

    clear() {
      fruit = null;
    },

    reset() {
      fruit = null;
      nextSpawn = 0;
    },
  };
}
