// Reusable helpers for the headless evidence recipe in docs/agents/evidence.md.
//
// A capture script imports chromium from "playwright" (resolved by tools/pw.sh),
// hands it to open(), and drives the real page through the helpers below. Nothing
// here reaches into the app: every helper drives the page the way a player would.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";

/** The boot and title wordmark, drawn in yellow. */
const YELLOW = [255, 255, 0];
/** The GAME OVER banner, drawn in pure red. */
const RED = [255, 0, 0];
/** Boot is 60 ticks at 60 Hz; 1500ms clears it with margin. */
const BOOT_MS = 1500;

/**
 * Launches Chromium, installs the fake clock, and opens the URL. The clock must
 * be installed before the navigation so the app runs on fake time from its first
 * frame. Pass context options (for example `hasTouch`, `isMobile`) in `context`.
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
    ([r, g, b]) => {
      const canvas = document.querySelector("canvas#game");
      const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === r && data[i + 1] === g && data[i + 2] === b) count += 1;
      }
      return count;
    },
    [r, g, b],
  );
}

/**
 * Advances the clock until the app has drawn its boot screen. A capture that
 * starts stepping before the module has executed would advance past nothing, so
 * wait for the wordmark instead of a fixed delay.
 */
export async function waitForBoot(page, { stepMs = 200, attempts = 60 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    await page.clock.runFor(stepMs);
    if ((await countPixels(page, YELLOW)) > 2000) return;
  }
  throw new Error("waitForBoot: the app never drew its boot screen");
}

/** Advances the clock past the boot countdown onto the title. */
export async function toTitle(page) {
  await page.clock.runFor(BOOT_MS);
}

/**
 * Whether the GAME OVER banner is on screen. The banner is the only large run of
 * pure red on the board, and its pixel count scales with the canvas area, so the
 * threshold scales with it too.
 */
export async function gameOver(page) {
  const area = await page.evaluate(() => {
    const canvas = document.querySelector("canvas#game");
    return canvas.width * canvas.height;
  });
  return (await countPixels(page, RED)) > area * 0.01;
}

/**
 * Screenshots the page every `stepMs` of fake time into `dir` as numbered PNGs,
 * until `stop(page, elapsedMs)` returns true (the stopping frame is kept). Wipes
 * `dir` first, so a re-run does not leave stale frames behind.
 */
export async function sample(page, { dir, stepMs = 100, stop }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  let elapsedMs = 0;
  let frames = 0;
  for (;;) {
    const name = `${dir}/f_${String(frames).padStart(5, "0")}.png`;
    writeFileSync(name, await page.screenshot());
    frames += 1;
    if (stop && (await stop(page, elapsedMs))) break;
    elapsedMs += stepMs;
    await page.clock.runFor(stepMs);
  }
  return { frames, elapsedMs };
}

/**
 * Encodes the numbered PNGs in `framesDir` to an mp4 with ffmpeg. ffmpeg wants a
 * plain `%05d` sequence, so the frames are copied to sequential names first.
 */
export function encodeVideo(framesDir, outPath, fps = 10) {
  const seq = `${framesDir}/.seq`;
  rmSync(seq, { recursive: true, force: true });
  mkdirSync(seq, { recursive: true });

  const files = readdirSync(framesDir)
    .filter((name) => name.endsWith(".png"))
    .sort();
  files.forEach((name, index) => {
    copyFileSync(`${framesDir}/${name}`, `${seq}/${String(index).padStart(5, "0")}.png`);
  });

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      `${seq}/%05d.png`,
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
