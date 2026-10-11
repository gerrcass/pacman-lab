import { CLASSIC_MAZE } from "../../core";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, drawMaze, fitViewport } from "../../render";

export function createGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("2D canvas context is unavailable");
  }

  const resize = (): void => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  };

  const render = (): void => {
    const viewport = fitViewport(canvas.width, canvas.height, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawMaze(ctx, CLASSIC_MAZE, viewport);
    window.requestAnimationFrame(render);
  };

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(render);
}
