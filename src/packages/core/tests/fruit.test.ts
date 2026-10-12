import { describe, expect, it } from "vitest";
import {
  FRUIT_SPAWN_PELLETS,
  FRUIT_SPAWN_TILE,
  MAZE_COLUMNS,
  MAZE_ROWS,
  createSimulation,
  fruitForLevel,
  parseMaze,
} from "../index";
import type { Direction, Maze } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const CORRIDOR_ROW = 14;

function rowWith(cells: Readonly<Record<number, string>>): string {
  const out = Array.from({ length: MAZE_COLUMNS }, () => "#");
  for (const [x, char] of Object.entries(cells)) out[Number(x)] = char;
  return out.join("");
}

/** A single corridor on row 14 with everything else walled off. */
function corridor(row: string): Maze {
  const rows = Array.from({ length: MAZE_ROWS }, () => WALL_ROW);
  rows[CORRIDOR_ROW] = row;
  return parseMaze(rows);
}

function drive(
  sim: ReturnType<typeof createSimulation>,
  ticks: number,
  desired: Direction | null,
): void {
  for (let i = 0; i < ticks; i += 1) sim.step({ desired });
}

describe("fruit spawn", () => {
  it("uses the fixed spot below the Ghost house by default", () => {
    expect(FRUIT_SPAWN_TILE).toEqual({ x: 13, y: 17 });
    expect(FRUIT_SPAWN_PELLETS).toEqual([70, 170]);
  });

  it("appears only after the set number of Pellets is eaten", () => {
    // PacMan at 13 walks left onto the Pellet at 12; the Fruit threshold is one.
    const maze = corridor(rowWith({ 2: ".", 12: ".", 13: "P" }));
    const sim = createSimulation({ maze, seed: 1, fruit: { spawnPellets: [1] } });

    drive(sim, 7, null);
    expect(sim.snapshot().fruit).toBeNull();

    drive(sim, 1, null);
    const fruit = sim.snapshot().fruit;
    expect(fruit).not.toBeNull();
    expect(fruit?.kind).toBe("cherry");
    expect(fruit?.tile).toEqual(FRUIT_SPAWN_TILE);
  });

  it("spawns again at the next spawn point after the first times out", () => {
    // Pellets at 12, 11, 10; the Fruit appears behind PacMan and times out
    // between the first and second spawn points.
    const maze = corridor(rowWith({ 10: ".", 11: ".", 12: ".", 13: "P" }));
    const sim = createSimulation({
      maze,
      seed: 1,
      fruit: { spawnPellets: [1, 2], spawnTile: { x: 20, y: CORRIDOR_ROW }, ticks: 4 },
    });

    drive(sim, 8, null); // eats the Pellet at 12: first Fruit
    expect(sim.snapshot().fruit).not.toBeNull();

    drive(sim, 4, null); // the first Fruit times out
    expect(sim.snapshot().fruit).toBeNull();

    drive(sim, 4, null); // eats the Pellet at 11: second Fruit
    expect(sim.snapshot().fruit).not.toBeNull();
  });

  it("spends every spawn point crossed in one tick, showing one Fruit", () => {
    // At three tiles a tick, one tick crosses both spawn points at once.
    const maze = corridor(rowWith({ 2: ".", 10: ".", 11: ".", 12: ".", 13: "P" }));
    const sim = createSimulation({
      maze,
      seed: 1,
      difficulty: { pacmanTilesPerTick: 3 },
      fruit: { spawnPellets: [1, 2], spawnTile: { x: 20, y: CORRIDOR_ROW }, ticks: 1 },
    });

    drive(sim, 1, null);
    expect(sim.snapshot().fruit).not.toBeNull();

    drive(sim, 1, null); // it times out; the second point is already spent
    expect(sim.snapshot().fruit).toBeNull();
  });
});

describe("fruit scoring", () => {
  it("scores the current Level's Fruit value when eaten", () => {
    // PacMan at 15: eats the Pellet at 14 (spawning the Fruit over 12-13), then
    // reaches 13 and eats the Fruit.
    const maze = corridor(rowWith({ 2: ".", 11: " ", 12: " ", 13: " ", 14: ".", 15: "P" }));
    const sim = createSimulation({
      maze,
      seed: 1,
      fruit: { spawnPellets: [1], spawnTile: { x: 12, y: CORRIDOR_ROW } },
    });

    drive(sim, 8, null);
    expect(sim.snapshot().fruit).not.toBeNull();
    expect(sim.snapshot().score).toBe(10);

    drive(sim, 8, null);
    const snap = sim.snapshot();
    expect(snap.score).toBe(10 + fruitForLevel(1).points);
    expect(snap.fruit).toBeNull();
  });

  it("scores a Fruit reached on the same tick as the last Pellet", () => {
    // PacMan at 8 walks right: eats the Pellet at 9 (spawning the Fruit over
    // 10-11), then reaches 10 on the tick he eats the last Pellet there.
    const maze = corridor(rowWith({ 8: "P", 9: ".", 10: "." }));
    const sim = createSimulation({
      maze,
      seed: 1,
      fruit: { spawnPellets: [1], spawnTile: { x: 10, y: CORRIDOR_ROW } },
    });

    drive(sim, 16, "right");
    const snap = sim.snapshot();
    expect(snap.level).toBe(2);
    expect(snap.score).toBe(10 + 10 + fruitForLevel(1).points);
  });

  it("scores the points for the Level from the table", () => {
    expect(fruitForLevel(1)).toEqual({ kind: "cherry", points: 100 });
    expect(fruitForLevel(2)).toEqual({ kind: "strawberry", points: 300 });
    expect(fruitForLevel(3)).toEqual({ kind: "orange", points: 500 });
    expect(fruitForLevel(4)).toEqual({ kind: "orange", points: 500 });
    expect(fruitForLevel(5)).toEqual({ kind: "apple", points: 700 });
    expect(fruitForLevel(6)).toEqual({ kind: "apple", points: 700 });
    expect(fruitForLevel(7)).toEqual({ kind: "melon", points: 1000 });
    expect(fruitForLevel(9)).toEqual({ kind: "galaxian", points: 2000 });
    expect(fruitForLevel(11)).toEqual({ kind: "bell", points: 3000 });
    expect(fruitForLevel(12)).toEqual({ kind: "bell", points: 3000 });
    expect(fruitForLevel(13)).toEqual({ kind: "key", points: 5000 });
    expect(fruitForLevel(30)).toEqual({ kind: "key", points: 5000 });
  });
});

describe("fruit timeout", () => {
  it("disappears once its time runs out", () => {
    // The Fruit appears behind PacMan, so he cannot eat it before it times out.
    const maze = corridor(rowWith({ 2: ".", 12: ".", 13: "P" }));
    const sim = createSimulation({
      maze,
      seed: 1,
      fruit: { spawnPellets: [1], spawnTile: { x: 20, y: CORRIDOR_ROW }, ticks: 3 },
    });

    drive(sim, 8, null);
    expect(sim.snapshot().fruit?.ticksLeft).toBe(3);

    drive(sim, 2, null);
    expect(sim.snapshot().fruit).not.toBeNull();

    drive(sim, 1, null);
    expect(sim.snapshot().fruit).toBeNull();
  });
});
