import { describe, expect, it } from "vitest";
import type { GhostSnapshot, PelletMarker, Snapshot } from "../../core";
import type { FlowSnapshot, Screen } from "../gameFlow";
import { createSoundDriver } from "../sound";
import type { SoundSink } from "../sound";

function idleBoard(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    tick: 0,
    state: "playing",
    score: 0,
    lives: 3,
    level: 1,
    deathTicksLeft: 0,
    pelletsRemaining: 10,
    pellets: [],
    fruit: null,
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

function frame(screen: Screen, board: Snapshot): FlowSnapshot {
  return {
    screen,
    board,
    score: board.score,
    lives: board.lives,
    level: board.level,
    highScore: 0,
    transition: 0,
  };
}

function powerPellets(count: number): PelletMarker[] {
  const markers: PelletMarker[] = [];
  for (let i = 0; i < count; i += 1) markers.push({ tile: { x: i, y: 0 }, kind: "powerPellet" });
  return markers;
}

function ghost(id: GhostSnapshot["id"], mode: GhostSnapshot["mode"]): GhostSnapshot {
  return {
    id,
    mode,
    tile: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    direction: "left",
    frightenedTicksLeft: 0,
  };
}

type Sounds = {
  waka: number;
  power: number;
  ghost: number;
  death: number;
  siren: number[];
};

function listener(): { sink: SoundSink; sounds: Sounds } {
  const sounds: Sounds = { waka: 0, power: 0, ghost: 0, death: 0, siren: [] };
  return {
    sounds,
    sink: {
      playWaka: () => {
        sounds.waka += 1;
      },
      playPowerPellet: () => {
        sounds.power += 1;
      },
      playGhostEaten: () => {
        sounds.ghost += 1;
      },
      playDeath: () => {
        sounds.death += 1;
      },
      setSiren: (level) => {
        sounds.siren.push(level);
      },
    },
  };
}

describe("play events", () => {
  it("plays a waka when a Pellet is eaten", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("playing", idleBoard({ pelletsRemaining: 10 })));
    driver.step(frame("playing", idleBoard({ pelletsRemaining: 9 })));
    expect(sounds.waka).toBe(1);
  });

  it("plays the Power Pellet cue when a Power Pellet leaves, not a waka", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("playing", idleBoard({ pelletsRemaining: 10, pellets: powerPellets(4) })));
    driver.step(frame("playing", idleBoard({ pelletsRemaining: 9, pellets: powerPellets(3) })));
    expect(sounds.power).toBe(1);
    expect(sounds.waka).toBe(0);
  });

  it("plays the Ghost-eaten cue when a Ghost turns eaten", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("playing", idleBoard({ ghosts: [ghost("blinky", "chase")] })));
    driver.step(frame("playing", idleBoard({ ghosts: [ghost("blinky", "eaten")] })));
    expect(sounds.ghost).toBe(1);
    expect(sounds.waka).toBe(0);
  });

  it("plays once per Ghost eaten in the same tick", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(
      frame(
        "playing",
        idleBoard({ ghosts: [ghost("blinky", "frightened"), ghost("pinky", "chase")] }),
      ),
    );
    driver.step(
      frame("playing", idleBoard({ ghosts: [ghost("blinky", "eaten"), ghost("pinky", "eaten")] })),
    );
    expect(sounds.ghost).toBe(2);
  });

  it("still plays the Ghost-eaten cue when another Ghost respawns on the same tick", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(
      frame("playing", idleBoard({ ghosts: [ghost("blinky", "eaten"), ghost("pinky", "chase")] })),
    );
    driver.step(
      frame("playing", idleBoard({ ghosts: [ghost("blinky", "chase"), ghost("pinky", "eaten")] })),
    );
    expect(sounds.ghost).toBe(1);
  });

  it("plays the death cue once on entering the death screen", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("playing", idleBoard()));
    driver.step(frame("death", idleBoard({ state: "death" })));
    driver.step(frame("death", idleBoard({ state: "death" })));
    expect(sounds.death).toBe(1);
  });

  it("ignores play events while the run is not live", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("ready", idleBoard({ pelletsRemaining: 10 })));
    driver.step(frame("ready", idleBoard({ pelletsRemaining: 9 })));
    expect(sounds.waka).toBe(0);
    expect(sounds.power).toBe(0);
  });
});

describe("siren", () => {
  it("climbs with the share of the Level's Pellets eaten and stops off the live screen", () => {
    const { sink, sounds } = listener();
    const driver = createSoundDriver(sink);
    driver.step(frame("playing", idleBoard({ pelletsRemaining: 100 })));
    expect(sounds.siren.at(-1)).toBe(1);

    driver.step(frame("playing", idleBoard({ pelletsRemaining: 60 })));
    expect(sounds.siren.at(-1)).toBe(2);

    driver.step(frame("playing", idleBoard({ pelletsRemaining: 20 })));
    expect(sounds.siren.at(-1)).toBe(3);

    driver.step(frame("paused", idleBoard({ pelletsRemaining: 20 })));
    expect(sounds.siren.at(-1)).toBe(0);

    driver.step(frame("playing", idleBoard({ pelletsRemaining: 20 })));
    expect(sounds.siren.at(-1)).toBe(3);
  });
});
