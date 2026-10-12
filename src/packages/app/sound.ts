import type { GhostSnapshot, PelletMarker } from "../core";
import type { AudioService } from "../audio";
import type { FlowSnapshot } from "./gameFlow";

/** The audio calls the sound driver makes; the rest of the service is unused here. */
export type SoundSink = Pick<
  AudioService,
  "playWaka" | "playPowerPellet" | "playGhostEaten" | "playDeath" | "setSiren"
>;

export type SoundDriver = {
  /** Reads the flow's latest snapshot and triggers the sounds its changes imply. */
  step(snapshot: FlowSnapshot): void;
};

/** Pellets eaten in a Level before the siren climbs one step. */
const PELLETS_PER_SIREN_STEP = 40;

function powerPelletsLeft(pellets: readonly PelletMarker[]): number {
  let count = 0;
  for (const pellet of pellets) if (pellet.kind === "powerPellet") count += 1;
  return count;
}

/** Ghosts that were not eaten on the previous board but are now. */
function newlyEaten(previous: readonly GhostSnapshot[], current: readonly GhostSnapshot[]): number {
  let count = 0;
  for (const ghost of current) {
    if (ghost.mode !== "eaten") continue;
    const before = previous.find((prior) => prior.id === ghost.id);
    if (before === undefined || before.mode !== "eaten") count += 1;
  }
  return count;
}

/** The last Pellet left before a Level clear, which the next board no longer shows. */
function lastPelletKind(board: FlowSnapshot["board"]): PelletMarker["kind"] {
  return board.pellets.length === 1 ? board.pellets[0]!.kind : "pellet";
}

/**
 * Maps changes in the flow's snapshots to sound effects. It reads only the
 * public snapshot: a Pellet eaten, a Power Pellet gone, a Ghost turned eaten,
 * or the run ending. The siren plays while the run is live and climbs with the
 * share of the Level's Pellets already eaten, so the pressure rises as the Maze
 * empties.
 */
export function createSoundDriver(sink: SoundSink): SoundDriver {
  let previous: FlowSnapshot | null = null;
  let levelBase = 0;

  return {
    step(snapshot) {
      const { screen, board } = snapshot;
      const last = previous;
      const lastBoard = last?.board ?? null;

      // Rebase the danger counter on a fresh Level or a run that reset the
      // board, so the siren never reads pellets from an earlier Level.
      if (
        lastBoard === null ||
        board.level !== lastBoard.level ||
        board.pelletsRemaining > levelBase
      ) {
        levelBase = board.pelletsRemaining;
      }
      const eaten = Math.max(0, levelBase - board.pelletsRemaining);

      // The previous tick being live covers the tick a Level clears, when the
      // board has already refilled and the screen has already left "playing".
      if (last?.screen === "playing" && lastBoard !== null) {
        const powersEaten = powerPelletsLeft(lastBoard.pellets) - powerPelletsLeft(board.pellets);

        if (board.level > lastBoard.level) {
          // The last Pellet's board is gone; read its kind from the board that
          // still held it.
          if (lastPelletKind(lastBoard) === "powerPellet") sink.playPowerPellet();
          else sink.playWaka();
        } else if (powersEaten > 0) {
          sink.playPowerPellet();
        } else if (board.pelletsRemaining < lastBoard.pelletsRemaining) {
          sink.playWaka();
        }

        // Ghost cues are independent of the Pellet cue: both can land on one tick.
        const ghostsEaten = newlyEaten(lastBoard.ghosts, board.ghosts);
        for (let i = 0; i < ghostsEaten; i += 1) sink.playGhostEaten();
      }

      if (board.state === "death" && lastBoard?.state !== "death") sink.playDeath();

      sink.setSiren(screen === "playing" ? 1 + Math.floor(eaten / PELLETS_PER_SIREN_STEP) : 0);
      previous = snapshot;
    },
  };
}
