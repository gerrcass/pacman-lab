# pacman-lab

A greenfield, hobby build of a playable, polished PacMan slice, and a testbed
for a four-beat agent workflow.

## Status

The design is settled and published as the spec
([issue #1](https://github.com/gerrcass/pacman-lab/issues/1), labelled
`ready-for-agent`). The work is split into tickets with `/to-tickets`.
Implementation runs one ticket per session through `/next-ticket`. The scaffold
is in place: a TypeScript + Vite app that draws the classic Maze, with the
repo's checks wired up. Game logic is still to come.

## The workflow

Every task moves through four beats, each backed by a skill in `.agents/skills/`
and tied together by [`AGENTS.md`](./AGENTS.md):

| Beat | Skill | What it does |
|---|---|---|
| Isolate | `/new-feature` | Fresh Git worktree + branch from `origin/main`, one per task |
| Build | `/code-structure` | Actions orchestrate the "why/when"; a service layer owns the reusable "how" |
| Prove | `/evidence-driven-testing` | Repo checks plus recorded evidence (before and after) |
| Ship | `/before-and-after`, then `/greploop` | PR with before/after proof, iterated until Greptile gives 5/5 |

`/unslop` runs over anything written for a human: commits, PRs, docs, replies.

To run the four beats on one ticket without driving each by hand, start a fresh
session and run **`/next-ticket`** (repo-local): it picks the next ready ticket
from the tracker and stops at the open PR. Repeat once per ticket.

The design conversation runs earlier, through `/grilling` and `/domain-modeling`
(reached via `/grill-with-docs`), then `/to-spec` writes the agreed design up.

## Skills

Skills come from two upstream collections, pinned in `skills-lock.json`:

- [`michaelshimeles/skills`](https://github.com/michaelshimeles/skills):
  `new-feature`, `code-structure`, `evidence-driven-testing`, `greploop`,
  `greploop-apps`, `before-and-after`, `unslop`.
- [`mattpocock/skills`](https://github.com/mattpocock/skills): `grilling`,
  `domain-modeling`, `to-spec`, `to-tickets`, `triage`, `code-review`, and the
  rest of the engineering and productivity set.
- Repo-local: `next-ticket`, the per-ticket runner that composes the four beats.

Install or refresh with `npx skills add michaelshimeles/skills`.

## Setup

Node 22+ and npm 11 are required. The stack is TypeScript + Vite with the Canvas
2D API, installed with npm (ADR-0002). The simulation core is deterministic
(ADR-0001) and the build is host-agnostic static output (ADR-0003). Checks:
`npm run typecheck`, `npm run lint`, `npm test`, `npm run deps`, and
`npm run build`.

`npm run build` emits static assets to `dist/`. Set `BASE_PATH` to build for a
sub-path, e.g. `BASE_PATH=/pacman-lab/ npm run build` for GitHub Pages.

## Layout

```
AGENTS.md                 workflow + repo-specific callouts
skills-lock.json          pinned skill sources and hashes
.agents/skills/           installed skills
.agents/skills/next-ticket/  repo-local per-ticket runner
docs/agents/              issue-tracker, triage-label, domain-doc config,
                          and workflow learnings
docs/adr/                 architecture decision records (0001-0003)
GLOSSARY.md               domain vocabulary
index.html                the app entry
src/packages/             deep modules; each hides its implementation in lib/
  core/                   pure, deterministic simulation (ADR-0001)
  render/                 Canvas 2D rendering
  app/                    orchestration and the frame loop
.worktrees/               per-task git worktrees (gitignored)
.artifacts/               evidence captures (gitignored)
```
