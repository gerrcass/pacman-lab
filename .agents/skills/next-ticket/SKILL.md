---
name: next-ticket
description: Work the next ready ticket end to end, from the tracker to an open PR. Run it in a fresh session, once per ticket.
disable-model-invocation: true
---

# Next Ticket

Run the repo's four-beat workflow (`AGENTS.md`) on the next ready ticket, from
the tracker to an open PR, then stop. This is the per-ticket runner: one ticket
per session, repeated until the frontier is empty.

## 1. Pick the ticket

Fetch `origin/main` and scope-check open PRs, then take the first ticket on the
frontier: open, `ready-for-agent`, no open blocker, no assignee. The frontier
rules live in `docs/agents/issue-tracker.md`. Announce its number and title, and
claim it (assign yourself).
Completion: a claimed ticket that is genuinely unblocked.

## 2. Isolate

Call the Skill tool with `new-feature` and follow it, so the work starts in a
fresh worktree on its own branch off `origin/main`.
Completion: `git branch --show-current` prints the task branch, not `main`.

## 3. Build

Call the Skill tool with `code-structure` and follow it. Build the ticket's
acceptance criteria, driving `tdd` at the simulation seam (the ticket and the
spec issue carry the detail). Keep the core pure.
Completion: every acceptance criterion in the ticket has a passing test, or a
stated reason it cannot have one.

## 4. Prove

Run the repo's checks (`AGENTS.md`), then call the Skill tool with
`evidence-driven-testing`. Capture the before state when reproducing, and the
after once the change works.
Completion: checks green, and evidence recorded against the branch and commit.

## 5. Review

Call the Skill tool with `code-review` against `main`, and address what it
raises.
Completion: no unresolved findings.

## 6. Ship

Call the Skill tool with `pr` to shape the body. When the ticket has a visible
surface, call `before-and-after` for the proof. Then call `greploop` (or
`greploop-apps` for an oversized PR) until Greptile reports 5/5 with zero
unresolved comments.
Completion: PR open with evidence, Greptile 5/5, zero unresolved comments.

## 7. Report

Print the PR URL and stop. Do not merge, and leave the worktree in place.
