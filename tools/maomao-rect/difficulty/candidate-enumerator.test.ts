import { describe, expect, it } from "vitest";
import type { MaomaoExportLevel } from "../model.ts";
import { enumerateLevelCandidates, enumerateRectanglesForClue } from "./candidate-enumerator.ts";

function level(clues: MaomaoExportLevel["clues"]): MaomaoExportLevel {
  return {
    schemaVersion: 1,
    levelId: "candidate_test_000001",
    chapter: 0,
    order: 0,
    width: 4,
    height: 3,
    difficulty: { tier: "unrated", score: 0 },
    clues,
    solutionRegions: [],
    tutorial: { enabled: false, stepId: "none" },
    contentVersion: 1,
    generation: {
      seed: "test",
      sourceCommit: "commit",
      params: { width: 4, height: 3, expandfactor: 0, unique: true },
      fingerprint: "fingerprint",
    },
  };
}

describe("candidate rectangle enumeration", () => {
  it("enumerates every in-bounds factor rectangle containing the clue", () => {
    const candidates = enumerateRectanglesForClue(4, 3, [{ row: 1, column: 1, value: 4 }], 0);
    expect(candidates).toHaveLength(5);
    expect(candidates.map(({ top, left, bottom, right }) => ({ top, left, bottom, right }))).toEqual([
      { top: 0, left: 0, bottom: 1, right: 1 },
      { top: 0, left: 1, bottom: 1, right: 2 },
      { top: 1, left: 0, bottom: 1, right: 3 },
      { top: 1, left: 0, bottom: 2, right: 1 },
      { top: 1, left: 1, bottom: 2, right: 2 },
    ]);
  });

  it("excludes rectangles containing another clue", () => {
    const clues = [{ row: 1, column: 1, value: 4 }, { row: 1, column: 2, value: 1 }];
    const candidates = enumerateRectanglesForClue(4, 3, clues, 0);
    expect(candidates.every((rectangle) => !(
      clues[1]!.row >= rectangle.top && clues[1]!.row <= rectangle.bottom
      && clues[1]!.column >= rectangle.left && clues[1]!.column <= rectangle.right
    ))).toBe(true);
  });

  it("records deterministic aggregate candidate counts", () => {
    const enumeration = enumerateLevelCandidates(level([
      { row: 0, column: 0, value: 1 },
      { row: 1, column: 1, value: 4 },
    ]));
    expect(enumeration.candidateCountPerClue[0]).toBe(1);
    expect(enumeration.initialCandidateCount).toBe(
      enumeration.candidateCountPerClue.reduce((sum, count) => sum + count, 0),
    );
    expect(enumeration.initialForcedClueCount).toBe(1);
  });
});
