import type { MaomaoClue, MaomaoExportLevel } from "../model.ts";
import type { CandidateEnumeration, RectangleCandidate } from "./types.ts";

export function rectangleMask(width: number, rectangle: Pick<RectangleCandidate, "top" | "left" | "bottom" | "right">): bigint {
  let mask = 0n;
  for (let row = rectangle.top; row <= rectangle.bottom; row++) {
    for (let column = rectangle.left; column <= rectangle.right; column++) {
      mask |= 1n << BigInt(row * width + column);
    }
  }
  return mask;
}

function contains(rectangle: Pick<RectangleCandidate, "top" | "left" | "bottom" | "right">, clue: MaomaoClue): boolean {
  return clue.row >= rectangle.top && clue.row <= rectangle.bottom
    && clue.column >= rectangle.left && clue.column <= rectangle.right;
}

export function compareRectangles(first: RectangleCandidate, second: RectangleCandidate): number {
  return first.top - second.top
    || first.left - second.left
    || first.bottom - second.bottom
    || first.right - second.right;
}

export function enumerateRectanglesForClue(
  width: number,
  height: number,
  clues: readonly MaomaoClue[],
  clueIndex: number,
): RectangleCandidate[] {
  const clue = clues[clueIndex];
  if (!clue) throw new Error(`Missing clue at index ${clueIndex}`);
  const candidates: RectangleCandidate[] = [];
  for (let rectangleHeight = 1; rectangleHeight <= height; rectangleHeight++) {
    if (clue.value % rectangleHeight !== 0) continue;
    const rectangleWidth = clue.value / rectangleHeight;
    if (!Number.isInteger(rectangleWidth) || rectangleWidth < 1 || rectangleWidth > width) continue;
    const minimumTop = Math.max(0, clue.row - rectangleHeight + 1);
    const maximumTop = Math.min(clue.row, height - rectangleHeight);
    const minimumLeft = Math.max(0, clue.column - rectangleWidth + 1);
    const maximumLeft = Math.min(clue.column, width - rectangleWidth);
    for (let top = minimumTop; top <= maximumTop; top++) {
      for (let left = minimumLeft; left <= maximumLeft; left++) {
        const rectangle = {
          clueIndex,
          top,
          left,
          bottom: top + rectangleHeight - 1,
          right: left + rectangleWidth - 1,
        };
        if (clues.some((other, index) => index !== clueIndex && contains(rectangle, other))) continue;
        candidates.push({ ...rectangle, mask: rectangleMask(width, rectangle) });
      }
    }
  }
  return candidates.sort(compareRectangles);
}

export function enumerateLevelCandidates(level: MaomaoExportLevel): CandidateEnumeration {
  const candidatesByClue = level.clues.map((_, index) => enumerateRectanglesForClue(
    level.width,
    level.height,
    level.clues,
    index,
  ));
  const counts = candidatesByClue.map((candidates) => candidates.length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  return {
    width: level.width,
    height: level.height,
    clues: level.clues,
    candidatesByClue,
    initialCandidateCount: total,
    minimumCandidateCount: counts.length ? Math.min(...counts) : 0,
    maximumCandidateCount: counts.length ? Math.max(...counts) : 0,
    averageCandidateCount: counts.length ? total / counts.length : 0,
    candidateCountPerClue: counts,
    initialForcedClueCount: counts.filter((count) => count === 1).length,
  };
}
