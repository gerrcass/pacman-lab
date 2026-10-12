import type { GridPosition, Maze, TileType } from "./maze";

export type PelletKind = "pellet" | "powerPellet";

export type PelletMarker = {
  readonly tile: GridPosition;
  readonly kind: PelletKind;
};

export type ConsumedPellet = {
  readonly kind: PelletKind;
  readonly points: number;
};

export type PelletBoard = {
  /** How many Pellets the Maze holds when full. */
  readonly total: number;
  /** How many Pellets are left to eat. */
  remaining(): number;
  /** The Pellets still on the board, with their kind, for the render layer. */
  markers(): readonly PelletMarker[];
  /** Eats the Pellet on a tile, returning it, or null if the tile holds none. */
  consume(tile: GridPosition): ConsumedPellet | null;
  /** Puts every Pellet back for a fresh Level. */
  reset(): void;
};

export const PELLET_POINTS = 10;
export const POWER_PELLET_POINTS = 50;

const POINTS: Readonly<Record<PelletKind, number>> = {
  pellet: PELLET_POINTS,
  powerPellet: POWER_PELLET_POINTS,
};

function kindOf(type: TileType | undefined): PelletKind | null {
  return type === "pellet" || type === "powerPellet" ? type : null;
}

function gridFromMaze(maze: Maze): (PelletKind | null)[][] {
  return maze.tiles.map((row) => row.map((tile) => kindOf(tile.type)));
}

function copyGrid(grid: readonly (readonly (PelletKind | null)[])[]): (PelletKind | null)[][] {
  return grid.map((row) => [...row]);
}

export function createPelletBoard(maze: Maze): PelletBoard {
  const initial = gridFromMaze(maze);
  let grid = copyGrid(initial);

  let total = 0;
  for (const row of initial) {
    for (const kind of row) {
      if (kind !== null) total += 1;
    }
  }

  let remaining = total;
  let cachedMarkers: readonly PelletMarker[] | null = null;

  const buildMarkers = (): readonly PelletMarker[] => {
    const markers: PelletMarker[] = [];
    for (let y = 0; y < grid.length; y += 1) {
      const row = grid[y];
      if (row === undefined) continue;
      for (let x = 0; x < row.length; x += 1) {
        const kind = row[x];
        if (kind === null || kind === undefined) continue;
        markers.push({ tile: { x, y }, kind });
      }
    }
    return markers;
  };

  return {
    total,

    remaining: () => remaining,

    markers: () => {
      if (cachedMarkers === null) cachedMarkers = buildMarkers();
      return cachedMarkers;
    },

    consume(tile: GridPosition): ConsumedPellet | null {
      const kind = grid[tile.y]?.[tile.x] ?? null;
      if (kind === null) return null;
      grid[tile.y]![tile.x] = null;
      remaining -= 1;
      cachedMarkers = null;
      return { kind, points: POINTS[kind] };
    },

    reset(): void {
      grid = copyGrid(initial);
      remaining = total;
      cachedMarkers = null;
    },
  };
}
