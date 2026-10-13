// Reusable helpers for the headless evidence recipe in docs/agents/evidence.md.
//
// A capture script imports chromium from "playwright" (resolved by tools/pw.sh),
// hands it to open(), and drives the real page through the helpers below. Nothing
// here reaches into the app: every helper drives the page the way a player would.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const CANVAS_SELECTOR = "canvas#game";
/** The game's virtual resolution, from src/packages/render/lib/constants.ts. */
const VIRTUAL_WIDTH = 224;
const VIRTUAL_HEIGHT = 288;
/** The title's HUD and prompt text, drawn in white. */
const WHITE = [255, 255, 255];
/** The GAME OVER banner, drawn in pure red. */
const RED = [255, 0, 0];
/** The title draws about 4% of the board in white; the boot screen draws none. */
const TITLE_WHITE_SHARE = 0.005;
/** GAME OVER draws about 2% of the board in red; live play stays near 0.014%. */
const GAME_OVER_RED_SHARE = 0.01;
/** Frames a single `sample` may write before it gives up. */
const MAX_FRAMES = 2000;

const padded = (index) => String(index).padStart(5, "0");
const frameName = (index) => `f_${padded(index)}.png`;

function resetDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

/**
 * Launches Chromium, installs the fake clock, and opens the URL. The clock must
 * be installed before the navigation so the app runs on fake time from its first
 * frame. Pass context options (for example `hasTouch` and `isMobile` for a touch
 * capture) in `context`.
 */
export async function open(chromium, url, options = {}) {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 720, height: 900 },
    ...options.context,
  });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(url);
  return { browser, page };
}

/** Exact-pixel count of one RGB triple on the game canvas. */
export function countPixels(page, [r, g, b]) {
  return page.evaluate(
    ([selector, r, g, b]) => {
      const canvas = document.querySelector(selector);
      const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === r && data[i + 1] === g && data[i + 2] === b) count += 1;
      }
      return count;
    },
    [CANVAS_SELECTOR, r, g, b],
  );
}

/**
 * The board's drawn area in device pixels. The canvas is letterboxed, so this is
 * the integer scale squared times the virtual resolution, not the canvas area. A
 * colour's pixel count scales with it, so thresholds follow it.
 */
function drawingArea(page) {
  return page.evaluate(
    ([selector, vw, vh]) => {
      const canvas = document.querySelector(selector);
      const scale = Math.max(1, Math.floor(Math.min(canvas.width / vw, canvas.height / vh)));
      return vw * vh * scale * scale;
    },
    [CANVAS_SELECTOR, VIRTUAL_WIDTH, VIRTUAL_HEIGHT],
  );
}

/**
 * Advances the clock until the title screen is drawn. The boot screen draws only
 * the wordmark, so the title's white HUD text is the first white on screen: wait
 * for that, not for the shared wordmark, or a capture stops on boot. This also
 * covers a cold start, where the app may not have executed when the first step
 * runs.
 */
export async function toTitle(page, { stepMs = 200, attempts = 60 } = {}) {
  const min = (await drawingArea(page)) * TITLE_WHITE_SHARE;
  for (let i = 0; i < attempts; i += 1) {
    await page.clock.runFor(stepMs);
    if ((await countPixels(page, WHITE)) > min) return;
  }
  throw new Error("toTitle: the title screen never drew");
}

/**
 * Whether the GAME OVER banner is on screen. The banner is the only large run of
 * pure red on the board, so its share of the drawn area separates it from the
 * red of a hunting Ghost.
 */
export async function gameOver(page) {
  const min = (await drawingArea(page)) * GAME_OVER_RED_SHARE;
  return (await countPixels(page, RED)) > min;
}

/**
 * Screenshots the page every `stepMs` of fake time into `dir` as numbered PNGs,
 * until `stop(page, elapsedMs)` returns true (the stopping frame is kept). Wipes
 * `dir` first, so a re-run does not leave stale frames behind. Throws after
 * `maxFrames`, so a capture that never reaches its stopping screen cannot write
 * PNGs forever.
 */
export async function sample(page, { dir, stepMs = 100, stop, maxFrames = MAX_FRAMES }) {
  resetDir(dir);

  let elapsedMs = 0;
  let frames = 0;
  for (;;) {
    if (frames >= maxFrames) {
      throw new Error(`sample: wrote ${maxFrames} frames without stop() returning true`);
    }
    writeFileSync(`${dir}/${frameName(frames)}`, await page.screenshot());
    frames += 1;
    if (stop && (await stop(page, elapsedMs))) break;
    elapsedMs += stepMs;
    await page.clock.runFor(stepMs);
  }
  return { frames, elapsedMs };
}

/**
 * Encodes the numbered PNGs in `framesDir` to an mp4 with ffmpeg. ffmpeg wants a
 * plain `%05d` sequence, so the frames are copied to sequential names first, and
 * padded to even dimensions, which libx264's `yuv420p` requires.
 */
export function encodeVideo(framesDir, outPath, fps = 10) {
  const seq = `${framesDir}/.seq`;
  resetDir(seq);

  const files = readdirSync(framesDir)
    .filter((name) => name.endsWith(".png"))
    .sort();
  files.forEach((name, index) => {
    copyFileSync(`${framesDir}/${name}`, `${seq}/${padded(index)}.png`);
  });

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      `${seq}/%05d.png`,
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { stdio: "inherit" },
  );
  rmSync(seq, { recursive: true, force: true });
}
