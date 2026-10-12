import { describe, expect, it } from "vitest";
import type { PelletMarker } from "../../core";
import { PARTICLE_TICKS, SHAKE_TICKS, createEffects } from "../effects";
import { frame, idleBoard } from "./fixtures";

function pelletsAt(count: number, kind: PelletMarker["kind"] = "pellet"): PelletMarker[] {
  const markers: PelletMarker[] = [];
  for (let i = 0; i < count; i += 1) markers.push({ tile: { x: i, y: 4 }, kind });
  return markers;
}

describe("Pellet particles", () => {
  it("spawns a fan of particles at the tile of an eaten Pellet", () => {
    const effects = createEffects();
    const before = [2, 3, 4].map((x) => ({ tile: { x, y: 4 }, kind: "pellet" as const }));
    effects.step(frame("playing", idleBoard({ pelletsRemaining: 3, pellets: before })));
    effects.step(frame("playing", idleBoard({ pelletsRemaining: 2, pellets: before.slice(1) })));

    const particles = effects.snapshot().particles;
    expect(particles.length).toBeGreaterThan(0);
    for (const particle of particles) {
      expect(particle.x).toBe(2.5);
      expect(particle.y).toBe(4.5);
    }
  });

  it("throws more particles for a Power Pellet than a Pellet", () => {
    const pelletEffects = createEffects();
    const before = pelletsAt(2);
    pelletEffects.step(frame("playing", idleBoard({ pelletsRemaining: 2, pellets: before })));
    pelletEffects.step(
      frame("playing", idleBoard({ pelletsRemaining: 1, pellets: before.slice(1) })),
    );

    const powerEffects = createEffects();
    const beforePower = pelletsAt(2, "powerPellet");
    powerEffects.step(frame("playing", idleBoard({ pelletsRemaining: 2, pellets: beforePower })));
    powerEffects.step(
      frame("playing", idleBoard({ pelletsRemaining: 1, pellets: beforePower.slice(1) })),
    );

    expect(powerEffects.snapshot().particles.length).toBeGreaterThan(
      pelletEffects.snapshot().particles.length,
    );
  });

  it("does not spawn while the run is not live", () => {
    const effects = createEffects();
    const before = pelletsAt(2);
    effects.step(frame("ready", idleBoard({ pelletsRemaining: 2, pellets: before })));
    effects.step(frame("ready", idleBoard({ pelletsRemaining: 1, pellets: before.slice(1) })));
    expect(effects.snapshot().particles).toHaveLength(0);
  });

  it("spawns for the last Pellet on a Level change, not for the refilled Maze", () => {
    const effects = createEffects();
    effects.step(
      frame(
        "playing",
        idleBoard({
          level: 1,
          pelletsRemaining: 1,
          pellets: [{ tile: { x: 7, y: 9 }, kind: "pellet" }],
        }),
      ),
    );
    effects.step(
      frame("levelClear", idleBoard({ level: 2, pelletsRemaining: 244, pellets: pelletsAt(40) })),
    );

    const particles = effects.snapshot().particles;
    expect(particles.length).toBeGreaterThan(0);
    expect(particles.length).toBeLessThan(20);
    for (const particle of particles) {
      expect(particle.x).toBe(7.5);
      expect(particle.y).toBe(9.5);
    }
  });

  it("fades each particle out after its lifetime", () => {
    const effects = createEffects();
    const before = pelletsAt(2);
    effects.step(frame("playing", idleBoard({ pelletsRemaining: 2, pellets: before })));
    effects.step(frame("playing", idleBoard({ pelletsRemaining: 1, pellets: before.slice(1) })));
    expect(effects.snapshot().particles.length).toBeGreaterThan(0);

    const staticBoard = idleBoard({ pelletsRemaining: 1, pellets: before.slice(1) });
    for (let i = 0; i < PARTICLE_TICKS; i += 1) {
      effects.step(frame("playing", staticBoard));
    }
    expect(effects.snapshot().particles).toHaveLength(0);
  });
});

describe("death shake", () => {
  it("starts a shake on entering death and settles to zero", () => {
    const effects = createEffects();
    effects.step(frame("playing", idleBoard()));
    effects.step(frame("death", idleBoard({ state: "death" })));

    const peak = Math.max(
      ...Array.from({ length: 6 }, () => {
        const shake = effects.snapshot().shake;
        effects.step(frame("death", idleBoard({ state: "death" })));
        return Math.max(Math.abs(shake.x), Math.abs(shake.y));
      }),
    );
    expect(peak).toBeGreaterThan(0);

    for (let i = 0; i < SHAKE_TICKS; i += 1) {
      effects.step(frame("death", idleBoard({ state: "death" })));
    }
    expect(effects.snapshot().shake).toEqual({ x: 0, y: 0 });
  });

  it("does not shake while playing", () => {
    const effects = createEffects();
    effects.step(frame("playing", idleBoard()));
    effects.step(frame("playing", idleBoard()));
    expect(effects.snapshot().shake).toEqual({ x: 0, y: 0 });
  });
});

describe("CRT filter", () => {
  it("defaults off and toggles", () => {
    const effects = createEffects();
    expect(effects.snapshot().crt).toBe(false);
    expect(effects.toggleCrt()).toBe(true);
    expect(effects.snapshot().crt).toBe(true);
    expect(effects.toggleCrt()).toBe(false);
    expect(effects.snapshot().crt).toBe(false);
  });
});
