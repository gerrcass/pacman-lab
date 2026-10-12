import { CLASSIC_MAZE, createSimulation } from "../../core";
import {
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  drawBoot,
  drawGameOver,
  drawGhosts,
  drawHud,
  drawLevelClear,
  drawMaze,
  drawPacman,
  drawPaused,
  drawPellets,
  drawReady,
  drawTitle,
  drawTransition,
  fitViewport,
} from "../../render";
import { createGameFlow } from "../gameFlow";
import type { FlowSnapshot } from "../gameFlow";
import { createLocalStorageHighScore } from "../highScore";
import { createGameInput } from "./input";

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

/** Screens that show the live board: Pellets, Ghosts and PacMan. */
function showsActors(screen: FlowSnapshot["screen"]): boolean {
  return screen === "ready" || screen === "playing" || screen === "paused" || screen === "death";
}

export function createGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("2D canvas context is unavailable");
  }

  const input = createGameInput(window);
  const simulation = createSimulation({ maze: CLASSIC_MAZE, seed: 1 });
  const flow = createGameFlow({ simulation, highScore: createLocalStorageHighScore() });

  const resize = (): void => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  };

  const render = (state: FlowSnapshot): void => {
    const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    const { screen, board, score, highScore, transition } = state;

    if (screen === "boot") {
      drawBoot(ctx, viewport);
      drawTransition(ctx, transition);
      return;
    }

    drawMaze(ctx, CLASSIC_MAZE, viewport);
    if (showsActors(screen)) {
      drawPellets(ctx, board.pellets, viewport);
      drawGhosts(ctx, board.ghosts, viewport);
      drawPacman(ctx, board, viewport);
    }
    drawHud(ctx, board, viewport, highScore);

    switch (screen) {
      case "title":
        drawTitle(ctx, viewport, highScore);
        break;
      case "ready":
        drawReady(ctx, viewport);
        break;
      case "paused":
        drawPaused(ctx, viewport);
        break;
      case "levelClear":
        drawLevelClear(ctx, viewport);
        break;
      case "gameOver":
        drawGameOver(ctx, viewport, score, highScore);
        break;
      default:
        break;
    }

    drawTransition(ctx, transition);
  };

  let last = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    accumulator = Math.min(accumulator + (now - last), MAX_FRAME_MS);
    last = now;

    while (accumulator >= FIXED_STEP_MS) {
      flow.step({
        desired: input.desired(),
        start: input.takeStart(),
        pause: input.takePause(),
      });
      accumulator -= FIXED_STEP_MS;
    }

    render(flow.snapshot());
    window.requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(frame);
}
