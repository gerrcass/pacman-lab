import { describe, expect, it } from "vitest";
import {
  CLASSIC_MAZE,
  MAZE_COLUMNS,
  MAZE_ROWS,
  createSimulation,
  ghostReleaseDots,
  ghostTilesPerTick,
  parseMaze,
  scatterChaseSchedule,
} from "../index";
import type { Direction, GhostId, GhostPhase, GhostStart, Maze, Snapshot } from "../index";

const WALL_ROW = "#".repeat(MAZE_COLUMNS);
const ALWAYS_CHASE: readonly GhostPhase[] = [{ mode: "chase", ticks: Infinity }];
const ALWAYS_SCATTER: readonly GhostPhase[] = [{ mode: "scatter", ticks: Infinity }];

type Sim = ReturnType<typeof createSimulation>;

function step(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) sim.step({ desired: null });
}

function ghost(snapshot: Snapshot, id: GhostId) {
  const found = snapshot.ghosts.find((g) => g.id === id);
  if (found === undefined) throw new Error(`no ghost ${id}`);
  return found;
}

function start(id: GhostId, x: number, y: number, direction: Direction, mode: GhostStart["mode"]) {
  return { id, tile: { x, y }, direction, mode };
}

/** All walls but a plus-shaped junction at column 14 / row 14, with a sealed PacMan pocket. */
function cross(pacX = 10, pacY = 10): Maze {
  const grid = Array.from({ length: MAZE_ROWS }, () => WALL_ROW.split(""));
  for (let x = 6; x <= 22; x += 1) grid[14]![x] = " ";
  for (let y = 8; y <= 20; y += 1) grid[y]![14] = " ";
  grid[pacY]![pacX] = "P";
  return parseMaze(grid.map((row) => row.join("")));
}

function targetSim(
  starts: readonly GhostStart[],
  maze: Maze = cross(),
  schedule: readonly GhostPhase[] = ALWAYS_CHASE,
): Sim {
  return createSimulation({ maze, seed: 1, ghosts: { starts, schedule } });
}

describe("ghost house", () => {
  it("starts with Blinky out of the house and the other three inside", () => {
    const snapshot = createSimulation({ maze: CLASSIC_MAZE, seed: 1 }).snapshot();
    expect(ghost(snapshot, "blinky").mode).toBe("scatter");
    expect(ghost(snapshot, "pinky").mode).toBe("house");
    expect(ghost(snapshot, "inky").mode).toBe("house");
    expect(ghost(snapshot, "clyde").mode).toBe("house");
  });

  it("releases house Ghosts in staggered Pellet order", () => {
    const sim = createSimulation({
      maze: CLASSIC_MAZE,
      seed: 1,
      ghosts: { releaseDots: { pinky: 0, inky: 2, clyde: 4 } },
    });

    step(sim, 16); // one Pellet eaten
    expect(ghost(sim.snapshot(), "inky").mode).toBe("house");
    expect(ghost(sim.snapshot(), "clyde").mode).toBe("house");

    step(sim, 8); // two Pellets eaten
    expect(ghost(sim.snapshot(), "pinky").mode).not.toBe("house");
    expect(ghost(sim.snapshot(), "inky").mode).not.toBe("house");
    expect(ghost(sim.snapshot(), "clyde").mode).toBe("house");

    step(sim, 16); // four Pellets eaten
    expect(ghost(sim.snapshot(), "clyde").mode).not.toBe("house");
  });

  it("carries a released Ghost through the door onto the grid", () => {
    const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
    step(sim, 30);
    const pinky = ghost(sim.snapshot(), "pinky");
    // Pinky leaves through the door tile above the house and onto row 11.
    expect(pinky.tile.y).toBe(11);
    expect(pinky.mode).not.toBe("house");
  });
});

describe("per-Ghost targeting", () => {
  it("Blinky targets PacMan's tile directly", () => {
    const sim = targetSim([start("blinky", 14, 14, "left", "chase")], cross(14, 5));
    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "blinky").direction).toBe("up");
  });

  it("Pinky targets four tiles ahead of PacMan", () => {
    const sim = targetSim([start("pinky", 14, 14, "left", "chase")], cross(10, 10));
    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "pinky").direction).toBe("left");
  });

  it("Inky targets the vector doubled from Blinky through two tiles ahead of PacMan", () => {
    const near = targetSim(
      [start("blinky", 8, 8, "left", "scatter"), start("inky", 14, 14, "left", "chase")],
      cross(10, 10),
    );
    near.step({ desired: null });
    expect(ghost(near.snapshot(), "inky").direction).toBe("left");

    const far = targetSim(
      [start("blinky", 8, 30, "left", "scatter"), start("inky", 14, 14, "left", "chase")],
      cross(10, 10),
    );
    far.step({ desired: null });
    expect(ghost(far.snapshot(), "inky").direction).toBe("up");
  });

  it("Clyde chases when far and breaks off to his corner when close", () => {
    const far = targetSim([start("clyde", 14, 14, "left", "chase")], cross(5, 0));
    far.step({ desired: null });
    expect(ghost(far.snapshot(), "clyde").direction).toBe("up");

    const near = targetSim([start("clyde", 14, 14, "left", "chase")], cross(10, 10));
    near.step({ desired: null });
    expect(ghost(near.snapshot(), "clyde").direction).toBe("down");
  });

  it("Scatter sends each Ghost toward its home corner", () => {
    const sim = targetSim([start("blinky", 14, 14, "left", "scatter")], cross(), ALWAYS_SCATTER);
    sim.step({ desired: null });
    // Blinky's corner is the top-right; from (14,14) the shortcut is up the column.
    expect(ghost(sim.snapshot(), "blinky").direction).toBe("up");
  });
});

describe("Scatter/Chase schedule", () => {
  it("alternates on the arcade level-1 schedule", () => {
    expect(scatterChaseSchedule(1)[0]).toEqual({ mode: "scatter", ticks: 420 });

    const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
    step(sim, 420);
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("scatter");
    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("chase");
  });

  it("returns to Scatter when the Chase phase expires", () => {
    const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
    step(sim, 420 + 1200);
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("chase");
    sim.step({ desired: null });
    expect(ghost(sim.snapshot(), "blinky").mode).toBe("scatter");
  });

  it("reverses every active Ghost on a mode change", () => {
    const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
    step(sim, 420);
    const before = ghost(sim.snapshot(), "blinky").direction;
    sim.step({ desired: null });
    const after = ghost(sim.snapshot(), "blinky").direction;
    expect(after).toBe(before === "left" ? "right" : before === "right" ? "left" : after);
    expect(after).not.toBe(before);
  });
});

describe("difficulty tables", () => {
  it("scales Ghost speed up by Level tier", () => {
    const level1 = ghostTilesPerTick(1, 1 / 8);
    const level2 = ghostTilesPerTick(2, 1 / 8);
    const level5 = ghostTilesPerTick(5, 1 / 8);
    expect(level1).toBeCloseTo(0.1171875, 6);
    expect(level2).toBeCloseTo(0.1328125, 6);
    expect(level5).toBeCloseTo(0.1484375, 6);
    expect(level2).toBeGreaterThan(level1);
    expect(level5).toBeGreaterThan(level2);
  });

  it("applies the level-1 Ghost speed on the grid", () => {
    const sim = targetSim([start("blinky", 14, 14, "left", "chase")], cross(5, 10));
    step(sim, 40);
    const speed = ghostTilesPerTick(1, 1 / 8);
    expect(ghost(sim.snapshot(), "blinky").position.x).toBeCloseTo(14 - 40 * speed, 5);
  });

  it("stores the arcade house release dot limits", () => {
    expect(ghostReleaseDots()).toEqual({ pinky: 0, inky: 30, clyde: 60 });
  });
});
