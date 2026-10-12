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

Drive the app with a Playwright script and step its clock, so a transient screen
settles on screen instead of racing a screenshot:

```js
import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 720, height: 900 } });
const page = await context.newPage();
await page.clock.install(); // take over Date, requestAnimationFrame, performance
await page.goto("http://localhost:5210/");
await page.clock.runFor(1400); // boot -> title
await page.screenshot({ path: "after-01-title.png" });
await page.keyboard.press("Space");
await page.clock.runFor(600); // mid-READY, before the 90-tick countdown ends
await page.screenshot({ path: "after-02-ready.png" });
await browser.close();
```

`page.clock.runFor(ms)` steps requestAnimationFrame exactly, so a capture can
stop on a state that lasts a fraction of a second. A plain screenshot arrives
about two seconds late and misses it.

Run the script through `tools/pw.sh`, which resolves Playwright from the npm npx
cache without adding it to the project's dependencies:

```bash
tools/pw.sh .artifacts/<task>/capture.mjs
```

`npx --package=playwright node capture.mjs` does not work on npm 11: it does not
put the package on Node's ESM resolution path. `tools/pw.sh` links the cache's
`node_modules` beside the script so `import "playwright"` resolves. Keep the
script beside its captures under `.artifacts/<task>/` (gitignored) so the run is
repeatable.

## States that are impractical to reach live

For a state you cannot reach by playing, such as LEVEL CLEAR, serve a throwaway
Vite page that drives the real `gameFlow` and render modules with a scripted
simulation, then screenshot that. Put it under `.artifacts/<task>/` and delete it
before committing. Step the flow with a fake clock or a scripted `Simulation`,
per the README's deep-module rules.

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
