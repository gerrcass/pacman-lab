# Evidence capture

How to capture proof that a UI change works, on this machine and in this repo.
The `/evidence-driven-testing` skill says what evidence to gather; this file
says how to gather it here, where the skill's generic recipe does not fit.

## The display recorder does not work here

`evidence.py doctor` reports `capture_ready`, but no window maps to `:0`, so
`ffmpeg -f x11grab` grabs a black desktop with only the cursor. Playwright's
`recordVideo` also leaves its directory empty. Do not spend calls on either;
use the headless path below. `agent-browser` hangs here too.

## Capture with Playwright and a fake clock

`tools/capture.mjs` holds the reusable helpers: install the fake clock, wait for
the title, step the clock, probe canvas pixels, sample frames to a video, and
stop at a terminal screen. A capture script imports `chromium` from `playwright`,
hands it to `open`, and drives the real page:

```js
import { chromium } from "playwright";
import {
  open,
  toTitle,
  countPixels,
  gameOver,
  sample,
  encodeVideo,
} from "../../tools/capture.mjs";

const { browser, page } = await open(chromium, "http://localhost:5210/");
await toTitle(page); // waits out boot onto the title, cold start included
await page.screenshot({ path: "after-01-title.png" });
await page.keyboard.press("Space");
await page.clock.runFor(600); // mid-READY, before the 90-tick countdown ends
await page.screenshot({ path: "after-02-ready.png" });

// A raw probe, for a screen with no built-in predicate.
const white = await countPixels(page, [255, 255, 255]);

await sample(page, { dir: "frames", stepMs: 100, stop: gameOver });
encodeVideo("frames", "after.mp4", 10);
await browser.close();
```

`page.clock.runFor(ms)` steps requestAnimationFrame exactly, so a capture can
stop on a state that lasts a fraction of a second. A plain screenshot arrives
about two seconds late and misses it. The clock must be installed before the
navigation, which `open` does. `toTitle` waits for the title's white HUD text,
so neither a cold start nor the boot screen's shared wordmark makes a capture
stop early.

Screenshots between `runFor` steps nudge the frame loop, so two runs with the
same key presses diverge if their capture cadence differs. Compare two builds by
running the same script, unchanged, against both. Keep the script beside its
captures under `.artifacts/<task>/` (gitignored) so the run is repeatable.

## Run a capture script

```bash
tools/pw.sh .artifacts/<task>/capture.mjs
```

`npx --package=playwright node capture.mjs` does not work on npm 11: it does not
put the package on Node's ESM resolution path. `tools/pw.sh` links the cache's
`node_modules` beside the script so `import "playwright"` resolves.

## States that are impractical to reach live

For a state you cannot reach by playing, such as LEVEL CLEAR, serve a throwaway
Vite page that drives the real `gameFlow` and render modules with a scripted
simulation, then screenshot that. Put it under `.artifacts/<task>/` and delete it
before committing. Step the flow with a fake clock or a scripted `Simulation`,
per the README's deep-module rules.

## Stopping at a terminal screen

A frame sampler has to know when the run ends. A fixed duration is brittle, and
"the frame stopped changing" misfires: the board is frozen for 1.5s on every
READY, so identical consecutive frames also mean a countdown, not the end. Probe
the canvas for the screen's own signature instead. `gameOver` counts the pure-red
pixels of the GAME OVER banner, the only large run of red on the board, against a
share of the canvas area, so the threshold scales with the capture size: about
13,000 red pixels at the 720x900 capture against roughly 90 in live play, about
1,300 at scale 1. `sample` takes any such predicate as its `stop`. The same trick
finds any screen with a distinctive colour.

## Before shots

The main checkout has no `node_modules`, so there is no "before" server there.
Add a detached worktree at `origin/main`, symlink the branch's `node_modules` in,
and run Vite on a spare port:

```bash
git worktree add --detach /tmp/before origin/main
ln -sfn "$PWD/node_modules" /tmp/before/node_modules
( cd /tmp/before && setsid nohup npx vite --port 5211 --strictPort > vite.log 2>&1 < /dev/null & )
```

Start the server in one tool call and confirm the port answers in the next. A
launch and a curl in one call can hold the shell to its timeout. Pick a port
nothing else listens on (`ss -ltnp`), not `5173`, which another agent may own.

## Upload and embed

The bundled `before-and-after` upload hosts are down: the default `0x0st`
adapter returns "uploads disabled", and the `gist` adapter rejects binary files.
Upload with catbox and embed the URLs as Markdown images in a side-by-side
table:

```bash
curl -s -A "Mozilla/5.0" -F reqtype=fileupload \
  -F fileToUpload=@before.png https://catbox.moe/user/api.php
```

```markdown
| Before | After |
|:---:|:---:|
| ![Before](https://files.catbox.moe/xxxx.png) | ![After](https://files.catbox.moe/yyyy.png) |
```

The `before-and-after` CLI assembles a pair from existing PNGs, but its
`--markdown` flag prints local paths, not uploaded URLs. The bundled upload
script lives in the skill folder, not the repo:
`.agents/skills/before-and-after/scripts/upload-and-copy.sh`.

## Sanity checks

- Confirm the server answering a port is running your code, not another agent's:
  `ss -ltnp "sport = :<port>"`, then `ps -p <pid> -o args=`.
- Kill background servers by PID, not `pkill -f <pattern>`, which can match and
  kill the agent's own shell.
- Evidence complements the repo's checks; the CI workflow runs them on every PR,
  and evidence never replaces them.
