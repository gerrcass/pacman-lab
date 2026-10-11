# Packages

Every package here is a deep module: a lot of behaviour behind a small interface.
The public surface is a package's **entry points**, the files at its root
(`index.ts`). Everything in a subfolder is private.

```
src/packages/<name>/
  index.ts        entry point (public). Import this from outside.
  lib/            implementation. Hidden from outside.
  tests/          tests + fixtures. Private too.
```

- **Import only through a package's entry points.** From another package or app
  code, `import { thing } from "../<name>"`, never `"../<name>/lib/thing"`.
- **A package's own files import each other freely.** `lib/` may reach `lib/`.
- **Tests go through the entry points too.** A package's tests import entry
  points, never any package's `lib/` (not even their own).
- **No barrels.** Prefer several small entry points over one `index.ts` that
  re-exports a whole subtree.

The packages:

| Package | Role |
|---|---|
| `core` | The pure, deterministic simulation (ADR-0001). No DOM, no Canvas. |
| `render` | Canvas 2D rendering. Reads the core through its entry point. |
| `app` | Orchestration: owns the canvas, the frame loop, and game states. |

`npm run deps` (dependency-cruiser, config in `.dependency-cruiser.cjs`) enforces
all of this, plus the layering: `core` is a pure leaf and `render` never depends
on `app`.
