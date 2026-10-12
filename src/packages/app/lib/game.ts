import { CLASSIC_MAZE, createSimulation } from "../../core";
import { createAudio } from "../../audio";
import {
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  drawBoot,
  drawCrt,
  drawFruit,
  drawGameOver,
  drawGhosts,
  drawHud,
  drawLevelClear,
  drawMaze,
  drawPacman,
  drawParticles,
  drawPaused,
  drawPellets,
  drawReady,
  drawTitle,
  drawTouchControls,
  drawTransition,
  DPAD_LAYOUT,
  fitViewport,
} from "../../render";
import type { Viewport } from "../../render";
import { createEffects } from "../effects";
import type { EffectState, Shake } from "../effects";
import { createGameFlow } from "../gameFlow";
import type { FlowSnapshot } from "../gameFlow";
import { createLocalStorageHighScore } from "../highScore";
import { createGameInput } from "../input";
import { createSoundDriver } from "../sound";

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

/** Screens that show the live board: Pellets, Ghosts and PacMan. */
function showsActors(screen: FlowSnapshot["screen"]): boolean {
  return screen === "ready" || screen === "playing" || screen === "paused" || screen === "death";
}

/** Shifts the viewport by the effects' screen shake, scaled to device pixels. */
function shakenViewport(viewport: Viewport, shake: Shake): Viewport {
  return {
    scale: viewport.scale,
    offsetX: viewport.offsetX + Math.round(shake.x * viewport.scale),
    offsetY: viewport.offsetY + Math.round(shake.y * viewport.scale),
  };
}

export function createGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("2D canvas context is unavailable");
  }

  const touch = navigator.maxTouchPoints > 0;
  const simulation = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
  const flow = createGameFlow({ simulation, highScore: createLocalStorageHighScore() });
  const input = createGameInput(window, canvas, touch, () => showsActors(flow.snapshot().screen));
  const audio = createAudio();
  const sound = createSoundDriver(audio);
  const effects = createEffects();

  // Browsers keep an AudioContext suspended until a user gesture; the first
  // keypress or tap unlocks it.
  const unlock = (): void => audio.resume();
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);

  const resize = (): void => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  };

  const render = (state: FlowSnapshot, fx: EffectState): void => {
    const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    const view = shakenViewport(viewport, fx.shake);
    const { screen, board, score, highScore, transition } = state;

    if (screen === "boot") {
      drawBoot(ctx, view);
      drawTransition(ctx, transition);
      return;
    }

    drawMaze(ctx, CLASSIC_MAZE, view);
    if (showsActors(screen)) {
      drawPellets(ctx, board.pellets, view);
      drawFruit(ctx, board.fruit, view);
      drawGhosts(ctx, board.ghosts, view);
      drawPacman(ctx, board, view);
    }
    drawParticles(ctx, fx.particles, view);
    drawHud(ctx, board, view, highScore);

    switch (screen) {
      case "title":
        drawTitle(ctx, view, highScore);
        break;
      case "ready":
        drawReady(ctx, view);
        break;
      case "paused":
        drawPaused(ctx, view);
        break;
      case "levelClear":
        drawLevelClear(ctx, view);
        break;
      case "gameOver":
        drawGameOver(ctx, view, score, highScore);
        break;
      default:
        break;
    }

    // The d-pad is a control for the Maze, drawn over it, not another screen.
    if (touch && showsActors(screen)) {
      drawTouchControls(ctx, view, DPAD_LAYOUT);
    }

    drawTransition(ctx, transition);
    if (fx.crt) drawCrt(ctx, view);
  };

  let last = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    accumulator = Math.min(accumulator + (now - last), MAX_FRAME_MS);
    last = now;

    while (accumulator >= FIXED_STEP_MS) {
      if (input.takeMute()) audio.toggleMuted();
      if (input.takeCrt()) effects.toggleCrt();
      flow.step({
        desired: input.desired(),
        start: input.takeStart(),
        pause: input.takePause(),
      });
      effects.step(flow.snapshot());
      sound.step(flow.snapshot());
      accumulator -= FIXED_STEP_MS;
    }

    render(flow.snapshot(), effects.snapshot());
    window.requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(frame);
}
