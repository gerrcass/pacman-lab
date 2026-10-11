# TypeScript + Vite + Canvas 2D

The game is built with TypeScript on Vite and rendered with the Canvas 2D API.
Vite gives a fast dev server, a simple static build, and first-class Vitest
integration; Canvas 2D fits blitting pixel-art sprites and keeps the render
layer simple and deterministic. PixiJS (WebGL batching) and Phaser (full game
engine) were considered and rejected: both add weight and framework opinion we
do not need for a single-screen arcade game.
