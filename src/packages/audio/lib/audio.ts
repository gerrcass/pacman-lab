import { webAudioBackend } from "./backend";
import type { AudioBackend, Tone } from "./backend";

/**
 * The game's procedural sound effects, generated with the Web Audio API, with a
 * mute switch. The service knows nothing about the simulation: the app's sound
 * driver decides when to call it.
 */
export type AudioService = {
  /** Resumes the context after a user gesture. Safe to call repeatedly. */
  resume(): void;
  /** A Pellet was eaten: a short, alternating blip. */
  playWaka(): void;
  /** A Power Pellet was eaten: a rising blip. */
  playPowerPellet(): void;
  /** A Frightened Ghost was eaten: a quick rising sweep. */
  playGhostEaten(): void;
  /** PacMan died: a long falling sweep. */
  playDeath(): void;
  /** Sets the siren's intensity, 1 and up for the current Level, 0 to stop it. */
  setSiren(level: number): void;
  /** Silences (true) or restores (false) all audio. */
  setMuted(muted: boolean): void;
  /** Flips mute and returns the new state. */
  toggleMuted(): boolean;
  isMuted(): boolean;
};

/** Above this the siren pitch flattens; the arcade tops out well before it. */
const MAX_SIREN_LEVEL = 20;
/** The siren climbs with the Level: a base pitch plus a step per Level. */
const SIREN_BASE_HZ = 300;
const SIREN_STEP_HZ = 40;

const FULL_GAIN = 1;
const MUTED_GAIN = 0;

const WAKA_LOW_HZ = 440;
const WAKA_HIGH_HZ = 660;
const WAKA_SECONDS = 0.05;
const WAKA_GAIN = 0.18;
const POWER_HZ = 520;
const POWER_SWEEP_HZ = 1040;
const POWER_SECONDS = 0.22;
const POWER_GAIN = 0.22;
const GHOST_HZ = 400;
const GHOST_SWEEP_HZ = 1200;
const GHOST_SECONDS = 0.18;
const GHOST_GAIN = 0.22;
const DEATH_HZ = 640;
const DEATH_SWEEP_HZ = 60;
const DEATH_SECONDS = 0.9;
const DEATH_GAIN = 0.28;

function sirenFrequency(level: number): number {
  return SIREN_BASE_HZ + (level - 1) * SIREN_STEP_HZ;
}

function createContext(): AudioContext {
  const Ctor = globalThis.AudioContext;
  if (Ctor === undefined) {
    throw new Error("The Web Audio API is unavailable in this environment");
  }
  return new Ctor();
}

/**
 * Builds the audio service. In the browser it creates a real AudioContext; a
 * test passes a recording backend instead, so the synth is exercised with no
 * audio hardware.
 */
export function createAudio(options: { backend?: AudioBackend } = {}): AudioService {
  const backend = options.backend ?? webAudioBackend(createContext());
  let muted = false;
  let sirenLevel = 0;
  let sirenActive = false;
  let wakaHigh = false;

  const applySiren = (): void => {
    if (muted || sirenLevel <= 0) {
      if (sirenActive) {
        backend.stopSiren();
        sirenActive = false;
      }
      return;
    }
    const frequency = sirenFrequency(sirenLevel);
    if (sirenActive) backend.setSirenFrequency(frequency);
    else {
      backend.startSiren(frequency);
      sirenActive = true;
    }
  };

  const play = (tone: Tone): void => {
    if (muted) return;
    backend.tone(tone);
  };

  const setMuted = (next: boolean): void => {
    muted = next;
    backend.setMasterGain(muted ? MUTED_GAIN : FULL_GAIN);
    applySiren();
  };

  return {
    resume: () => backend.resume(),

    playWaka: () => {
      wakaHigh = !wakaHigh;
      play({
        type: "square",
        frequency: wakaHigh ? WAKA_HIGH_HZ : WAKA_LOW_HZ,
        duration: WAKA_SECONDS,
        gain: WAKA_GAIN,
      });
    },

    playPowerPellet: () =>
      play({
        type: "square",
        frequency: POWER_HZ,
        sweepTo: POWER_SWEEP_HZ,
        duration: POWER_SECONDS,
        gain: POWER_GAIN,
      }),

    playGhostEaten: () =>
      play({
        type: "square",
        frequency: GHOST_HZ,
        sweepTo: GHOST_SWEEP_HZ,
        duration: GHOST_SECONDS,
        gain: GHOST_GAIN,
      }),

    playDeath: () =>
      play({
        type: "sawtooth",
        frequency: DEATH_HZ,
        sweepTo: DEATH_SWEEP_HZ,
        duration: DEATH_SECONDS,
        gain: DEATH_GAIN,
      }),

    setSiren: (level) => {
      const next = Math.max(0, Math.min(MAX_SIREN_LEVEL, Math.floor(level)));
      if (next === sirenLevel) return;
      sirenLevel = next;
      applySiren();
    },

    setMuted,

    toggleMuted: () => {
      setMuted(!muted);
      return muted;
    },

    isMuted: () => muted,
  };
}
