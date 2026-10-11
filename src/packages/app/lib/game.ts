import { CLASSIC_MAZE } from "../../core";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, drawMaze, fitViewport } from "../../render";

export type Game = {
  destroy(): void;
};

export function createGame(canvas: HTMLCanvasElement): Game {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("2D canvas context is unavailable");
  }

  const resize = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  let frame = 0;

  const render = (): void => {
    const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawMaze(ctx, CLASSIC_MAZE, viewport);
    frame = window.requestAnimationFrame(render);
  };

  resize();
  window.addEventListener("resize", resize);
  frame = window.requestAnimationFrame(render);

  return {
    destroy(): void {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    },
  };
}
