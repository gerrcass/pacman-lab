# Workflow learnings

Lessons about the workflow itself: the skills, the tooling, the process. Not
about the game. Newest first.

Add an entry when something teaches you how to run the workflow better: a bug in
a skill, a tooling gap, a review finding that changed a rule, or a mistake worth
not repeating. One short entry per event, with the issue or PR that acted on it.
Run `/retro` at the end of a hard session and land its findings here. For the
current evidence-capture recipe, see
[evidence.md](./evidence.md); the capture entries below are the history of how
it got there.

## 2026-10-12 — Detect a terminal screen with a pixel probe, not a fixed wait

Verifying the finished slice (#15), I sampled frames to a video and tried to stop
when the run ended: first after a fixed duration, then when consecutive frames
turned identical. The identical-frame rule fired during the READY countdown
after a death, where the board is frozen for 1.5s, so the capture stopped on the
wrong screen. The GAME OVER banner is the only large run of pure red on the
board, so counting red pixels and stopping past a threshold lands on the real
end. Probe for a screen's signature instead of guessing its timing. PR #33.

## 2026-10-12 — "Not unit-tested" scopes to the DOM, not the pure logic

The spec's Testing Decisions say touch controls are "not unit-tested; covered by
recorded evidence." That excludes tests of the DOM/rendering interaction, not the
pure logic behind it. Pin the pure seams (swipe direction, d-pad geometry, the
gesture state machine) with unit tests, and leave the pointer wiring to the
recorded capture. This refines the PR #25 entry, which says not to add an
out-of-policy test to satisfy a bot: the two agree once "out-of-policy" means the
DOM layer. PR #31.

## 2026-10-12 — The evidence beat caught a per-tick siren retune

Unit tests drove `setSiren` in single steps, so they passed while the audio
service retuned the siren's frequency on every one of the 60 ticks a second:
`setSiren` always called `applySiren` instead of returning when the level was
unchanged. Recording the real `AudioContext` calls during a live run (the Prove
beat) showed hundreds of retunes at the same value. Guard the repeated setter,
and treat the runtime capture as the check that unit tests cannot give. #12.

## 2026-10-12 — PRs run the repo checks in CI

The only workflow was `deploy.yml`, and it runs on push to `main` after merge,
so `lint`, `test`, and `deps` never gated a pull request. Add
`.github/workflows/ci.yml`, which runs `build`, `lint`, `test`, and `deps` on
every PR. An un-gated repo is a standing missed opportunity, not a neutral
default.

## 2026-10-12 — The capture recipe is one doc, and Playwright has a launcher

Eight dated entries below described how to record the game, and the environment
note in `AGENTS.md` still sent the agent to the `:0` recorder, which captures a
black screen. The working recipe now lives in
[docs/agents/evidence.md](./evidence.md): headless Playwright with a fake clock,
plus `tools/pw.sh`, which links the npx cache's `node_modules` beside the script
so `import "playwright"` resolves. `npx --package=playwright node x.mjs` fails on
npm 11 with `ERR_MODULE_NOT_FOUND`.

## 2026-10-12 — Poll Greptile with `gh pr checks --watch`

The greploop beat polled Greptile with a hand-rolled `for i in seq; sleep` loop,
twice per PR, each capped at fifteen minutes. `gh pr checks <n> --watch` waits
on the check natively and returns when it settles.

## 2026-10-12 — Capture transient canvas states with Playwright's clock

The `:0` recorder captures the desktop, which renders black, and MCP screenshots
take about two seconds, long enough to miss a 1.5-second screen such as READY.
Playwright's fake clock fixes both: `page.clock.install()` then
`page.clock.runFor(ms)` steps the app's requestAnimationFrame exactly, so a
capture can stop on a transient screen. For a state that is impractical to reach
live (LEVEL CLEAR), serve a throwaway Vite page that drives the real flow and
render modules with a scripted simulation, then screenshot that. PR #25.

## 2026-10-12 — Launch a dev server and check it in separate tool calls

One command that started the server with `setsid nohup npx vite ... </dev/null &`
and then curled the port still held the shell tool to its 120-second timeout,
even though the server came up correctly; the next call found it live. Launch in
one call, then confirm the port answers your process in the next. PR #25.

## 2026-10-12 — A review bot does not know the repo's testing policy

Greptile asked for a keyboard unit test that this repo's testing decisions
exclude on purpose: input and visual behavior are covered by recorded evidence
instead. Decide by the repo policy, and resolve the thread with the reason
rather than adding an out-of-policy test to satisfy the bot. PR #25.

## 2026-10-12 — No window maps to `:0`, and Playwright video writes nothing; sample frames

Neither a headed Chromium (`--ozone-platform=x11`) nor the `agent-browser` /
`before-and-after` instances appeared on `DISPLAY=:0`. An `ffmpeg -f x11grab`
grab of `:0` showed a black desktop with only the cursor, so the
`/evidence-driven-testing` recorder captured nothing useful. Playwright's own
`recordVideo` also left its directory empty (no `.webm`, even with the matching
1248 browser), so `video.saveAs` failed with ENOENT. What worked: drive the page
(Chrome DevTools MCP or Playwright), screenshot the live app in a fixed-interval
loop, then `ffmpeg -framerate 10 -i frames/f_%05d.png -c:v libx264 after.mp4`.
Label it a live frame-sampled capture, not a recorder clip. Also `pkill -f
<pattern>` kills the agent's own shell when the pattern appears in the command
line; kill by PID instead. PR #24.

## 2026-10-12 — Embed PR evidence as Markdown images, not bare URLs

The `before-and-after` CLI and the catbox fallback both hand back a hosted URL.
Pasting that URL as plain text makes a reviewer click through to see the shot.
Wrap each in Markdown image syntax (`![After](https://...)`) so it renders in the
PR body, and put the before/after pair side by side in a table. PR #23.

## 2026-10-11 — Detach background dev servers or the shell kills them

`nohup npx vite ... &` launched through the agent's shell does not survive the
tool call: one run hit the 120s command timeout and took the server with it,
which then read as a Vite page error until a `ss -ltnp` check showed the port
had no listener. Start background servers with
`setsid nohup <cmd> > log 2>&1 < /dev/null &` and confirm the port answers
before trusting it. PR #22.

## 2026-10-11 — Capture the before from a detached worktree when main has no deps

The main checkout here has no `node_modules`, so there is no "before" server.
Add a detached worktree at `origin/main`
(`git worktree add --detach /tmp/before origin/main`), symlink the branch's
`node_modules` in, and run Vite on a spare port (not `5173` — another agent
owns it). Capture before/after as PNGs and upload via catbox, since the
bundled upload hosts are down (see above). PR #22.

## 2026-10-11 — `agent-browser` hangs here; fall back to the Chrome DevTools MCP

In this environment `agent-browser open` (and `doctor`, `screenshot`,
`close --all`) hung or returned empty, and left a headed Chromium running on
`:0`. `before-and-after` bundles the same CLI. The `/evidence-driven-testing`
recorder needs a live headed session, so with `agent-browser` unusable, drive
the page with the Chrome DevTools MCP instead and take per-capture screenshots
into `.artifacts/<task>/` (the recorder's headless path). The
`@vercel/before-and-after` CLI still assembles a pair from those existing PNGs
with no browser, and the upload is a separate `curl` (see the 0x0.st entry).
PR #21.

## 2026-10-11 — The `/before-and-after` upload hosts are both down

Both bundled upload paths failed for PNGs on PR #20. The default `0x0st`
adapter returns "uploads disabled ... AI botnet spam", and `IMAGE_ADAPTER=gist`
dies with "binary file not supported" because `gh gist create` rejects binary
files. Working fallback: upload with
`curl -F reqtype=fileupload -F fileToUpload=@before.png https://catbox.moe/user/api.php`
and paste the returned URL, or pass `--upload-url` a working endpoint. PR #20.

## 2026-10-11 — A new deploy workflow can only run pre-merge via a branch push

`workflow_dispatch` is unavailable until the workflow file is on the default
branch (`gh workflow run` returns 404 for a branch-only file), but a `push`
event uses the workflow from the pushed ref. To exercise a new deploy workflow
before merge: add the branch to `on.push.branches`, add it to the
`github-pages` environment's deployment branch policy, push, capture the run,
then revert both. A deploy has no live "before" URL, so use the host's 404 page
as the before shot. PR #20.

## 2026-10-11 — Greptile is enabled per repo, not per org

`greptile onboard` reported the org complete, but Greptile did not review the
repo until its status was switched to Enabled in the dashboard. Symptom: no
check run appears, and `@greptile review` gets no reply. To verify after
enabling, comment `@greptile review` on any PR and poll for the "Greptile
Review" check. Its state is `IN_PROGRESS` before it finishes; wait for a terminal
state, not the first non-pending read. PR #2.

## 2026-10-11 — A ticket runner must not claim the parent spec

The `next-ticket` frontier filter took any open, unassigned, unblocked,
`ready-for-agent` issue. Because `to-spec` labels the parent spec
`ready-for-agent`, the runner would have claimed the whole spec instead of one
slice. Greptile found it on PR #2. Fix: select among the spec's sub-issues, and
drop any issue that has children. PR #16.

## 2026-10-11 — Keep vendored skills upstream; fork to diverge

Greptile flagged real defects in two vendored skills
(`git-guardrails-claude-code`, `setup-ts-deep-modules`). They are pinned by
content hash in `skills-lock.json`, so editing them breaks the pin and the next
install overwrites the change. Divergence goes into a repo-local skill with its
own name, the way `next-ticket` sits beside Matt's `implement`. PR #2.

## 2026-10-11 — `skills-lock.json` tracks upstream only

The lockfile pins external skills (source plus hash) for reproducible installs.
Repo-local skills need no entry: git is their lock, and the commit or PR that
changed one is the pin. Do not add a repo-local skill to `skills-lock.json`; it
would claim an external source that does not exist. PR #2 landed the repo-local
skill beside the lockfile.

## 2026-10-11 — The evidence recorder captures the display

The `/evidence-driven-testing` recorder grabs the X11 screen, so the browser must
run headed on `:0` for the video to show gameplay. With no display, use the
Playwright headless path (screenshots and video) instead. `evidence.py doctor`
reports both: `capture_ready` and the source `auto` will pick. PR #2 recorded the
environment note in `AGENTS.md`.
