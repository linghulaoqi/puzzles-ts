import { describe, expect, it } from "vitest";
import type { MaomaoClue } from "../model.ts";
import { rectangleMask } from "./candidate-enumerator.ts";
import { solveLogically } from "./logical-solver.ts";
import type { CandidateEnumeration, RectangleCandidate } from "./types.ts";

function candidate(width: number, clueIndex: number, left: number, right = left): RectangleCandidate {
  const rectangle = { clueIndex, top: 0, left, bottom: 0, right };
  return { ...rectangle, mask: rectangleMask(width, rectangle) };
}

function enumeration(width: number, candidatesByClue: readonly (readonly RectangleCandidate[])[]): CandidateEnumeration {
  const clues: MaomaoClue[] = candidatesByClue.map((_, column) => ({ row: 0, column, value: 1 }));
  const counts = candidatesByClue.map((items) => items.length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  return {
    width,
    height: 1,
    clues,
    candidatesByClue,
    initialCandidateCount: total,
    minimumCandidateCount: Math.min(...counts),
    maximumCandidateCount: Math.max(...counts),
    averageCandidateCount: total / counts.length,
    candidateCountPerClue: counts,
    initialForcedClueCount: counts.filter((count) => count === 1).length,
  };
}

describe("deterministic logical solver", () => {
  it("uses L1 single-candidate rectangles to solve a board", () => {
    const result = solveLogically(enumeration(2, [[candidate(2, 0, 0)], [candidate(2, 1, 1)]]));
    expect(result.logicalSolved).toBe(true);
    expect(result.ruleApplications.L1).toBe(2);
  });

  it("uses L3 to remove candidates overlapping a fixed rectangle", () => {
    const result = solveLogically(enumeration(2, [
      [candidate(2, 0, 0)],
      [candidate(2, 1, 0), candidate(2, 1, 1)],
    ]));
    expect(result.logicalSolved).toBe(true);
    expect(result.ruleApplications.L3).toBeGreaterThan(0);
  });

  it("uses L2 common cells and L5 ownership exclusion", () => {
    const firstA = { ...candidate(3, 0, 0, 1) };
    const firstB = { ...candidate(3, 0, 0, 2) };
    const result = solveLogically(enumeration(3, [
      [firstA, firstB],
      [candidate(3, 1, 0), candidate(3, 1, 2)],
    ]));
    expect(result.ruleApplications.L2).toBeGreaterThan(0);
    expect(result.ruleApplications.L5).toBeGreaterThan(0);
  });

  it("uses L4 when an unowned cell has only one covering candidate", () => {
    const result = solveLogically(enumeration(3, [
      [candidate(3, 0, 0), candidate(3, 0, 1)],
      [candidate(3, 1, 1), candidate(3, 1, 2)],
    ]));
    expect(result.ruleApplications.L4).toBeGreaterThan(0);
  });

  it("stops at a fixed point when no rule can progress", () => {
    const result = solveLogically(enumeration(2, [
      [candidate(2, 0, 0), candidate(2, 0, 1)],
      [candidate(2, 1, 0), candidate(2, 1, 1)],
    ]));
    expect(result.logicalSolved).toBe(false);
    expect(result.logicalStall).toBe(true);
    expect(result.contradiction).toBe(false);
  });
});
