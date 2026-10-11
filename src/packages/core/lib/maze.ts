export type TileType = "wall" | "pellet" | "powerPellet" | "empty" | "door";

export type Tile = {
  readonly type: TileType;
};

export type GridPosition = {
  readonly x: number;
  readonly y: number;
};

export type Maze = {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly Tile[])[];
  readonly pacmanStart: GridPosition;
};

export const MAZE_COLUMNS = 28;
export const MAZE_ROWS = 31;

export const CLASSIC_MAZE_ROWS: readonly string[] = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #GGGGGG# ##.######",
  "      .   #GGGGGG#   .      ",
  "######.## #GGGGGG# ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##....... P.......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

const TILE_BY_CHAR: Readonly<Record<string, TileType>> = {
  "#": "wall",
  ".": "pellet",
  o: "powerPellet",
  "-": "door",
  " ": "empty",
  P: "empty",
  G: "empty",
};

export function parseMaze(rows: readonly string[]): Maze {
  if (rows.length !== MAZE_ROWS) {
    throw new Error(`Maze must have ${MAZE_ROWS} rows, got ${rows.length}`);
  }

  let pacmanStart: GridPosition = { x: 0, y: 0 };

  const tiles = rows.map((row, y) => {
    if (row.length !== MAZE_COLUMNS) {
      throw new Error(`Maze row ${y} must be ${MAZE_COLUMNS} tiles wide, got ${row.length}`);
    }

    return [...row].map((char, x) => {
      const type = TILE_BY_CHAR[char];
      if (type === undefined) {
        throw new Error(`Unknown maze character ${JSON.stringify(char)} at (${x}, ${y})`);
      }
      if (char === "P") {
        pacmanStart = { x, y };
      }
      return { type };
    });
  });

  return { width: MAZE_COLUMNS, height: MAZE_ROWS, tiles, pacmanStart };
}
