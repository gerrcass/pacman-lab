// @ts-check
// Deep-module + ADR-0001 seam enforcement for dependency-cruiser.
//
// Each package under the packages root is a DEEP MODULE. Its PUBLIC SURFACE is
// its ENTRY POINTS: the files at the package root (`index.ts`, ...). Anything in
// a subfolder (by convention `lib/` for implementation, `tests/` for tests) is
// private and unreachable from outside the package.
//
// Layering (which package may depend on which) lives at the bottom and encodes
// the ADR-0001 seam.

/** Where packages live. One immediate child dir per package (flat, no nesting). */
const PACKAGES_ROOT = "src/packages";

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
/**
 * A package's private internals: anything nested inside a package subfolder.
 * The package's root files are its entry points and are NOT matched here.
 */
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` },
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`,
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "A package's tests exercise it through its entry points like everyone else: they may import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`,
      },
    },
    {
      name: "tests-folder-is-private",
      comment:
        "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` },
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // --- Layering: the ADR-0001 seam -----------------------------------------
    {
      name: "core-is-a-pure-leaf",
      comment:
        "The simulation core (ADR-0001) is pure. It may not depend on the render layer, the app, node_modules, or anything outside itself: no DOM, no Canvas.",
      severity: "error",
      from: { path: `^${R}/core/`, pathNot: `^${R}/core/tests/` },
      to: { pathNot: `^${R}/core/` },
    },
    {
      name: "render-may-not-depend-on-app",
      comment: "The render layer is driven by the app, never the other way round.",
      severity: "error",
      from: { path: `^${R}/render/` },
      to: { path: `^${R}/app/` },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
