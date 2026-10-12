import { describe, expect, it } from "vitest";
import { CLASSIC_MAZE, createSimulation } from "../../core";
import type { Simulation, Snapshot } from "../../core";
import { createGameFlow } from "../gameFlow";
import type { FlowInput, HighScoreStore } from "../gameFlow";

const IDLE: FlowInput = { desired: null, start: false, pause: false };

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    tick: 0,
    state: "playing",
    score: 0,
    lives: 3,
    level: 1,
    deathTicksLeft: 0,
    pelletsRemaining: 10,
    pellets: [],
    pacman: {
      tile: { x: 0, y: 0 },
      position: { x: 0, y: 0 },
      direction: "left",
      next: null,
    },
    ghosts: [],
    ...overrides,
  };
}

/** A Simulation whose snapshots are scripted, so flow transitions can be driven exactly. */
function scriptedSim(frames: readonly Snapshot[]): { sim: Simulation; steps: () => number } {
  let index = 0;
  let steps = 0;
  return {
    sim: {
      step: () => {
        steps += 1;
        index = Math.min(index + 1, frames.length - 1);
      },
      snapshot: () => frames[index]!,
      restart: () => {
        index = 0;
      },
    },
    steps: () => steps,
  };
}

function memoryStore(initial = 0): { store: HighScoreStore; value: () => number } {
  let value = initial;
  return {
    store: {
      read: () => value,
      write: (next) => {
        value = next;
      },
    },
    value: () => value,
  };
}

type Flow = ReturnType<typeof createGameFlow>;

/** Steps until the flow reaches `screen`, without stepping past it. */
function stepUntil(flow: Flow, screen: string): void {
  for (let i = 0; i < 200 && flow.snapshot().screen !== screen; i += 1) flow.step(IDLE);
}

function toTitle(flow: Flow): void {
  stepUntil(flow, "title");
}

function toPlaying(flow: Flow): void {
  flow.step({ ...IDLE, start: true });
  stepUntil(flow, "playing");
}

describe("game flow screens", () => {
  it("boots to the title screen", () => {
    const { sim } = scriptedSim([snapshot()]);
    const flow = createGameFlow({ simulation: sim, highScore: memoryStore().store, bootTicks: 2 });

    expect(flow.snapshot().screen).toBe("boot");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("boot");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("title");
  });

  it("starts a run from the title only when start is pressed", () => {
    const { sim } = scriptedSim([snapshot()]);
    const flow = createGameFlow({ simulation: sim, highScore: memoryStore().store, bootTicks: 1 });

    toTitle(flow);
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("title");

    flow.step({ ...IDLE, start: true });
    expect(flow.snapshot().screen).toBe("ready");
  });

  it("restarts the simulation when a run begins", () => {
    const { sim, steps } = scriptedSim([snapshot({ tick: 50 })]);
    const flow = createGameFlow({ simulation: sim, highScore: memoryStore().store, bootTicks: 1 });

    toTitle(flow);
    flow.step({ ...IDLE, start: true });
    expect(steps()).toBe(0);
    expect(flow.snapshot().score).toBe(0);
  });

  it("shows READY before each Level, then plays", () => {
    const { sim } = scriptedSim([snapshot()]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 2,
    });

    toTitle(flow);
    flow.step({ ...IDLE, start: true });
    expect(flow.snapshot().screen).toBe("ready");

    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("ready");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("playing");
  });
});

describe("pause", () => {
  it("pauses and unpauses during play", () => {
    const { sim } = scriptedSim([snapshot()]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    expect(flow.snapshot().screen).toBe("playing");

    flow.step({ ...IDLE, pause: true });
    expect(flow.snapshot().screen).toBe("paused");

    flow.step({ ...IDLE, pause: true });
    expect(flow.snapshot().screen).toBe("playing");
  });

  it("does not advance the simulation while paused", () => {
    const { sim, steps } = scriptedSim([snapshot()]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    flow.step({ ...IDLE, pause: true });
    const before = steps();
    flow.step(IDLE);
    flow.step(IDLE);
    expect(steps()).toBe(before);
  });
});

describe("death and game over", () => {
  it("enters the death screen and returns to READY after respawning", () => {
    const { sim } = scriptedSim([
      snapshot(),
      snapshot({ state: "death", lives: 2 }),
      snapshot({ state: "death", lives: 2 }),
      snapshot({ state: "playing", lives: 2 }),
    ]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    expect(flow.snapshot().screen).toBe("playing");

    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("death");
    expect(flow.snapshot().lives).toBe(2);

    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("death");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("ready");
  });

  it("ends in game over when the lives run out", () => {
    const { sim } = scriptedSim([
      snapshot(),
      snapshot({ state: "death", lives: 0 }),
      snapshot({ state: "gameOver", lives: 0, score: 120 }),
    ]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("death");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("gameOver");
    expect(flow.snapshot().score).toBe(120);
  });

  it("restarts a fresh run from game over when start is pressed", () => {
    const { sim } = scriptedSim([
      snapshot(),
      snapshot({ state: "gameOver", lives: 0, score: 120 }),
    ]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("gameOver");

    flow.step({ ...IDLE, start: true });
    expect(flow.snapshot().screen).toBe("ready");
    expect(flow.snapshot().score).toBe(0);
  });
});

describe("Level clear", () => {
  it("shows LEVEL CLEAR after clearing a Level, then READY again", () => {
    const { sim } = scriptedSim([snapshot({ level: 1 }), snapshot({ level: 2, score: 2440 })]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
      levelClearTicks: 2,
    });

    toTitle(flow);
    toPlaying(flow);
    expect(flow.snapshot().screen).toBe("playing");

    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("levelClear");
    expect(flow.snapshot().level).toBe(2);

    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("levelClear");
    flow.step(IDLE);
    expect(flow.snapshot().screen).toBe("ready");
  });
});

describe("high score", () => {
  it("loads the stored high score", () => {
    const { sim } = scriptedSim([snapshot()]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore(7770).store,
      bootTicks: 1,
    });
    expect(flow.snapshot().highScore).toBe(7770);
  });

  it("records and persists a new high score as the run is played", () => {
    const { sim } = scriptedSim([snapshot({ score: 500 }), snapshot({ score: 900 })]);
    const memory = memoryStore(100);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memory.store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    flow.step(IDLE);
    expect(flow.snapshot().highScore).toBe(900);
    expect(memory.value()).toBe(900);
  });

  it("keeps the stored high score when the run does not beat it", () => {
    const { sim } = scriptedSim([snapshot({ score: 500 })]);
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore(1000).store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    flow.step(IDLE);
    expect(flow.snapshot().highScore).toBe(1000);
  });
});

describe("integration with the real simulation", () => {
  it("plays through the title into the running simulation", () => {
    const sim = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
    const flow = createGameFlow({
      simulation: sim,
      highScore: memoryStore().store,
      bootTicks: 1,
      readyTicks: 1,
    });

    toTitle(flow);
    toPlaying(flow);
    expect(flow.snapshot().screen).toBe("playing");

    flow.step(IDLE);
    expect(flow.snapshot().board.tick).toBeGreaterThan(0);
  });
});
