#!/usr/bin/env bash
# Run a Playwright capture script without adding playwright to the project.
#
# Usage: tools/pw.sh path/to/capture.mjs [args...]
#
# Playwright comes from the npm npx cache. `npx --package=playwright node x.mjs`
# is not enough: npm 11 does not put the package on Node's ESM resolution path,
# so `import { chromium } from "playwright"` fails with ERR_MODULE_NOT_FOUND.
# Node walks up from the script looking for node_modules, so this links the
# cache's node_modules next to the script, then runs it.
set -euo pipefail

script="${1:?usage: tools/pw.sh <script.mjs> [args...]}"
shift

find_playwright() {
  local cache="${npm_config_cache:-$HOME/.npm}/_npx"
  find "$cache" -maxdepth 3 -type d -path '*/node_modules/playwright' -printf '%h\n' 2>/dev/null |
    head -1 || true
}

modules="$(find_playwright)"
if [ -z "$modules" ]; then
  npx --yes --package=playwright playwright --version >/dev/null
  modules="$(find_playwright)"
fi
if [ -z "$modules" ]; then
  echo "pw.sh: playwright not found in the npx cache" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$script")" && pwd)"
link="$script_dir/node_modules"

# Refuse to replace a real node_modules (for example the repo's own).
if [ -e "$link" ] && [ ! -L "$link" ]; then
  echo "pw.sh: refusing to replace existing $link" >&2
  exit 1
fi

ln -sfn "$modules" "$link"
exec node "$script" "$@"
