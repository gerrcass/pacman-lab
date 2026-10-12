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

function powerPelletsLeft(pellets: readonly PelletMarker[]): number {
  let count = 0;
  for (const pellet of pellets) if (pellet.kind === "powerPellet") count += 1;
  return count;
}

function eatenGhosts(ghosts: readonly GhostSnapshot[]): number {
  let count = 0;
  for (const ghost of ghosts) if (ghost.mode === "eaten") count += 1;
  return count;
}

/**
 * Maps changes in the flow's snapshots to sound effects. It reads only the
 * public snapshot: a Pellet eaten, a Power Pellet gone, a Ghost turned eaten,
 * or the run ending. The siren plays while the run is live and climbs with the
 * Level, so the pressure rises as the Levels do.
 */
export function createSoundDriver(sink: SoundSink): SoundDriver {
  let previous: FlowSnapshot | null = null;

  return {
    step(snapshot) {
      const { screen, board } = snapshot;

      if (screen === "playing" && previous !== null && previous.screen === "playing") {
        const last = previous.board;
        const ghostsEaten = eatenGhosts(board.ghosts) - eatenGhosts(last.ghosts);
        const powersEaten = powerPelletsLeft(last.pellets) - powerPelletsLeft(board.pellets);
        if (ghostsEaten > 0) {
          for (let i = 0; i < ghostsEaten; i += 1) sink.playGhostEaten();
        } else if (powersEaten > 0) {
          sink.playPowerPellet();
        } else if (board.pelletsRemaining < last.pelletsRemaining) {
          sink.playWaka();
        }
      }

      if (screen === "death" && previous?.screen !== "death") sink.playDeath();

      sink.setSiren(screen === "playing" ? board.level : 0);
      previous = snapshot;
    },
  };
}
