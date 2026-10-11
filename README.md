# pacman-lab

A greenfield, hobby build of a playable, polished PacMan slice, and a testbed
for a four-beat agent workflow.

## Status

Planning. There is no code yet. The next step is `/to-spec`: settle the game
design and stack, publish the spec as a GitHub issue, then break it into
tickets with `/to-tickets` before implementing.

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

Install or refresh with `npx skills add michaelshimeles/skills`.

## Setup

Node 22+ is required. No package manager, framework, or test runner is chosen
yet; the stack is decided at `/to-spec` and recorded in `docs/adr/`.

## Layout

```
AGENTS.md                 workflow + repo-specific callouts
skills-lock.json          pinned skill sources and hashes
.agents/skills/           installed skills
docs/agents/              issue-tracker, triage-label, and domain-doc config
docs/adr/                 architecture decision records (created lazily)
GLOSSARY.md               domain vocabulary (created lazily)
.worktrees/               per-task git worktrees (gitignored)
.artifacts/               evidence captures (gitignored)
```
