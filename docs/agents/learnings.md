# Workflow learnings

Lessons about the workflow itself: the skills, the tooling, the process. Not
about the game. Newest first.

Add an entry when something teaches you how to run the workflow better: a bug in
a skill, a tooling gap, a review finding that changed a rule, or a mistake worth
not repeating. One short entry per event, with the issue or PR that acted on it.
Run `/retro` at the end of a hard session and land its findings here.

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
