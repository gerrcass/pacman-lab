import { describe, expect, it } from "vitest";
import { createAudio } from "../";
import type { AudioBackend, Tone } from "../";

type Calls = {
  tones: Tone[];
  sirenStarts: number[];
  sirenFrequency: number[];
  sirenStops: number;
  masterGain: number[];
  resumes: number;
};

function recording(): { backend: AudioBackend; calls: Calls } {
  const calls: Calls = {
    tones: [],
    sirenStarts: [],
    sirenFrequency: [],
    sirenStops: 0,
    masterGain: [],
    resumes: 0,
  };
  return {
    calls,
    backend: {
      tone: (tone) => calls.tones.push(tone),
      startSiren: (frequency) => calls.sirenStarts.push(frequency),
      setSirenFrequency: (frequency) => calls.sirenFrequency.push(frequency),
      stopSiren: () => {
        calls.sirenStops += 1;
      },
      setMasterGain: (value) => calls.masterGain.push(value),
      resume: () => {
        calls.resumes += 1;
      },
    },
  };
}

describe("one-shot sounds", () => {
  it("plays a waka tone", () => {
    const { backend, calls } = recording();
    createAudio({ backend }).playWaka();
    expect(calls.tones).toHaveLength(1);
    expect(calls.tones[0]!.type).toBe("square");
  });

  it("alternates the waka pitch so repeated Pellets read as waka-waka", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.playWaka();
    audio.playWaka();
    audio.playWaka();
    expect(calls.tones).toHaveLength(3);
    expect(calls.tones[0]!.frequency).not.toBe(calls.tones[1]!.frequency);
    expect(calls.tones[2]!.frequency).toBe(calls.tones[0]!.frequency);
  });

  it("gives the Power Pellet, Ghost-eaten, and death cues their own tones", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.playPowerPellet();
    audio.playGhostEaten();
    audio.playDeath();
    expect(calls.tones).toHaveLength(3);
    expect(calls.tones[0]!.sweepTo).toBeGreaterThan(calls.tones[0]!.frequency);
    expect(calls.tones[2]!.sweepTo).toBeLessThan(calls.tones[2]!.frequency);
  });
});

describe("siren", () => {
  it("starts once and climbs in pitch as the Level rises", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.setSiren(1);
    expect(calls.sirenStarts).toHaveLength(1);
    audio.setSiren(2);
    audio.setSiren(5);
    expect(calls.sirenStarts).toHaveLength(1);
    expect(calls.sirenFrequency.length).toBe(2);
    expect(calls.sirenFrequency[1]!).toBeGreaterThan(calls.sirenFrequency[0]!);
    expect(calls.sirenFrequency[1]!).toBeGreaterThan(calls.sirenStarts[0]!);
  });

  it("stops when the level falls to zero", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.setSiren(3);
    audio.setSiren(0);
    expect(calls.sirenStops).toBe(1);
  });

  it("does not retune while the level is unchanged", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.setSiren(2);
    audio.setSiren(2);
    audio.setSiren(2);
    expect(calls.sirenFrequency).toHaveLength(0);
  });
});

describe("mute", () => {
  it("silences the master bus, suppresses new tones, and stops the siren", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.setSiren(2);
    audio.setMuted(true);

    expect(calls.masterGain.at(-1)).toBe(0);
    expect(calls.sirenStops).toBe(1);

    audio.playWaka();
    expect(calls.tones).toHaveLength(0);
  });

  it("restores the master bus and lets tones play again", () => {
    const { backend, calls } = recording();
    const audio = createAudio({ backend });
    audio.setMuted(true);
    audio.setMuted(false);

    expect(calls.masterGain).toEqual([0, 1]);
    audio.playWaka();
    expect(calls.tones).toHaveLength(1);
  });

  it("toggles and reports the new state", () => {
    const { backend } = recording();
    const audio = createAudio({ backend });
    expect(audio.isMuted()).toBe(false);
    expect(audio.toggleMuted()).toBe(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.toggleMuted()).toBe(false);
  });
});

describe("resume", () => {
  it("delegates to the backend so a gesture can unlock the context", () => {
    const { backend, calls } = recording();
    createAudio({ backend }).resume();
    expect(calls.resumes).toBe(1);
  });
});
