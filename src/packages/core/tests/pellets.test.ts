import { describe, expect, it } from "vitest";
import { CLASSIC_MAZE, MAZE_COLUMNS, MAZE_ROWS, createSimulation, parseMaze } from "../index";
import type { Direction, Maze, Snapshot } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const CORRIDOR_ROW = 14;

function rowWith(cells: Readonly<Record<number, string>>): string {
  const cells_ = Array.from({ length: MAZE_COLUMNS }, () => "#");
  for (const [x, char] of Object.entries(cells)) cells_[Number(x)] = char;
  return cells_.join("");
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

/** A full corridor of Pellets with PacMan at (13, 14), facing left. */
function pelletedCorridor(overrides: Readonly<Record<number, string>> = {}): Maze {
  const cells: Record<number, string> = {};
  for (let x = 0; x < MAZE_COLUMNS; x += 1) cells[x] = ".";
  cells[13] = "P";
  return corridor(rowWith({ ...cells, ...overrides }));
}

function simOn(maze: Maze): ReturnType<typeof createSimulation> {
  return createSimulation({ maze, seed: 1 });
}

describe("pellet accounting", () => {
  it("counts every Pellet and Power Pellet in the Maze", () => {
    const snap = simOn(CLASSIC_MAZE).snapshot();
    expect(snap.pelletsRemaining).toBe(244);
    expect(snap.pellets).toHaveLength(244);
  });

  it("starts at Level 1 with no score", () => {
    const snap = simOn(CLASSIC_MAZE).snapshot();
    expect(snap.score).toBe(0);
    expect(snap.level).toBe(1);
  });

  it("scores 10 for a Pellet and decrements the count", () => {
    const sim = simOn(pelletedCorridor());
    drive(sim, 8, null);
    const snap = sim.snapshot();
    expect(snap.score).toBe(10);
    expect(snap.pelletsRemaining).toBe(26);
  });

  it("scores 50 for a Power Pellet", () => {
    const sim = simOn(pelletedCorridor({ 12: "o" }));
    drive(sim, 8, null);
    const snap = sim.snapshot();
    expect(snap.score).toBe(50);
    expect(snap.pelletsRemaining).toBe(26);
  });

  it("does not score the same Pellet twice", () => {
    // Pellet at 12, a wall at 11 to park PacMan on it, and a distant Pellet so
    // the Maze is not cleared.
    const maze = corridor(rowWith({ 11: "#", 12: ".", 13: "P", 20: "." }));
    const sim = simOn(maze);
    drive(sim, 200, "left");
    const snap = sim.snapshot();
    expect(snap.score).toBe(10);
    expect(snap.pelletsRemaining).toBe(1);
    expect(snap.level).toBe(1);
  });

  it("reports the remaining Pellet tiles for rendering", () => {
    const sim = simOn(pelletedCorridor());
    expect(sim.snapshot().pellets).toContainEqual({
      tile: { x: 12, y: CORRIDOR_ROW },
      kind: "pellet",
    });
    drive(sim, 8, null);
    const after = sim.snapshot();
    expect(after.pellets).not.toContainEqual({
      tile: { x: 12, y: CORRIDOR_ROW },
      kind: "pellet",
    });
    expect(after.pellets).toHaveLength(after.pelletsRemaining);
  });

  it("eats every Pellet crossed in a single tick at high speed", () => {
    const sim = createSimulation({
      maze: pelletedCorridor(),
      seed: 1,
      difficulty: { pacmanTilesPerTick: 3 },
    });
    drive(sim, 1, null);
    const snap = sim.snapshot();
    expect(snap.score).toBe(30);
    expect(snap.pelletsRemaining).toBe(24);
  });
});

describe("level clear", () => {
  // Two Pellets in front of PacMan: 11 and 12, with PacMan at 13.
  const twoPellets = (): Maze => corridor(rowWith({ 11: ".", 12: ".", 13: "P" }));

  it("does not advance the Level until the last Pellet is eaten", () => {
    const sim = simOn(twoPellets());
    drive(sim, 8, null);
    const snap = sim.snapshot();
    expect(snap.level).toBe(1);
    expect(snap.pelletsRemaining).toBe(1);
    expect(snap.score).toBe(10);
  });

  it("advances the Level and resets the Maze once the last Pellet is eaten", () => {
    const sim = simOn(twoPellets());
    drive(sim, 9, null);
    const snap = sim.snapshot();
    expect(snap.level).toBe(2);
    expect(snap.pelletsRemaining).toBe(2);
    expect(snap.score).toBe(20);
  });

  it("returns PacMan to the start of the fresh Maze", () => {
    const sim = simOn(twoPellets());
    drive(sim, 9, null);
    const snap = sim.snapshot();
    expect(snap.pacman.tile).toEqual({ x: 13, y: CORRIDOR_ROW });
    expect(snap.pacman.direction).toBe("left");
    expect(snap.pacman.next).toBeNull();
  });

  it("resets the remaining Pellet tiles to the full Maze", () => {
    const sim = simOn(twoPellets());
    drive(sim, 9, null);
    const snap: Snapshot = sim.snapshot();
    expect(snap.pellets).toHaveLength(2);
    expect(snap.pellets).toContainEqual({ tile: { x: 11, y: CORRIDOR_ROW }, kind: "pellet" });
    expect(snap.pellets).toContainEqual({ tile: { x: 12, y: CORRIDOR_ROW }, kind: "pellet" });
  });
});
