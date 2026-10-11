# Workflow learnings

Lessons about the workflow itself: the skills, the tooling, the process. Not
about the game. Newest first.

Add an entry when something teaches you how to run the workflow better: a bug in
a skill, a tooling gap, a review finding that changed a rule, or a mistake worth
not repeating. One short entry per event, with the issue or PR that acted on it.
Run `/retro` at the end of a hard session and land its findings here.

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
