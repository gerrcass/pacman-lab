# Deterministic, frame-rate-independent simulation core

The game logic runs in a pure simulation core on a fixed 60 Hz timestep,
decoupled from rendering, with no DOM or Canvas imports and a seeded RNG. This
makes a game state reproducible from `(seed, input sequence)`, so unit tests
and recorded evidence can replay and assert exact behavior. Frame-coupled logic
and an engine-provided variable timestep were rejected: both make states
non-reproducible and tie tests to real time.
