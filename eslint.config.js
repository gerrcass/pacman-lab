import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".worktrees/**", ".artifacts/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["src/packages/core/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "navigator",
        "localStorage",
        "sessionStorage",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "HTMLCanvasElement",
        "CanvasRenderingContext2D",
        "OffscreenCanvas",
        "Image",
        "Audio",
        "AudioContext",
        "performance",
      ],
    },
  },
  {
    files: ["**/*.config.ts", "**/*.cjs", "eslint.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["src/**/tests/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      // The module runs in Node; the page.evaluate callbacks run in the browser.
      globals: { ...globals.node, ...globals.browser },
    },
  },
  prettier,
);
