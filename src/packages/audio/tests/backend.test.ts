import { describe, expect, it } from "vitest";
import { webAudioBackend } from "../";
import type { Tone } from "../";

type Param = {
  value: number;
  sets: Array<[number, number]>;
  ramps: Array<[number, number]>;
  setValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
};

type FakeOscillator = {
  type: OscillatorType;
  frequency: Param;
  connects: number;
  disconnects: number;
  starts: number[];
  stops: number[];
  connect(): void;
  disconnect(): void;
  start(time?: number): void;
  stop(time?: number): void;
};

type FakeGainNode = {
  gain: Param;
  connects: number;
  disconnects: number;
  connect(): void;
  disconnect(): void;
};

function makeParam(): Param {
  const param: Param = {
    value: 0,
    sets: [],
    ramps: [],
    setValueAtTime(value, time) {
      param.value = value;
      param.sets.push([value, time]);
    },
    exponentialRampToValueAtTime(value, time) {
      param.ramps.push([value, time]);
    },
  };
  return param;
}

function fakeAudio() {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeGainNode[] = [];
  let resumes = 0;

  const context = {
    currentTime: 0,
    destination: {},
    resume() {
      resumes += 1;
      return Promise.resolve();
    },
    createOscillator(): FakeOscillator {
      const osc: FakeOscillator = {
        type: "sine",
        frequency: makeParam(),
        connects: 0,
        disconnects: 0,
        starts: [],
        stops: [],
        connect() {
          osc.connects += 1;
        },
        disconnect() {
          osc.disconnects += 1;
        },
        start(time) {
          osc.starts.push(time ?? -1);
        },
        stop(time) {
          osc.stops.push(time ?? -1);
        },
      };
      oscillators.push(osc);
      return osc;
    },
    createGain(): FakeGainNode {
      const gain: FakeGainNode = {
        gain: makeParam(),
        connects: 0,
        disconnects: 0,
        connect() {
          gain.connects += 1;
        },
        disconnect() {
          gain.disconnects += 1;
        },
      };
      gains.push(gain);
      return gain;
    },
  };

  return {
    context: context as unknown as AudioContext,
    oscillators,
    gains,
    resumes: () => resumes,
  };
}

describe("webAudioBackend", () => {
  it("routes all sound through a master gain connected to the destination", () => {
    const { context, gains } = fakeAudio();
    webAudioBackend(context);
    expect(gains).toHaveLength(1);
    expect(gains[0]!.connects).toBe(1);
    expect(gains[0]!.gain.value).toBe(1);
  });

  it("plays a tone as an oscillator with a decaying envelope and a stop time", () => {
    const { context, oscillators, gains } = fakeAudio();
    const backend = webAudioBackend(context);
    const tone: Tone = { type: "square", frequency: 440, duration: 0.05, gain: 0.2 };
    backend.tone(tone);

    expect(oscillators).toHaveLength(1);
    const osc = oscillators[0]!;
    expect(osc.type).toBe("square");
    expect(osc.frequency.sets).toEqual([[440, 0]]);
    expect(osc.starts).toEqual([0]);
    expect(osc.stops).toEqual([0.05]);
    expect(osc.connects).toBe(1);

    const envelope = gains[1]!;
    expect(envelope.gain.sets[0]![0]).toBe(0.2);
    expect(envelope.gain.ramps[0]![0]).toBeGreaterThan(0);
    expect(envelope.gain.ramps[0]![0]).toBeLessThan(0.2);
    expect(envelope.connects).toBe(1);
  });

  it("sweeps the frequency toward the tone's target", () => {
    const { context, oscillators } = fakeAudio();
    webAudioBackend(context).tone({
      type: "square",
      frequency: 520,
      sweepTo: 1040,
      duration: 0.22,
      gain: 0.2,
    });
    expect(oscillators[0]!.frequency.ramps).toEqual([[1040, 0.22]]);
  });

  it("starts the siren once and retunes the running oscillator", () => {
    const { context, oscillators } = fakeAudio();
    const backend = webAudioBackend(context);
    backend.startSiren(300);
    backend.startSiren(500);
    expect(oscillators).toHaveLength(1);

    backend.setSirenFrequency(340);
    expect(oscillators[0]!.frequency.sets.at(-1)).toEqual([340, 0]);
  });

  it("stops and disconnects the siren, and does nothing on a second stop", () => {
    const { context, oscillators } = fakeAudio();
    const backend = webAudioBackend(context);
    backend.startSiren(300);
    backend.stopSiren();
    expect(oscillators[0]!.stops).toHaveLength(1);
    expect(oscillators[0]!.disconnects).toBe(1);

    backend.stopSiren();
    expect(oscillators[0]!.disconnects).toBe(1);
  });

  it("sets the master gain and resumes the context", () => {
    const { context, gains, resumes } = fakeAudio();
    const backend = webAudioBackend(context);
    backend.setMasterGain(0);
    expect(gains[0]!.gain.value).toBe(0);
    backend.setMasterGain(1);
    expect(gains[0]!.gain.value).toBe(1);

    backend.resume();
    expect(resumes()).toBe(1);
  });
});
