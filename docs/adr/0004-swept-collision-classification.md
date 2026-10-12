# Classify swept collisions from an actor's state at the start of the tick

PacMan and Ghost collisions are swept across the whole fixed tick, so a fast
mover or a Ghost that turns mid-tick still connects. Each Ghost's motion is
classified by the mode it starts the tick in: a Scatter or Chase Ghost is
lethal, a Frightened one is eatable, and a housed, leaving, or eaten Ghost is
harmless. The sweep runs at the speed that motion actually travelled, and a tick
that repositions everyone (a Level clear or a respawn) runs no collision check at
all. Reading the mode after the Ghost moved let eaten eyes that reached home, or
a housed Ghost stepping out, count as a hunter for the whole tick and cost a
life with no real collision. Checking only end-of-tick positions was rejected: it
misses passes and mid-tick turns.
