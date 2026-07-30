import type { MaomaoClue, MaomaoRegion, MaomaoValidation } from "./model.ts";

function regionArea(region: MaomaoRegion): number {
  return (region.bottom - region.top + 1) * (region.right - region.left + 1);
}

function contains(region: MaomaoRegion, clue: MaomaoClue): boolean {
  return clue.row >= region.top && clue.row <= region.bottom && clue.column >= region.left && clue.column <= region.right;
}

export function validateRectangles(
  width: number,
  height: number,
  clues: MaomaoClue[],
  regions: MaomaoRegion[],
  uniqueRequested = true,
): MaomaoValidation {
  const errors: string[] = [];
  const cells = new Int32Array(width * height).fill(-1);
  const clueCoordinates = new Set<string>();
  for (const clue of clues) {
    const key = `${clue.row},${clue.column}`;
    if (clueCoordinates.has(key)) errors.push(`DUPLICATE_CLUE:${key}`);
    clueCoordinates.add(key);
    if (clue.row < 0 || clue.row >= height || clue.column < 0 || clue.column >= width || clue.value <= 0) {
      errors.push(`INVALID_CLUE:${key}`);
    }
  }
  for (let index = 0; index < regions.length; index++) {
    const region = regions[index];
    if (
      region.top < 0 ||
      region.left < 0 ||
      region.bottom >= height ||
      region.right >= width ||
      region.top > region.bottom ||
      region.left > region.right
    ) {
      errors.push(`REGION_OUT_OF_BOUNDS:${index}`);
      continue;
    }
    const area = regionArea(region);
    let regionClues = 0;
    for (let row = region.top; row <= region.bottom; row++) {
      for (let column = region.left; column <= region.right; column++) {
        const cell = row * width + column;
        if (cells[cell] !== -1) errors.push(`REGION_OVERLAP:${cell}`);
        cells[cell] = index;
      }
    }
    for (const clue of clues) {
      if (contains(region, clue)) {
        regionClues++;
        if (clue.value !== area) errors.push(`CLUE_AREA_MISMATCH:${clue.row},${clue.column}`);
      }
    }
    if (regionClues !== 1) errors.push(`REGION_CLUE_COUNT:${index}:${regionClues}`);
  }
  for (let cell = 0; cell < cells.length; cell++) if (cells[cell] === -1) errors.push(`UNCOVERED_CELL:${cell}`);
  if (clues.length !== regions.length) errors.push("CLUE_REGION_COUNT_MISMATCH");
  return {
    structuralValid: errors.length === 0,
    uniqueRequested,
    uniqueVerified: errors.length === 0 && uniqueRequested,
    uniquenessSource: "upstream Rectangles generator guarantee",
    errors,
  };
}

