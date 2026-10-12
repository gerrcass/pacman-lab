import type { GridPosition, PelletMarker } from "../core";
import type { Particle } from "../render";
import { enteredDeath } from "./gameFlow";
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

function tileKey(tile: GridPosition): string {
  return `${tile.x},${tile.y}`;
}

/** The Pellets the previous Maze held that the current one no longer does. */
function pelletsGone(
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
 * The Pellets eaten on a live tick, from the previous frame and this one. A
 * Level clear refills the Maze from the same layout, so its last Pellet would
 * survive a plain set difference; on a Level change the Pellets still left on
 * the previous Maze are exactly the ones just eaten.
 */
function eatenPellets(
  lastBoard: FlowSnapshot["board"],
  board: FlowSnapshot["board"],
): readonly PelletMarker[] {
  if (board.level !== lastBoard.level) return lastBoard.pellets;
  return pelletsGone(lastBoard.pellets, board.pellets);
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

      if (enteredDeath(previous, snapshot)) shakeTicksLeft = SHAKE_TICKS;
      if (shakeTicksLeft > 0) shakeTicksLeft -= 1;

      // Particles are eaten Pellets: only a live tick eats one, never a Menu.
      if (previous?.screen === "playing" && lastBoard !== null) {
        for (const pellet of eatenPellets(lastBoard, board)) spawnParticles(particles, pellet);
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
