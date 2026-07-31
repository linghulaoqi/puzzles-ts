import { describe, expect, it } from "vitest";
import type { MaomaoClue } from "../model.ts";
import { rectangleMask } from "./candidate-enumerator.ts";
import { profileSearch } from "./search-profiler.ts";
import type { CandidateEnumeration, RectangleCandidate } from "./types.ts";

function candidate(width: number, clueIndex: number, column: number): RectangleCandidate {
  const rectangle = { clueIndex, top: 0, left: column, bottom: 0, right: column };
  return { ...rectangle, mask: rectangleMask(width, rectangle) };
}

function enumeration(candidatesByClue: readonly (readonly RectangleCandidate[])[]): CandidateEnumeration {
  const clues: MaomaoClue[] = candidatesByClue.map((_, index) => ({ row: 0, column: index, value: 1 }));
  const counts = candidatesByClue.map((items) => items.length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  return {
    width: 2,
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

describe("deterministic search profiler", () => {
  it("recognizes a unique solution", () => {
    const input = enumeration([
      [candidate(2, 0, 0), candidate(2, 0, 1)],
      [candidate(2, 1, 1)],
    ]);
    expect(profileSearch(input).solutionCountCappedAt2).toBe(1);
  });

  it("caps multiple solutions at two", () => {
    const input = enumeration([
      [candidate(2, 0, 0), candidate(2, 0, 1)],
      [candidate(2, 1, 0), candidate(2, 1, 1)],
    ]);
    expect(profileSearch(input).solutionCountCappedAt2).toBe(2);
  });

  it("recognizes an unsatisfiable candidate set", () => {
    const input = enumeration([[candidate(2, 0, 0)], [candidate(2, 1, 0)]]);
    expect(profileSearch(input).solutionCountCappedAt2).toBe(0);
  });

  it("repeats the same branch order and counters", () => {
    const input = enumeration([
      [candidate(2, 0, 0), candidate(2, 0, 1)],
      [candidate(2, 1, 0), candidate(2, 1, 1)],
    ]);
    expect(profileSearch(input)).toEqual(profileSearch(input));
    expect(profileSearch(input).firstBranchCandidateCount).toBe(2);
  });
});
