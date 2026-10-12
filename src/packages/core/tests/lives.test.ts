import { describe, expect, it } from "vitest";
import { DEATH_TICKS, MAZE_COLUMNS, MAZE_ROWS, createSimulation, parseMaze } from "../index";
import type { Direction, GhostId, GhostPhase, GhostStart, Maze, Snapshot } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const ALWAYS_CHASE: readonly GhostPhase[] = [{ mode: "chase", ticks: Infinity }];
const ALWAYS_SCATTER: readonly GhostPhase[] = [{ mode: "scatter", ticks: Infinity }];

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

function start(
  id: GhostId,
  x: number,
  y: number,
  direction: Direction,
  mode: GhostStart["mode"],
): GhostStart {
  return { id, tile: { x, y }, direction, mode };
}

function ghost(snapshot: Snapshot, id: GhostId) {
  const found = snapshot.ghosts.find((g) => g.id === id);
  if (found === undefined) throw new Error(`no ghost ${id}`);
  return found;
}

/** An open corridor with PacMan at (13, 14). */
function corridor(): Maze {
  const rows = blank();
  openRow(rows, 14, 6, 22);
  rows[14]![13] = "P";
  return mazeOf(rows);
}

/** PacMan parked at (13, 14) with a chasing Blinky three tiles to his right. */
function huntedSim(lives?: number): Sim {
  return createSimulation({
    maze: corridor(),
    seed: 1,
    ...(lives === undefined ? {} : { lives }),
    ghosts: { starts: [start("blinky", 16, 14, "left", "chase")], schedule: ALWAYS_CHASE },
  });
}

/** Steps until `predicate` holds, returning the tick it did, or -1 if it never did. */
function stepUntil(sim: Sim, predicate: (snapshot: Snapshot) => boolean, max = 1000): number {
  for (let i = 0; i < max; i += 1) {
    sim.step({ desired: null });
    if (predicate(sim.snapshot())) return i;
  }
  return -1;
}

/** Like `stepUntil`, but holding a direction each tick. */
function driveUntil(
  sim: Sim,
  desired: Direction,
  predicate: (snapshot: Snapshot) => boolean,
  max = 400,
): number {
  for (let i = 0; i < max; i += 1) {
    sim.step({ desired });
    if (predicate(sim.snapshot())) return i;
  }
  return -1;
}

describe("lives and the death sequence", () => {
  it("starts in play with three lives", () => {
    const snap = huntedSim().snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.lives).toBe(3);
    expect(snap.deathTicksLeft).toBe(0);
  });

  it("starts the death sequence and costs a life when a hunted PacMan is caught", () => {
    const sim = huntedSim();
    const tick = stepUntil(sim, (snap) => snap.state === "death");

    expect(tick).toBeGreaterThanOrEqual(0);
    const snap = sim.snapshot();
    expect(snap.lives).toBe(2);
    expect(snap.deathTicksLeft).toBeGreaterThan(0);
    expect(snap.deathTicksLeft).toBeLessThanOrEqual(DEATH_TICKS);
  });

  it("holds PacMan still while the death animation plays", () => {
    const sim = huntedSim();
    stepUntil(sim, (snap) => snap.state === "death");
    const atDeath = sim.snapshot();

    for (let i = 0; i < 10; i += 1) sim.step({ desired: "up" });
    const during = sim.snapshot();
    expect(during.state).toBe("death");
    expect(during.pacman.position).toEqual(atDeath.pacman.position);
    expect(during.pacman.direction).toBe(atDeath.pacman.direction);
    expect(during.deathTicksLeft).toBe(atDeath.deathTicksLeft - 10);
  });

  it("respawns PacMan and the Ghosts at their starting positions", () => {
    const sim = huntedSim();
    stepUntil(sim, (snap) => snap.state === "death");
    const tick = stepUntil(sim, (snap) => snap.state !== "death", DEATH_TICKS + 5);

    expect(tick).toBeGreaterThanOrEqual(0);
    const snap = sim.snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.lives).toBe(2);
    expect(snap.pacman.tile).toEqual({ x: 13, y: 14 });
    expect(ghost(snap, "blinky").tile).toEqual({ x: 16, y: 14 });
  });

  it("eats a Frightened Ghost instead of dying to it", () => {
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
    const snap = sim.snapshot();
    expect(snap.score).toBe(200);
    expect(snap.state).toBe("playing");
    expect(snap.lives).toBe(3);
  });

  it("does not spend a life on the tick a Level clears", () => {
    // The only Pellet sits at Blinky's tile. PacMan eats it, the Level resets
    // the actors, and the stale move path must not be re-checked against the
    // fresh Ghosts.
    const rows = blank();
    openRow(rows, 14, 6, 22);
    rows[14]![10] = "P";
    rows[14]![14] = ".";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: { starts: [start("blinky", 14, 14, "right", "scatter")], schedule: ALWAYS_SCATTER },
    });

    const cleared = driveUntil(sim, "right", (snapshot) => snapshot.level === 2);
    expect(cleared).toBeGreaterThanOrEqual(0);
    const snap = sim.snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.lives).toBe(3);
  });

  it("does not die to a Ghost's eyes reaching home", () => {
    // Blinky's home is PacMan's tile. PacMan eats him, the eyes are already
    // home and rejoin as a hunter on the same tick; that tick was travelled as
    // eyes, so it must not cost a life.
    const rows = blank();
    openRow(rows, 14, 6, 22);
    rows[14]![12] = "#"; // pins PacMan in place
    rows[14]![13] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 13, 14, "left", "chase")],
        schedule: ALWAYS_CHASE,
        frightenedTicks: 600,
      },
    });

    const eaten = stepUntil(sim, (snapshot) => ghost(snapshot, "blinky").mode === "eaten", 100);
    expect(eaten).toBeGreaterThanOrEqual(0);
    const rejoined = stepUntil(sim, (snapshot) => ghost(snapshot, "blinky").mode !== "eaten", 400);
    expect(rejoined).toBeGreaterThanOrEqual(0);
    const snap = sim.snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.lives).toBe(3);
  });

  it("carries the Scatter/Chase clock across a death instead of restarting it", () => {
    // PacMan is caught during the Chase phase; after respawn the global clock
    // is still on Chase, not rewound to the opening Scatter.
    const rows = blank();
    openRow(rows, 14, 6, 22);
    rows[14]![6] = "P";
    const sim = createSimulation({
      maze: mazeOf(rows),
      seed: 1,
      ghosts: {
        starts: [start("blinky", 21, 14, "right", "scatter")],
        schedule: [
          { mode: "scatter", ticks: 60 },
          { mode: "chase", ticks: Infinity },
        ],
      },
    });

    const deathTick = stepUntil(sim, (snap) => snap.state === "death", 400);
    expect(deathTick).toBeGreaterThan(60);

    stepUntil(sim, (snap) => snap.state === "playing", DEATH_TICKS + 5);
    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("chase");
  });
});

describe("game over and restart", () => {
  it("ends the game once the last life is spent", () => {
    const sim = huntedSim(1);
    const tick = stepUntil(sim, (snap) => snap.state === "gameOver", 500);

    expect(tick).toBeGreaterThanOrEqual(0);
    expect(sim.snapshot().lives).toBe(0);
    expect(sim.snapshot().deathTicksLeft).toBe(0);
  });

  it("spends all three lives before game over", () => {
    const sim = huntedSim();
    const tick = stepUntil(sim, (snap) => snap.state === "gameOver", 2000);

    expect(tick).toBeGreaterThanOrEqual(0);
    expect(sim.snapshot().lives).toBe(0);
  });

  it("freezes on game over until it is restarted", () => {
    const sim = huntedSim(1);
    stepUntil(sim, (snap) => snap.state === "gameOver", 500);
    const frozen = sim.snapshot();

    for (let i = 0; i < 30; i += 1) sim.step({ desired: "left" });
    const after = sim.snapshot();
    expect(after.state).toBe("gameOver");
    expect(after.pacman.position).toEqual(frozen.pacman.position);
    expect(after.score).toBe(frozen.score);
  });

  it("restarts a finished game from scratch", () => {
    const sim = huntedSim(1);
    stepUntil(sim, (snap) => snap.state === "gameOver", 500);

    sim.restart();
    const snap = sim.snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.tick).toBe(0);
    expect(snap.lives).toBe(1);
    expect(snap.score).toBe(0);
    expect(snap.level).toBe(1);
    expect(snap.deathTicksLeft).toBe(0);
    expect(snap.pacman.tile).toEqual({ x: 13, y: 14 });
    expect(ghost(snap, "blinky").tile).toEqual({ x: 16, y: 14 });
  });
});
