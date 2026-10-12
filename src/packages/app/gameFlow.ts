import type { Direction, Simulation, Snapshot } from "../core";

/**
 * The game-flow screen the app is showing. `boot`, `title`, `ready`, `paused`,
 * `levelClear` and `gameOver` are orchestration around the simulation; `playing`
 * and `death` mirror the simulation's own state while its ticks are advancing.
 */
export type Screen =
  "boot" | "title" | "ready" | "playing" | "paused" | "death" | "levelClear" | "gameOver";

/** One tick of raw input, mapped from the keyboard by the app's input layer. */
export type FlowInput = {
  readonly desired: Direction | null;
  /** The start key was tapped: start a run, or restart one after game over. */
  readonly start: boolean;
  /** The pause key was tapped: toggle pause while playing. */
  readonly pause: boolean;
};

/** Where the high score is kept: localStorage in the app, a stub in tests. */
export type HighScoreStore = {
  read(): number;
  write(value: number): void;
};

export type FlowSnapshot = {
  readonly screen: Screen;
  /** The simulation's read-only board, for the render layer. */
  readonly board: Snapshot;
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly highScore: number;
  /** The black fade between screens, 1 (fully black) falling to 0. */
  readonly transition: number;
};

export type GameFlow = {
  step(input: FlowInput): void;
  snapshot(): FlowSnapshot;
};

/** Whether a tick moved the run onto the death screen: read from two snapshots. */
export function enteredDeath(previous: FlowSnapshot | null, current: FlowSnapshot): boolean {
  return current.board.state === "death" && previous?.board.state !== "death";
}

export type GameFlowConfig = {
  readonly simulation: Simulation;
  readonly highScore: HighScoreStore;
  /** Ticks the boot screen holds before the title. */
  readonly bootTicks?: number;
  /** Ticks the READY prompt holds before play begins. */
  readonly readyTicks?: number;
  /** Ticks the LEVEL CLEAR banner holds before the next READY. */
  readonly levelClearTicks?: number;
  /** Ticks the fade between screens lasts. */
  readonly transitionTicks?: number;
};

const BOOT_TICKS = 60;
const READY_TICKS = 90;
const LEVEL_CLEAR_TICKS = 90;
const TRANSITION_TICKS = 12;

/** Guards the score read back from storage against corrupt values. */
function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * The game-flow state machine: boot -> title -> ready -> playing -> paused ->
 * death -> levelClear -> gameOver. It owns which screen is showing and when a
 * run starts, pauses, respawns or ends, and drives the deterministic simulation
 * one tick at a time while playing or dying. It reads and writes the high score
 * through an injected store, so it stays free of DOM access.
 */
export function createGameFlow(config: GameFlowConfig): GameFlow {
  const sim = config.simulation;
  const store = config.highScore;
  const bootTicks = config.bootTicks ?? BOOT_TICKS;
  const readyTicks = config.readyTicks ?? READY_TICKS;
  const levelClearTicks = config.levelClearTicks ?? LEVEL_CLEAR_TICKS;
  const transitionTicks = config.transitionTicks ?? TRANSITION_TICKS;

  let screen: Screen = "boot";
  let bootTicksLeft = bootTicks;
  let readyTicksLeft = 0;
  let levelClearTicksLeft = 0;
  let transition = 1;
  let highScore = sanitize(store.read());
  let board = sim.snapshot();
  let lastLevel = board.level;

  const enter = (next: Screen): void => {
    screen = next;
    transition = 1;
    if (next === "ready") readyTicksLeft = readyTicks;
    if (next === "levelClear") levelClearTicksLeft = levelClearTicks;
  };

  const beginRun = (): void => {
    sim.restart();
    board = sim.snapshot();
    lastLevel = board.level;
    enter("ready");
  };

  const trackHighScore = (): void => {
    if (board.score <= highScore) return;
    highScore = board.score;
    store.write(highScore);
  };

  const step = (input: FlowInput): void => {
    if (transition > 0) transition = Math.max(0, transition - 1 / transitionTicks);

    switch (screen) {
      case "boot": {
        bootTicksLeft -= 1;
        if (bootTicksLeft <= 0) enter("title");
        return;
      }
      case "title": {
        if (input.start) beginRun();
        return;
      }
      case "ready": {
        readyTicksLeft -= 1;
        if (readyTicksLeft <= 0) enter("playing");
        return;
      }
      case "playing": {
        if (input.pause) {
          enter("paused");
          return;
        }
        sim.step({ desired: input.desired });
        board = sim.snapshot();
        trackHighScore();
        if (board.state === "death") enter("death");
        else if (board.state === "gameOver") enter("gameOver");
        else if (board.level > lastLevel) {
          lastLevel = board.level;
          enter("levelClear");
        }
        return;
      }
      case "paused": {
        if (input.pause) enter("playing");
        return;
      }
      case "death": {
        sim.step({ desired: null });
        board = sim.snapshot();
        if (board.state === "playing") enter("ready");
        else if (board.state === "gameOver") enter("gameOver");
        return;
      }
      case "levelClear": {
        levelClearTicksLeft -= 1;
        if (levelClearTicksLeft <= 0) enter("ready");
        return;
      }
      case "gameOver": {
        if (input.start) beginRun();
        return;
      }
    }
  };

  return {
    step,
    snapshot: () => ({
      screen,
      board,
      score: board.score,
      lives: board.lives,
      level: board.level,
      highScore,
      transition,
    }),
  };
}
