import { describe, expect, it } from "vitest";
import type { MaomaoExportLevel } from "../model.ts";
import { boundarySignature, compareLevelSimilarity, regionShapeSignature } from "./similarity.ts";

function level(width: number, height: number, split: number): MaomaoExportLevel {
  return {
    schemaVersion: 1,
    levelId: `candidate_${width}x${height}_${split}`,
    chapter: 0,
    order: 0,
    width,
    height,
    difficulty: { tier: "unrated", score: 0 },
    clues: [
      { row: 0, column: 0, value: split * height },
      { row: 0, column: split, value: (width - split) * height },
    ],
    solutionRegions: [
      { top: 0, left: 0, bottom: height - 1, right: split - 1 },
      { top: 0, left: split, bottom: height - 1, right: width - 1 },
    ],
    tutorial: { enabled: false, stepId: "none" },
    contentVersion: 1,
    generation: { seed: "seed", sourceCommit: "commit", params: { width, height, expandfactor: 0, unique: true }, fingerprint: "fp" },
  };
}

describe("formal structural similarity", () => {
  it("returns one for identical same-size structures", () => {
    expect(compareLevelSimilarity(level(5, 7, 2), level(5, 7, 2))).toEqual({
      boundarySimilarity: 1,
      regionShapeSimilarity: 1,
      clueLayoutSimilarity: 1,
      overallSimilarity: 1,
    });
  });

  it("detects changed boundaries, shapes, and clues", () => {
    const first = level(5, 7, 2);
    const second = level(5, 7, 1);
    expect(boundarySignature(first)).not.toEqual(boundarySignature(second));
    expect(regionShapeSignature(first)).not.toEqual(regionShapeSignature(second));
    expect(compareLevelSimilarity(first, second).overallSimilarity).toBeLessThan(1);
  });

  it("does not compare near-duplicate structure across dimensions", () => {
    expect(compareLevelSimilarity(level(4, 6, 2), level(6, 4, 2)).overallSimilarity).toBe(0);
  });
});
