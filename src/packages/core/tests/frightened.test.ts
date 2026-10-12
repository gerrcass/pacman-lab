import { describe, expect, it } from "vitest";
import {
  MAZE_COLUMNS,
  MAZE_ROWS,
  createSimulation,
  frightenedGhostPoints,
  frightenedTicksForLevel,
  parseMaze,
} from "../index";
import type { Direction, GhostId, GhostPhase, GhostStart, Maze, Snapshot } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const ALWAYS_CHASE: readonly GhostPhase[] = [{ mode: "chase", ticks: Infinity }];

type Sim = ReturnType<typeof createSimulation>;

function blank(): string[][] {
  return Array.from({ length: MAZE_ROWS }, () => WALL_ROW.split(""));
}

function mazeOf(rows: string[][]): Maze {
  return parseMaze(rows.map((row) => row.join("")));
}

function openRow(rows: string[][], y: number, x0: number, x1: number): void {
  for (let x = x0; x <= x1; x += 1) rows[y]![x] = " ";
}

function openColumn(rows: string[][], x: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y += 1) rows[y]![x] = " ";
}

function start(
  id: GhostId,
  x: number,
  y: number,
  direction: Direction,
  mode: GhostStart["mode"],
): GhostStart {
  return { id, tile: { x, y }, direction, mode };
}

function step(sim: Sim, ticks: number, desired: Direction | null = null): void {
  for (let i = 0; i < ticks; i += 1) sim.step({ desired });
}

function ghost(snapshot: Snapshot, id: GhostId) {
  const found = snapshot.ghosts.find((g) => g.id === id);
  if (found === undefined) throw new Error(`no ghost ${id}`);
  return found;
}

function distanceToPacman(snapshot: Snapshot, id: GhostId): number {
  const g = ghost(snapshot, id);
  const dx = g.position.x - snapshot.pacman.position.x;
  const dy = g.position.y - snapshot.pacman.position.y;
  return Math.hypot(dx, dy);
}

describe("frightened: the Power Pellet flip", () => {
  it("turns an on-grid Ghost blue and reverses it", () => {
    // A straight corridor with a Power Pellet one tile left of PacMan. Blinky
    // heads away to the right; the Power Pellet must spin him around.
    const rows = blank();
    openRow(rows, 14, 6, 22);
    rows[14]![12] = "o";
    rows[14]![13] = "P";
    rows[1]![1] = "."; // keeps the Maze from clearing on the Power Pellet
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: { starts: [start("blinky", 16, 14, "right", "chase")], schedule: ALWAYS_CHASE },
    });

    step(sim, 8);
    const blinky = ghost(sim.snapshot(), "blinky");
    expect(blinky.mode).toBe("frightened");
    expect(blinky.direction).toBe("left");
    expect(blinky.frightenedTicksLeft).toBe(frightenedTicksForLevel(1));
  });

  it("does not reverse a Frightened Ghost on a Scatter/Chase change", () => {
    const rows = blank();
    openRow(rows, 14, 6, 22);
    rows[14]![12] = "o";
    rows[14]![13] = "P";
    rows[1]![1] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 18, 14, "left", "chase")],
        schedule: [
          { mode: "scatter", ticks: 10 },
          { mode: "chase", ticks: Infinity },
        ],
      },
    });

    step(sim, 8); // the Power Pellet reverses him from left to right
    expect(ghost(sim.snapshot(), "blinky").direction).toBe("right");

    step(sim, 4); // crosses the Scatter -> Chase change at tick 11
    const blinky = ghost(sim.snapshot(), "blinky");
    expect(blinky.mode).toBe("frightened");
    expect(blinky.direction).toBe("right");
  });

  it("resumes Scatter/Chase when the timer runs out", () => {
    const rows = blank();
    openRow(rows, 14, 1, 26);
    rows[14]![24] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 4, 14, "left", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 5,
      },
    });

    step(sim, 1);
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("frightened");

    step(sim, 5);
    const blinky = ghost(sim.snapshot(), "blinky");
    expect(blinky.mode).toBe("chase");
    expect(blinky.frightenedTicksLeft).toBe(0);
  });
});

describe("frightened: fleeing", () => {
  it("picks the direction that moves away from PacMan", () => {
    // A plus junction. PacMan sits above; the frightened Ghost at the centre
    // should head down, the farthest of its three open neighbours.
    const rows = blank();
    openRow(rows, 14, 6, 20);
    openColumn(rows, 13, 8, 20);
    rows[10]![13] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 13, 14, "right", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 300,
      },
    });

    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "blinky").direction).toBe("down");
  });

  it("widens the gap from PacMan instead of closing it", () => {
    const rows = blank();
    openRow(rows, 14, 1, 26);
    rows[14]![13] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 18, 14, "right", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 600,
      },
    });

    const before = distanceToPacman(sim.snapshot(), "blinky");
    step(sim, 60);
    const after = distanceToPacman(sim.snapshot(), "blinky");
    expect(after).toBeGreaterThan(before);
  });
});

describe("frightened: eating Ghosts", () => {
  it("doubles the value of each Ghost eaten in one Frightened stretch", () => {
    // A wrapping corridor with four Frightened Ghosts lined up to PacMan's
    // left. PacMan outruns them and eats all four in one Power Pellet.
    const rows = blank();
    openRow(rows, 14, 0, MAZE_COLUMNS - 1);
    rows[14]![24] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [
          start("blinky", 4, 14, "left", "chase"),
          start("pinky", 6, 14, "left", "chase"),
          start("inky", 8, 14, "left", "chase"),
          start("clyde", 10, 14, "left", "chase"),
        ],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 3000,
      },
    });

    step(sim, 1500);
    expect(sim.snapshot().score).toBe(200 + 400 + 800 + 1600);
  });

  it("turns an eaten Ghost into eyes and returns it to play", () => {
    // A vertical corridor from the house door up to PacMan. Blinky starts at
    // his home above the door, is eaten, races home as eyes, and rejoins there.
    const rows = blank();
    openColumn(rows, 13, 8, 20);
    rows[19]![13] = "o";
    rows[20]![13] = "P";
    rows[1]![1] = "."; // keeps the Maze from clearing on the Power Pellet
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: { starts: [start("blinky", 13, 11, "down", "chase")], schedule: ALWAYS_CHASE },
    });

    let eaten = false;
    let rejoined: Snapshot | null = null;
    for (let i = 0; i < 400; i += 1) {
      sim.step({ desired: eaten ? null : "up" });
      const blinky = ghost(sim.snapshot(), "blinky");
      if (blinky.mode === "eaten") eaten = true;
      if (eaten && blinky.mode !== "eaten") {
        rejoined = sim.snapshot();
        break;
      }
    }

    expect(eaten).toBe(true);
    expect(rejoined).not.toBeNull();
    const blinky = ghost(rejoined!, "blinky");
    expect(blinky.tile).toEqual({ x: 13, y: 11 });
    expect(blinky.frightenedTicksLeft).toBe(0);
  });

  it("rejoins a custom-home Blinky on the grid, not the house", () => {
    // Blinky's home is a plain corridor tile, not the classic door tile.
    const rows = blank();
    openRow(rows, 14, 4, 22);
    rows[14]![20] = "P";
    rows[1]![1] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 14, 14, "left", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 600,
      },
    });

    let eaten = false;
    let rejoinedMode: string | null = null;
    for (let i = 0; i < 600; i += 1) {
      sim.step({ desired: null });
      const blinky = ghost(sim.snapshot(), "blinky");
      if (blinky.mode === "eaten") eaten = true;
      if (eaten && blinky.mode !== "eaten") {
        rejoinedMode = blinky.mode;
        break;
      }
    }

    expect(eaten).toBe(true);
    expect(rejoinedMode).toBe("chase");
  });

  it("eats a Frightened Ghost crossed mid-tick at high speed", () => {
    // PacMan steps three tiles left while the Ghost steps right; they cross in
    // the middle of the tick and never share an end-of-tick position.
    const rows = blank();
    openRow(rows, 14, 0, MAZE_COLUMNS - 1);
    rows[14]![13] = "P";
    rows[1]![1] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      difficulty: { pacmanTilesPerTick: 3 },
      ghosts: {
        starts: [start("blinky", 12, 14, "right", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 600,
      },
    });

    sim.step({ desired: null });
    expect(sim.snapshot().score).toBe(200);
  });

  it("does not eat a Ghost that trails PacMan without meeting", () => {
    // Both head left; their paths overlap but they are never at the same place
    // at the same time, so no eat.
    const rows = blank();
    openRow(rows, 14, 0, MAZE_COLUMNS - 1);
    rows[14]![13] = "P";
    rows[1]![1] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      difficulty: { pacmanTilesPerTick: 3 },
      ghosts: {
        starts: [start("blinky", 14, 14, "left", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 600,
      },
    });

    sim.step({ desired: null });
    expect(sim.snapshot().score).toBe(0);
  });

  it("returns a house Ghost to the house and releases it again", () => {
    const rows = blank();
    openColumn(rows, 13, 8, 20);
    rows[19]![13] = "o";
    rows[20]![13] = "P";
    rows[1]![1] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: { starts: [start("pinky", 13, 14, "up", "chase")], schedule: ALWAYS_CHASE },
    });

    let eaten = false;
    let rejoined = false;
    let released = false;
    for (let i = 0; i < 500; i += 1) {
      sim.step({ desired: eaten ? null : "up" });
      const pinky = ghost(sim.snapshot(), "pinky");
      if (pinky.mode === "eaten") eaten = true;
      else if (eaten) rejoined = true;
      if (rejoined && pinky.tile.y === 11) {
        released = true;
        break;
      }
    }

    expect(eaten).toBe(true);
    expect(rejoined).toBe(true);
    expect(released).toBe(true);
  });
});

describe("frightened: tuning tables", () => {
  it("doubles the chain value and caps it at 1600", () => {
    expect(frightenedGhostPoints(0)).toBe(200);
    expect(frightenedGhostPoints(1)).toBe(400);
    expect(frightenedGhostPoints(2)).toBe(800);
    expect(frightenedGhostPoints(3)).toBe(1600);
    expect(frightenedGhostPoints(4)).toBe(1600);
  });

  it("shrinks Frightened time as Levels rise", () => {
    expect(frightenedTicksForLevel(1)).toBe(360);
    expect(frightenedTicksForLevel(2)).toBe(300);
    expect(frightenedTicksForLevel(5)).toBe(120);
    expect(frightenedTicksForLevel(17)).toBe(0);
  });
});
