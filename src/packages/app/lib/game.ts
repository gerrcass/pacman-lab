import { CLASSIC_MAZE, createSimulation } from "../../core";
import type { Snapshot } from "../../core";
import {
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  drawGhosts,
  drawHud,
  drawMaze,
  drawPacman,
  drawPellets,
  fitViewport,
} from "../../render";
import { createDirectionInput } from "./input";

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

export function createGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("2D canvas context is unavailable");
  }

  const input = createDirectionInput(window);
  const simulation = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });

  const resize = (): void => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  };

  const render = (snapshot: Snapshot): void => {
    const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawMaze(ctx, CLASSIC_MAZE, viewport);
    drawPellets(ctx, snapshot.pellets, viewport);
    drawGhosts(ctx, snapshot.ghosts, viewport);
    drawPacman(ctx, snapshot, viewport);
    drawHud(ctx, snapshot, viewport);
  };

  let last = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    accumulator = Math.min(accumulator + (now - last), MAX_FRAME_MS);
    last = now;

    while (accumulator >= FIXED_STEP_MS) {
      simulation.step({ desired: input.desired() });
      accumulator -= FIXED_STEP_MS;
    }

    // Space or Enter restarts a finished run.
    const startPressed = input.consumeStart();
    const snapshot = simulation.snapshot();
    if (startPressed && snapshot.state === "gameOver") {
      simulation.restart();
      render(simulation.snapshot());
    } else {
      render(snapshot);
    }

    window.requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(frame);
}
