import type { PelletMarker } from "../core";
import type { Particle } from "../render";
import type { FlowSnapshot } from "./gameFlow";

/** Ticks a Pellet-eat particle lives before it fades out. */
export const PARTICLE_TICKS = 18;
/** Ticks the death screen shake lasts before it settles. */
export const SHAKE_TICKS = 24;

/** Particles thrown by a Pellet, and by a Power Pellet. */
const PELLET_PARTICLES = 4;
const POWER_PARTICLES = 8;
/** Draw radius in tile units, and the outward speed in tiles per tick. */
const PELLET_RADIUS_TILES = 0.4;
const POWER_RADIUS_TILES = 0.7;
const PARTICLE_SPEED = 0.06;
/** Downward pull in tiles per tick squared, so particles arc and fall. */
const PARTICLE_GRAVITY = 0.005;
/** Peak shake offset in virtual pixels, falling to zero over SHAKE_TICKS. */
const SHAKE_AMPLITUDE = 3;

/** A screen-space offset in virtual pixels; zero when nothing is shaking. */
export type Shake = { readonly x: number; readonly y: number };

export type EffectState = {
  readonly particles: readonly Particle[];
  readonly shake: Shake;
  readonly crt: boolean;
};

export type Effects = {
  /** Reads the flow's latest snapshot and advances the effects its changes imply. */
  step(snapshot: FlowSnapshot): void;
  /** Flips the CRT filter and returns its new state. */
  toggleCrt(): boolean;
  snapshot(): EffectState;
};

function tileKey(tile: { readonly x: number; readonly y: number }): string {
  return `${tile.x},${tile.y}`;
}

/** The Pellets that were on the previous board but are gone from this one. */
function eatenPellets(
  previous: readonly PelletMarker[],
  current: readonly PelletMarker[],
): readonly PelletMarker[] {
  const left = new Set(current.map((pellet) => tileKey(pellet.tile)));
  return previous.filter((pellet) => !left.has(tileKey(pellet.tile)));
}

/** Throws a ring of particles from a Pellet's tile centre. */
function spawnParticles(particles: Particle[], pellet: PelletMarker): void {
  const power = pellet.kind === "powerPellet";
  const count = power ? POWER_PARTICLES : PELLET_PARTICLES;
  const radius = power ? POWER_RADIUS_TILES : PELLET_RADIUS_TILES;
  const cx = pellet.tile.x + 0.5;
  const cy = pellet.tile.y + 0.5;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const speed = PARTICLE_SPEED * (0.7 + 0.3 * (i % 3));
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      life: PARTICLE_TICKS,
      maxLife: PARTICLE_TICKS,
      power,
    });
  }
}

/** Moves each particle one tick and drops the ones whose life has run out. */
function advanceParticles(particles: readonly Particle[]): Particle[] {
  const next: Particle[] = [];
  for (const particle of particles) {
    const life = particle.life - 1;
    if (life <= 0) continue;
    next.push({
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      vy: particle.vy + PARTICLE_GRAVITY,
      life,
    });
  }
  return next;
}

/** The shake offset at a given ticks-left, decaying to zero. */
function shakeOffset(ticksLeft: number): Shake {
  if (ticksLeft <= 0) return { x: 0, y: 0 };
  const decay = ticksLeft / SHAKE_TICKS;
  return {
    x: Math.sin(ticksLeft * 2.7) * SHAKE_AMPLITUDE * decay,
    y: Math.cos(ticksLeft * 3.3) * SHAKE_AMPLITUDE * decay * 0.6,
  };
}

/**
 * The visual-juice driver: it reads only the flow's public snapshot and turns
 * its changes into particles and a screen shake, the same way the sound driver
 * turns them into sound. Pellets eaten on a live tick throw particles at their
 * tile, and the tick the run enters death starts a shake that decays. It also
 * holds the CRT toggle, off by default. Nothing here touches the simulation.
 */
export function createEffects(): Effects {
  let particles: Particle[] = [];
  let shakeTicksLeft = 0;
  let crt = false;
  let previous: FlowSnapshot | null = null;

  return {
    step(snapshot) {
      const { board } = snapshot;
      const lastBoard = previous?.board ?? null;

      particles = advanceParticles(particles);

      if (board.state === "death" && lastBoard?.state !== "death") shakeTicksLeft = SHAKE_TICKS;
      if (shakeTicksLeft > 0) shakeTicksLeft -= 1;

      // Particles are eaten Pellets: only while a run is live, and only the
      // Pellets that left the board since the last tick at the same Level. A
      // Level change refills the board, so its Pellet count jumps up, and the
      // same-Level guard keeps that from reading as a wave of eaten Pellets.
      if (
        previous?.screen === "playing" &&
        lastBoard !== null &&
        board.level === lastBoard.level &&
        board.pelletsRemaining < lastBoard.pelletsRemaining
      ) {
        for (const pellet of eatenPellets(lastBoard.pellets, board.pellets)) {
          spawnParticles(particles, pellet);
        }
      }

      previous = snapshot;
    },
    toggleCrt() {
      crt = !crt;
      return crt;
    },
    snapshot: () => ({ particles, shake: shakeOffset(shakeTicksLeft), crt }),
  };
}
