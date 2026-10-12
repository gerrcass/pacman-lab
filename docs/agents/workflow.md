# The development workflow

How work moves through this repo: the harness, the skills, the checks, and the
gates a change passes before it reaches `main`. This covers the process and the
tooling, not the game's design. For the game itself, start at
[GLOSSARY.md](../../GLOSSARY.md) and [docs/adr/](../adr/).

The repo is a testbed for an agent-driven workflow. A coding agent does most of
the implementation, so the harness is built to be legible to two readers at
once: a new developer and a new agent. The same documents steer both. Read
[AGENTS.md](../../AGENTS.md) for the rules an agent loads on every turn; this
file explains how the pieces fit and why.

## Work enters as an issue, leaves as a merged PR

Knowledge work here is single-context: one game, one team, one tracker. An idea
is grilled into a spec, the spec is broken into tickets, and each ticket runs
through four beats and lands as a pull request. Nothing is built on `main`, and
nothing merges without a review and passing checks.

## The four beats

Every task runs through the same four beats. Each is backed by a skill in
`.agents/skills/`, and each ends when its completion criterion is met.

| Beat | Skill | Produces | Done when |
|---|---|---|---|
| Isolate | `/new-feature` | a worktree and branch off `origin/main` | `git branch --show-current` is the task branch, not `main` |
| Build | `/code-structure` | the ticket's behavior, test-first | every acceptance criterion has a passing test, or a stated reason it cannot |
| Prove | `/evidence-driven-testing` | green checks plus recorded before/after | the checks pass and the evidence shows the behavior |
| Ship | `/before-and-after`, `/greploop` | an open, reviewed PR | Greptile reports 5/5 with zero unresolved comments |

`/unslop` runs over anything a person reads (commits, PR bodies, docs, replies)
before it is posted.

### Isolate

One worktree and one branch per task, created from the latest `origin/main`, so
several tasks run in parallel without touching each other's files. Worktrees
live under `.worktrees/` (gitignored) and branches use the `agent/` prefix. The
beat also runs a scope check: skim open PRs' changed files and look for
uncommitted work in shared checkouts, and stop if another task is editing the
same area.

### Build

Write to the service-layer split. An action orchestrates the "why/when" (rules,
state transitions, failure handling); a service owns the reusable "how"
(structured operations). For the game, the action layer is the app package's
game flow and the service layer is the deterministic simulation in the core
package. The ticket's acceptance criteria drive the work, mostly test-first at
the simulation seam. The core stays pure: no DOM, no Canvas.

### Prove

Two kinds of proof, and both are required: the repo's checks (below) and
recorded evidence that the behavior actually appears. For a visible change that
means before/after captures; for a non-UI change it means measured numbers or
output pairs. The mechanics of capturing evidence on this machine live in
[evidence.md](./evidence.md); this file covers where evidence sits in the flow.

### Ship

Open the PR with the before/after proof embedded in the body. Then run
`/greploop` (or `/greploop-apps` for a PR past Greptile's file-count limit)
until Greptile reports 5/5 and every review thread is resolved. Finish by
presenting the PR URL. Do not merge without an explicit instruction.

## Before the beats: the design path

Feature work starts in conversation, not code:

- `/grilling` and `/domain-modeling` (reached through `/grill-with-docs`)
  sharpen the design and resolve domain terms and decisions.
- `/to-spec` writes the agreed design up as a spec issue.
- `/to-tickets` splits the spec into implementation tickets.

`/wayfinder` plans work too large for one session as a shared map of decision
tickets, resolved one at a time. The tracker rules for all of these live in
[issue-tracker.md](./issue-tracker.md).

## The tracker

Issues and specs are GitHub issues; the `gh` CLI does every operation. The
vocabulary for triage roles is in [triage-labels.md](./triage-labels.md). A
spec is a parent issue and its tickets are GitHub sub-issues; a ticket is
unblocked when every issue blocking it is closed. The **frontier** is the set of
open tickets that are `ready-for-agent`, unblocked, and unassigned; the first in
map order is next.

## Running a ticket without driving each beat by hand

Start a fresh session and run the repo-local **`/next-ticket`** skill. It takes
the next ready ticket from the frontier, runs all four beats, and stops at the
open PR. Repeat once per ticket until the frontier is empty.

## The checks

Five commands, all defined in `package.json`, all run from the repo root:

| Command | Tool | Covers |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` | TypeScript types |
| `npm run lint` | ESLint + Prettier | style, and core purity (ESLint bans DOM globals in `core`) |
| `npm test` | Vitest | the simulation and render unit tests |
| `npm run deps` | dependency-cruiser | deep-module boundaries and the ADR-0001 seam |
| `npm run build` | `tsc` + Vite | the production bundle in `dist/` |

Two workflows automate them:

- `.github/workflows/ci.yml` runs `build`, `lint`, `test`, and `deps` on every
  pull request. This is the PR gate.
- `.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on push to
  `main`.

The structural rules the checks enforce live in code, not prose:
[.dependency-cruiser.cjs](../../.dependency-cruiser.cjs) holds the deep-module
and layering rules, and `eslint.config.js` holds the core-purity rule. Read
[src/packages/README.md](../../src/packages/README.md) before adding or
importing a package.

## Evidence and proof

Evidence is captured under `.artifacts/<task>/` (gitignored), never committed,
and uploaded for the PR body. The `@vercel/before-and-after` CLI assembles
before/after pairs, and its bundled upload hosts are down, so uploads go through
a fallback. Every one of those steps, plus how to reach a transient game state
with a headless browser, is in [evidence.md](./evidence.md).

## Review gates

- `/code-review` runs two read-only sub-agents over the diff against a fixed
  point: one for **standards** (does it follow the repo's documented rules and
  the smell baseline?) and one for **spec** (does it implement the ticket?).
  The implementation agent does not impose standards; the review agent does.
- **Greptile** reviews every PR. `/greploop` fixes its findings and re-runs
  until it reports 5/5 with zero unresolved comments.

## The skills ecosystem

Skills come from two upstream collections plus this repo:

- [`michaelshimeles/skills`](https://github.com/michaelshimeles/skills) and
  [`mattpocock/skills`](https://github.com/mattpocock/skills) are vendored into
  `.agents/skills/` and pinned by source and content hash in
  [`skills-lock.json`](../../skills-lock.json). Do not edit a vendored skill:
  the lock breaks and the next install overwrites it. To change behavior,
  fork it into a repo-local skill with its own name, the way `next-ticket` sits
  beside the upstream `implement`.
- Repo-local skills are tracked by git alone; leave them out of the lockfile.

Install or refresh the vendored set with `npx skills add michaelshimeles/skills`.

## Multi-agent rules

These keep parallel agents from stepping on each other:

- Never commit directly to `main`; one worktree and one branch per task.
- Never reuse or modify another agent's worktree, branch, or uncommitted work.
- Scope-check before starting; on overlap, stop and ask.
- Resolve lockfile conflicts by regenerating, never by hand.
- Treat shared resources carefully: confirm a dev-server port answers *your*
  process (`ss -ltnp`), and pick spare ports.
- Never force-push `main`, and never plain `--force`; only `--force-with-lease`,
  only on your own task branch.

## The learnings loop

When the workflow itself teaches a lesson (a skill bug, a tooling gap, a review
finding that changed a rule), add a short entry to
[learnings.md](./learnings.md) with the issue or PR that acted on it. Read it
before changing a skill or the workflow. Run `/retro` after a hard session and
land its findings there.

## Repository map

```
AGENTS.md                  the rules an agent loads every turn
README.md                  project overview and setup
GLOSSARY.md                domain vocabulary
skills-lock.json           vendored skill sources and hashes
.agents/skills/            installed skills (vendored + repo-local)
.github/workflows/         ci.yml (PR checks), deploy.yml (Pages)
docs/adr/                  architecture decision records
docs/agents/               this workflow, the tracker, evidence, learnings,
                           triage labels, and domain-doc config
src/packages/              deep modules: core (simulation), render, app
tools/pw.sh                runs a Playwright capture script
.worktrees/                per-task worktrees (gitignored)
.artifacts/                evidence captures (gitignored)
```

## One ticket, end to end

```bash
# Isolate
git fetch origin
git worktree add .worktrees/<task> -b agent/<task> origin/main
cd .worktrees/<task> && npm install

# Build, then Prove
#   ...implement the ticket test-first...
npm run typecheck && npm run lint && npm test && npm run deps && npm run build

# Ship
git status --short                 # see what changed
git add <paths>                    # stage the ticket's files, e.g. src/ docs/
git diff --cached                  # review the staged diff before committing
git commit
git fetch origin && git rebase origin/main
npm run typecheck && npm run lint && npm test && npm run deps && npm run build
git push -u origin agent/<task>    # rebasing a pushed branch: --force-with-lease
gh pr create --title "..." --body "..."   # include before/after evidence
gh pr checks <n> --watch                   # CI + Greptile
#   ...fix Greptile findings, re-push, until 5/5 with no open threads...
```

## Where to make a change

| You want to change | Edit |
|---|---|
| How an agent behaves on a turn | `AGENTS.md` |
| The workflow's steps or rationale | this file |
| Tracker operations | `docs/agents/issue-tracker.md` |
| Triage role vocabulary | `docs/agents/triage-labels.md` |
| How evidence is captured | `docs/agents/evidence.md` |
| The checks or the PR gate | `package.json`, `.github/workflows/ci.yml` |
| Module boundaries or layering | `.dependency-cruiser.cjs` |
| A domain term | `GLOSSARY.md` (`/domain-modeling`) |
| A lasting design decision | `docs/adr/` |
| A workflow lesson | `docs/agents/learnings.md` (`/retro`) |
