import type { MaomaoExportLevel, MaomaoRegion } from "../model.ts";
import type { SimilarityMetrics } from "./types.ts";

function setJaccard(first: ReadonlySet<string>, second: ReadonlySet<string>): number {
  const union = new Set([...first, ...second]);
  if (union.size === 0) return 1;
  let intersection = 0;
  for (const value of first) if (second.has(value)) intersection++;
  return intersection / union.size;
}

function multisetJaccard(first: readonly string[], second: readonly string[]): number {
  const counts = (values: readonly string[]): Map<string, number> => {
    const result = new Map<string, number>();
    for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
    return result;
  };
  const firstCounts = counts(first);
  const secondCounts = counts(second);
  const keys = new Set([...firstCounts.keys(), ...secondCounts.keys()]);
  let intersection = 0;
  let union = 0;
  for (const key of keys) {
    intersection += Math.min(firstCounts.get(key) ?? 0, secondCounts.get(key) ?? 0);
    union += Math.max(firstCounts.get(key) ?? 0, secondCounts.get(key) ?? 0);
  }
  return union === 0 ? 1 : intersection / union;
}

function regionIndexByCell(level: MaomaoExportLevel): Int32Array {
  const result = new Int32Array(level.width * level.height).fill(-1);
  level.solutionRegions.forEach((region, index) => {
    for (let row = region.top; row <= region.bottom; row++) {
      for (let column = region.left; column <= region.right; column++) result[row * level.width + column] = index;
    }
  });
  return result;
}

export function boundarySignature(level: MaomaoExportLevel): ReadonlySet<string> {
  const cells = regionIndexByCell(level);
  const result = new Set<string>();
  for (let row = 0; row < level.height; row++) {
    for (let column = 0; column < level.width - 1; column++) {
      if (cells[row * level.width + column] !== cells[row * level.width + column + 1]) result.add(`V:${row}:${column}`);
    }
  }
  for (let row = 0; row < level.height - 1; row++) {
    for (let column = 0; column < level.width; column++) {
      if (cells[row * level.width + column] !== cells[(row + 1) * level.width + column]) result.add(`H:${row}:${column}`);
    }
  }
  return result;
}

function shapeSignature(region: MaomaoRegion): string {
  const width = region.right - region.left + 1;
  const height = region.bottom - region.top + 1;
  const orientation = width === height ? "square" : width > height ? "horizontal" : "vertical";
  return `${width}x${height}:${width * height}:${orientation}`;
}

export function regionShapeSignature(level: MaomaoExportLevel): readonly string[] {
  return level.solutionRegions.map(shapeSignature).sort();
}

export function clueLayoutSignature(level: MaomaoExportLevel): ReadonlySet<string> {
  return new Set(level.clues.map((clue) => {
    const rowBucket = level.height === 1 ? 0 : Math.round((clue.row / (level.height - 1)) * 4);
    const columnBucket = level.width === 1 ? 0 : Math.round((clue.column / (level.width - 1)) * 4);
    return `${clue.row}:${clue.column}:${clue.value}:${rowBucket}:${columnBucket}`;
  }));
}

export function compareLevelSimilarity(first: MaomaoExportLevel, second: MaomaoExportLevel): SimilarityMetrics {
  if (first.width !== second.width || first.height !== second.height) {
    return { boundarySimilarity: 0, regionShapeSimilarity: 0, clueLayoutSimilarity: 0, overallSimilarity: 0 };
  }
  const boundarySimilarity = setJaccard(boundarySignature(first), boundarySignature(second));
  const regionShapeSimilarity = multisetJaccard(regionShapeSignature(first), regionShapeSignature(second));
  const clueLayoutSimilarity = setJaccard(clueLayoutSignature(first), clueLayoutSignature(second));
  const overallSimilarity = boundarySimilarity * 0.55 + regionShapeSimilarity * 0.25 + clueLayoutSimilarity * 0.2;
  return {
    boundarySimilarity: Number(boundarySimilarity.toFixed(6)),
    regionShapeSimilarity: Number(regionShapeSimilarity.toFixed(6)),
    clueLayoutSimilarity: Number(clueLayoutSimilarity.toFixed(6)),
    overallSimilarity: Number(overallSimilarity.toFixed(6)),
  };
}
