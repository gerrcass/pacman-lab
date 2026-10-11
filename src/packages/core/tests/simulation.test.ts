import { describe, expect, it } from "vitest";
import { CLASSIC_MAZE, MAZE_COLUMNS, MAZE_ROWS, createSimulation, parseMaze } from "../index";
import type { Direction, Intent, Maze, Snapshot } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const DEFAULT_SPEED = 1 / 8;

function mazeWithRow(y: number, row: string): Maze {
  const rows = Array.from({ length: MAZE_ROWS }, () => WALL_ROW);
  rows[y] = row;
  return parseMaze(rows);
}

/** A single open corridor on row 14, with PacMan at `pacX` and optional wall columns. */
function corridor(pacX: number, wallColumns: readonly number[] = []): Maze {
  const cells = Array.from({ length: MAZE_COLUMNS }, () => " ");
  for (const column of wallColumns) cells[column] = "#";
  cells[pacX] = "P";
  return mazeWithRow(14, cells.join(""));
}

function drive(
  sim: ReturnType<typeof createSimulation>,
  ticks: number,
  desired: Direction | null,
): void {
  for (let i = 0; i < ticks; i += 1) sim.step({ desired });
}

function simOn(maze: Maze) {
  return createSimulation({ maze, seed: 1 });
}

describe("the simulation seam", () => {
  it("starts PacMan at the maze start facing left", () => {
    const sim = simOn(CLASSIC_MAZE);
    const snap = sim.snapshot();
    expect(snap.tick).toBe(0);
    expect(snap.pacman.tile).toEqual(CLASSIC_MAZE.pacmanStart);
    expect(snap.pacman.position).toEqual(CLASSIC_MAZE.pacmanStart);
    expect(snap.pacman.direction).toBe("left");
    expect(snap.pacman.next).toBeNull();
  });

  it("returns an immutable-by-contract snapshot", () => {
    const sim = simOn(corridor(13));
    const first = sim.snapshot();
    sim.step({ desired: null });
    expect(first.tick).toBe(0);
    expect(sim.snapshot().tick).toBe(1);
  });
});

describe("PacMan movement", () => {
  it("moves one tile per eight ticks at the default speed", () => {
    const sim = simOn(corridor(13));
    drive(sim, 8, null);
    const snap = sim.snapshot();
    expect(snap.pacman.position).toEqual({ x: 13 - 8 * DEFAULT_SPEED, y: 14 });
    expect(snap.pacman.tile).toEqual({ x: 12, y: 14 });
  });

  it("keeps moving in the current direction without new input", () => {
    const sim = simOn(corridor(13));
    drive(sim, 16, null);
    expect(sim.snapshot().pacman.position.x).toBeCloseTo(11, 6);
  });

  it("stops at a wall", () => {
    const sim = simOn(corridor(20, [12]));
    drive(sim, 200, "left");
    const snap = sim.snapshot();
    expect(snap.pacman.position.x).toBeCloseTo(13, 6);
    expect(snap.pacman.tile.x).toBe(13);
  });

  it("buffers a turn that is illegal now and applies it at the first opening", () => {
    const sim = simOn(CLASSIC_MAZE);
    drive(sim, 17, "up");
    const snap = sim.snapshot();
    expect(snap.pacman.direction).toBe("up");
    expect(snap.pacman.tile).toEqual({ x: 12, y: 22 });
  });

  it("holds the buffered turn while it is blocked", () => {
    const sim = simOn(CLASSIC_MAZE);
    drive(sim, 1, "up");
    const snap = sim.snapshot();
    expect(snap.pacman.direction).toBe("left");
    expect(snap.pacman.next).toBe("up");
  });

  it("applies a buffered turn at a tile center at a non-default speed", () => {
    const sim = createSimulation({
      maze: CLASSIC_MAZE,
      seed: 1,
      difficulty: { pacmanTilesPerTick: 0.15 },
    });
    drive(sim, 40, "up");
    const snap = sim.snapshot();
    expect(snap.pacman.direction).toBe("up");
    expect(snap.pacman.position.x).toBeCloseTo(12, 6);
  });

  it("reverses instantly, even mid-tile", () => {
    const sim = simOn(corridor(13));
    drive(sim, 3, null);
    expect(sim.snapshot().pacman.position.x).toBeCloseTo(13 - 3 * DEFAULT_SPEED, 6);
    drive(sim, 1, "right");
    const snap = sim.snapshot();
    expect(snap.pacman.direction).toBe("right");
    expect(snap.pacman.position.x).toBeCloseTo(13 - 2 * DEFAULT_SPEED, 6);
  });
});

describe("tunnel wrap", () => {
  it("wraps through the left tunnel to the right edge", () => {
    const sim = simOn(corridor(3));
    drive(sim, 32, "left");
    const snap = sim.snapshot();
    expect(snap.pacman.tile).toEqual({ x: MAZE_COLUMNS - 1, y: 14 });
    expect(snap.pacman.position.x).toBeCloseTo(MAZE_COLUMNS - 1, 6);
  });

  it("wraps through the right tunnel to the left edge", () => {
    const sim = simOn(corridor(MAZE_COLUMNS - 4));
    drive(sim, 32, "right");
    const snap = sim.snapshot();
    expect(snap.pacman.tile).toEqual({ x: 0, y: 14 });
    expect(snap.pacman.position.x).toBeCloseTo(0, 6);
  });
});

describe("determinism", () => {
  it("replays a seed and intent sequence to an identical trace", () => {
    const intents: Intent[] = [
      { desired: "up" },
      { desired: null },
      { desired: "left" },
      { desired: "left" },
      { desired: "down" },
      { desired: "right" },
      { desired: null },
      { desired: "right" },
    ];

    const run = (): Snapshot[] => {
      const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 42 });
      const trace: Snapshot[] = [];
      for (let i = 0; i < 240; i += 1) {
        const intent = intents[i % intents.length];
        if (intent === undefined) throw new Error("intent sequence is empty");
        sim.step(intent);
        trace.push(sim.snapshot());
      }
      return trace;
    };

    expect(run()).toEqual(run());
  });
});
