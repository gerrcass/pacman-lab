/**
 * The slice of the Web Audio API the audio service drives. Keeping the service
 * on this seam lets its synth be exercised with a recording fake, so the sound
 * logic is tested without a real AudioContext.
 */

/** A one-shot tone: a fixed or swept frequency with a short decay. */
export type Tone = {
  readonly type: OscillatorType;
  readonly frequency: number;
  /** How long the tone lasts, in seconds. */
  readonly duration: number;
  /** Peak output level, 0 to 1. */
  readonly gain: number;
  /** When set, the frequency sweeps here across the tone's duration. */
  readonly sweepTo?: number;
};

export type AudioBackend = {
  /** Plays a one-shot tone. */
  tone(tone: Tone): void;
  /** Starts the looping siren at a frequency. */
  startSiren(frequency: number): void;
  /** Retunes a running siren. */
  setSirenFrequency(frequency: number): void;
  /** Stops the siren. */
  stopSiren(): void;
  /** Sets the master output gain: 0 silences everything, 1 restores it. */
  setMasterGain(value: number): void;
  /** Resumes a suspended context, after a user gesture. */
  resume(): void;
};

/** The master bus starts fully audible. */
const FULL_GAIN = 1;
/** The siren's steady level, kept under the one-shots. */
const SIREN_GAIN = 0.05;
/** Tones decay to near zero, not exactly zero, so the ramp can be exponential. */
const SILENCE = 0.0001;

/** The real Web Audio backend: oscillators and gain nodes, no audio assets. */
export function webAudioBackend(context: AudioContext): AudioBackend {
  const master = context.createGain();
  master.gain.value = FULL_GAIN;
  master.connect(context.destination);

  let siren: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  return {
    tone({ type, frequency, duration, gain, sweepTo }) {
      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (sweepTo !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
      }
      envelope.gain.setValueAtTime(gain, start);
      envelope.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration);
    },

    startSiren(frequency) {
      if (siren !== null) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.value = SIREN_GAIN;
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start();
      siren = { oscillator, gain };
    },

    setSirenFrequency(frequency) {
      siren?.oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    },

    stopSiren() {
      if (siren === null) return;
      siren.oscillator.stop();
      siren.oscillator.disconnect();
      siren.gain.disconnect();
      siren = null;
    },

    setMasterGain(value) {
      master.gain.setValueAtTime(value, context.currentTime);
    },

    resume() {
      void context.resume();
    },
  };
}
