# Agent workflow: pacman-lab

`pacman-lab` is a greenfield, hobby/educational build of a playable, polished
PacMan slice. It doubles as a testbed for the four-beat agent workflow below,
so following the workflow is the point, not overhead.

Every task moves through the same four beats, each backed by a skill in
`.agents/skills/`. The repo-specific callouts live in
[pacman-lab specifics](#pacman-lab-specifics).

## Workflow

1. **Isolate — `/new-feature`.** Every new feature starts in a fresh Git
   worktree branched from `origin/main` so agents can work in parallel without
   conflicts. Never build on `main`.
2. **Build — `/code-structure`.** Write code to the service-layer
   architecture: actions and boundaries orchestrate the "why/when", a service
   layer owns the reusable "how", with explicit inputs and structured returns.
   For this game, read "action" as the game-flow/orchestration layer and
   "service" as the deterministic simulation mechanics (see
   [pacman-lab specifics](#pacman-lab-specifics)).
3. **Prove — `/evidence-driven-testing`.** Verify with the repo's checks plus
   runtime evidence. Capture the **before** state while reproducing the issue
   (prior to fixing it, when it is cheapest) and the **after** once the change
   works.
4. **Ship — `/before-and-after`, then `/greploop`.** Open the PR with
   before/after proof embedded in the description (screenshot or video whenever
   the change has a visible surface; measured numbers or output pairs when it
   doesn't). Run `/greploop` — or `/greploop-apps` when the PR exceeds
   Greptile's file-count limit — until Greptile reports **5/5 with zero
   unresolved comments**. Finish by presenting the PR URL.

Ship-beat notes:

- `/before-and-after` drives the `@vercel/before-and-after` CLI. `--markdown`
  uploads the pair and prints a PR-ready table; it also accepts existing PNGs,
  so evidence gathered while developing can be reused as-is.
- In containers/VMs where Chrome fails with "No usable sandbox", set
  `AGENT_BROWSER_ARGS="--no-sandbox"` for the capture command.
- The default upload host (0x0.st) is public, fine for ordinary UI shots; pass
  `--upload-url` for anything sensitive.
- Greptile is already onboarded for this repo (org `gerrcass`); `greptile
  review` works locally from the current branch.

## Writing for humans

Run `/unslop` over anything a person will read, before you commit, post, or
send it: commit messages, the PR title and body, README and doc edits, code
comments, and the closing reply. It strips AI tells (em dashes, filler,
hedging, chatbot phrases, puffery, bold-label lists) and replaces fancy words
with plain ones and passive voice with active. Apply it to text you wrote or
changed, not to prose you didn't touch.

## Multi-agent rules

- Never commit directly to `main`.
- One worktree and one branch per task and per agent. Never reuse or modify
  another agent's worktree, branch, or uncommitted work.
- **Scope check** before starting: skim open PRs' changed files
  (`gh pr list`, `gh pr diff <n> --name-only`) and look for uncommitted work in
  shared checkouts. On overlap, stop and ask for direction.
- Never force-push to `main`, and never plain `--force` anywhere; only
  `--force-with-lease`, only on your own task branch.
- Resolve lockfile conflicts by regenerating, never by hand-merging.
- Worktrees don't isolate shared resources: confirm a dev-server port answers
  *your* process before trusting it, and don't run schema experiments against a
  shared database.
- If a conflict can't be resolved confidently, stop and report instead of
  guessing.

## Completing a task

1. Keep changes limited to the assigned task.
2. Run the repo's checks (see [pacman-lab specifics](#pacman-lab-specifics)).
3. Assemble the evidence captured along the way into before/after pairs.
4. Commit with a clear message, rebase onto the latest `origin/main`, and rerun
   the checks.
5. Push (`git push -u origin <branch>`; after rebasing an already-pushed
   branch, `--force-with-lease`).
6. Open the PR. The body must explain what changed, how it was tested (every
   claim backed by evidence), before/after proof, and any risks or follow-up
   work. Run the title and body through `/unslop` before posting.
7. Run `/greploop` (or `/greploop-apps`) until **5/5 with zero unresolved
   comments**.
8. End by presenting the PR URL.

Do not merge the PR unless explicitly instructed. Keep the worktree until the
PR is merged or closed.

## pacman-lab specifics

Fill the TBD lines once `/to-spec` settles the stack; do not guess them.

- **Project identity.** The game is called **PacMan**. Hobby and educational,
  so shipping under the real name is fine.
- **Stack.** TBD — decided at `/to-spec`. Expected shape: a browser game
  (HTML5 Canvas or WebGL) with a deterministic simulation core. The final
  choice gets an ADR in `docs/adr/`.
- **Branch convention.** Worktree dir `.worktrees/` (gitignored), branch prefix
  `agent/`.
- **Checks** *(to be listed here)*: typecheck, lint, unit tests, build. Until
  the stack is chosen these are unset.
- **Invariants**: the simulation must be deterministic and frame-rate
  independent (fixed timestep), so unit tests and evidence can reproduce a
  game state from a seed plus an input sequence. Never commit to `main`.
- **Environment quick reference.** Node 22+ is present (`node --version`). No
  package manager, framework, or test runner is installed yet.
- **Local test infrastructure.** None yet. Unit tests for simulation logic plus
  `/evidence-driven-testing` captures for the rendered game.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `gerrcass/pacman-lab`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Skill sources

| Skill | Source |
|---|---|
| `new-feature`, `code-structure`, `evidence-driven-testing`, `greploop`, `greploop-apps`, `before-and-after`, `unslop` | [`michaelshimeles/skills`](https://github.com/michaelshimeles/skills) |
| `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `triage`, `code-review`, `pr`, `implement`, and the rest of the engineering/productivity set | [`mattpocock/skills`](https://github.com/mattpocock/skills) |

`skills-lock.json` records the exact source and hash of every installed skill.
