import type { MaomaoClue, MaomaoRegion, ParsedRectangles } from "./model.ts";

function decodeNumbers(desc: string, area: number): Int32Array {
  const grid = new Int32Array(area);
  let index = 0;
  let cursor = 0;
  while (cursor < desc.length) {
    const character = desc[cursor++];
    if (character >= "a" && character <= "z") {
      let run = character.charCodeAt(0) - "a".charCodeAt(0) + 1;
      while (run-- > 0) grid[index++] = 0;
    } else if (character === "_") {
      continue;
    } else if (character > "0" && character <= "9") {
      const start = cursor - 1;
      while (cursor < desc.length && desc[cursor] >= "0" && desc[cursor] <= "9") cursor++;
      grid[index++] = Number.parseInt(desc.slice(start, cursor), 10);
    } else {
      throw new Error(`Invalid Rectangles desc character: ${character}`);
    }
  }
  if (index !== area) throw new Error(`Invalid Rectangles desc coverage: expected ${area}, got ${index}`);
  return grid;
}

function checkDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error("Rectangles dimensions must be integers of at least 2x2");
  }
}

function wallAt(aux: string, width: number, height: number, from: number, to: number): boolean {
  const fromRow = Math.floor(from / width);
  const fromColumn = from % width;
  const toRow = Math.floor(to / width);
  const toColumn = to % width;
  if (fromRow === toRow) {
    const column = Math.max(fromColumn, toColumn);
    const offset = 1 + fromRow * (width - 1) + column - 1;
    return aux[offset] === "1";
  }
  const row = Math.max(fromRow, toRow);
  const offset = 1 + (width - 1) * height + (row - 1) * width + fromColumn;
  return aux[offset] === "1";
}

function regionFromCells(cells: number[], width: number): MaomaoRegion {
  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let bottom = -1;
  let right = -1;
  for (const cell of cells) {
    const row = Math.floor(cell / width);
    const column = cell % width;
    top = Math.min(top, row);
    left = Math.min(left, column);
    bottom = Math.max(bottom, row);
    right = Math.max(right, column);
  }
  return { top, left, bottom, right };
}

export function parseRectangles(width: number, height: number, desc: string, aux: string): ParsedRectangles {
  checkDimensions(width, height);
  const expectedAuxLength = 1 + (width - 1) * height + (height - 1) * width;
  if (aux[0] !== "S" || aux.length !== expectedAuxLength || /[^S01]/.test(aux)) {
    throw new Error(`Invalid Rectangles aux length or encoding: expected ${expectedAuxLength}`);
  }

  const area = width * height;
  const grid = decodeNumbers(desc, area);
  const clues: MaomaoClue[] = [];
  for (let index = 0; index < area; index++) {
    if (grid[index] > 0) {
      clues.push({ row: Math.floor(index / width), column: index % width, value: grid[index] });
    }
  }

  const visited = new Uint8Array(area);
  const solutionRegions: MaomaoRegion[] = [];
  for (let start = 0; start < area; start++) {
    if (visited[start]) continue;
    const queue = [start];
    const cells: number[] = [];
    visited[start] = 1;
    while (queue.length > 0) {
      const cell = queue.shift();
      if (cell === undefined) continue;
      cells.push(cell);
      const row = Math.floor(cell / width);
      const column = cell % width;
      const neighbours: number[] = [];
      if (column > 0) neighbours.push(cell - 1);
      if (column + 1 < width) neighbours.push(cell + 1);
      if (row > 0) neighbours.push(cell - width);
      if (row + 1 < height) neighbours.push(cell + width);
      for (const neighbour of neighbours) {
        if (visited[neighbour] || wallAt(aux, width, height, cell, neighbour)) continue;
        visited[neighbour] = 1;
        queue.push(neighbour);
      }
    }
    solutionRegions.push(regionFromCells(cells, width));
  }

  solutionRegions.sort((a, b) => a.top - b.top || a.left - b.left || a.bottom - b.bottom || a.right - b.right);
  clues.sort((a, b) => a.row - b.row || a.column - b.column);
  return { width, height, desc, aux, clues, solutionRegions };
}
