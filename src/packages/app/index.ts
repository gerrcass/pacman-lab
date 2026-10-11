import { createGame } from "./lib/game";

const canvas = document.querySelector("canvas#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected a <canvas id="game"> element');
}

createGame(canvas);
