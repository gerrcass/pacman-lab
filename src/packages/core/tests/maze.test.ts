import { describe, expect, it } from "vitest";
import { CLASSIC_MAZE, MAZE_COLUMNS, MAZE_ROWS, parseMaze } from "../index";
import type { Maze, TileType } from "../index";

function countTiles(maze: Maze, type: TileType): number {
  let total = 0;
  for (const row of maze.tiles) {
    for (const tile of row) {
      if (tile.type === type) total += 1;
    }
  }
  return total;
}

function tileAt(maze: Maze, x: number, y: number): TileType | undefined {
  return maze.tiles[y]?.[x]?.type;
}

describe("the classic maze", () => {
  it("is 28 tiles wide by 31 tall", () => {
    expect(CLASSIC_MAZE.width).toBe(MAZE_COLUMNS);
    expect(CLASSIC_MAZE.height).toBe(MAZE_ROWS);
    expect(CLASSIC_MAZE.tiles).toHaveLength(MAZE_ROWS);
    for (const row of CLASSIC_MAZE.tiles) {
      expect(row).toHaveLength(MAZE_COLUMNS);
    }
  });

  it("holds 240 pellets and 4 power pellets", () => {
    expect(countTiles(CLASSIC_MAZE, "pellet")).toBe(240);
    expect(countTiles(CLASSIC_MAZE, "powerPellet")).toBe(4);
  });

  it("is walled along the top and bottom", () => {
    for (let x = 0; x < MAZE_COLUMNS; x += 1) {
      expect(tileAt(CLASSIC_MAZE, x, 0)).toBe("wall");
      expect(tileAt(CLASSIC_MAZE, x, MAZE_ROWS - 1)).toBe("wall");
    }
  });

  it("opens a tunnel on both side edges", () => {
    expect(tileAt(CLASSIC_MAZE, 0, 14)).toBe("empty");
    expect(tileAt(CLASSIC_MAZE, MAZE_COLUMNS - 1, 14)).toBe("empty");
  });

  it("is mirrored left to right", () => {
    for (let y = 0; y < MAZE_ROWS; y += 1) {
      for (let x = 0; x < MAZE_COLUMNS; x += 1) {
        expect(tileAt(CLASSIC_MAZE, x, y)).toBe(tileAt(CLASSIC_MAZE, MAZE_COLUMNS - 1 - x, y));
      }
    }
  });

  it("starts PacMan on an open corridor tile", () => {
    const { x, y } = CLASSIC_MAZE.pacmanStart;
    expect(tileAt(CLASSIC_MAZE, x, y)).toBe("empty");
  });

  it("has a ghost house door and an open interior", () => {
    expect(countTiles(CLASSIC_MAZE, "door")).toBeGreaterThan(0);
    expect(countTiles(CLASSIC_MAZE, "empty")).toBeGreaterThan(0);
  });
});

describe("parseMaze", () => {
  it("rejects a grid with the wrong number of rows", () => {
    expect(() => parseMaze(["###"])).toThrow();
  });

  it("rejects a ragged row", () => {
    const rows = Array.from({ length: MAZE_ROWS }, () => "#".repeat(MAZE_COLUMNS));
    rows[5] = "#".repeat(MAZE_COLUMNS - 1);
    expect(() => parseMaze(rows)).toThrow();
  });

  it("rejects an unknown character", () => {
    const rows = Array.from({ length: MAZE_ROWS }, () => "#".repeat(MAZE_COLUMNS));
    rows[5] = `?${"#".repeat(MAZE_COLUMNS - 1)}`;
    expect(() => parseMaze(rows)).toThrow();
  });
});
