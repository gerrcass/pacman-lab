# Host-agnostic static build with a swappable deploy target

The build produces plain static assets with a configurable base path and no
host-specific code, and deployment lives in one isolated CI workflow. Today it
publishes to GitHub Pages. Moving to Cloudflare Pages or Workers should mean
editing that one workflow, not touching the game. Committing to GitHub-Pages
specifics in build config or code was rejected so the host stays replaceable.
