import { describe, expect, it } from "vitest";
import type { MaomaoExportLevel } from "../model.ts";
import { analyzeDifficulty } from "./difficulty-metrics.ts";
import { calculateDifficultyRawScore, type DifficultyScoreInput } from "./difficulty-score.ts";

const base: DifficultyScoreInput = {
  width: 4,
  height: 6,
  boardArea: 24,
  clueCount: 6,
  initialCandidateCount: 12,
  minimumCandidateCount: 1,
  maximumCandidateCount: 3,
  averageCandidateCount: 2,
  candidateCountPerClue: [1, 2, 2, 2, 2, 3],
  initialForcedClueCount: 1,
  logicalSolved: true,
  logicalRounds: 2,
  logicalActions: 8,
  candidateEliminations: 6,
  forcedRectangleCount: 6,
  forcedCellCount: 24,
  initialCandidateTotal: 12,
  finalCandidateTotal: 6,
  unresolvedClueCount: 0,
  unresolvedCellCount: 0,
  logicalStall: false,
  contradiction: false,
  ruleApplications: { L1: 3, L2: 1, L3: 2, L4: 2, L5: 1 },
  searchNodes: 7,
  branchCount: 0,
  backtrackCount: 0,
  maximumSearchDepth: 6,
  firstBranchCandidateCount: 0,
  solutionCountCappedAt2: 1,
};

const simpleLevel: MaomaoExportLevel = {
  schemaVersion: 1,
  levelId: "candidate_simple_000001",
  chapter: 0,
  order: 0,
  width: 2,
  height: 1,
  difficulty: { tier: "unrated", score: 0 },
  clues: [{ row: 0, column: 0, value: 1 }, { row: 0, column: 1, value: 1 }],
  solutionRegions: [{ top: 0, left: 0, bottom: 0, right: 0 }, { top: 0, left: 1, bottom: 0, right: 1 }],
  tutorial: { enabled: false, stepId: "none" },
  contentVersion: 1,
  generation: {
    seed: "simple",
    sourceCommit: "commit",
    params: { width: 2, height: 1, expandfactor: 0, unique: true },
    fingerprint: "fingerprint",
  },
};

describe("difficulty scoring", () => {
  it("raises the score for logical stalls and search complexity", () => {
    const easy = calculateDifficultyRawScore(base);
    const hard = calculateDifficultyRawScore({
      ...base,
      logicalSolved: false,
      logicalStall: true,
      unresolvedClueCount: 4,
      searchNodes: 512,
      branchCount: 20,
      backtrackCount: 30,
      maximumSearchDepth: 12,
    });
    expect(hard).toBeGreaterThan(easy);
  });

  it("keeps the configured score within 0 to 1000", () => {
    expect(calculateDifficultyRawScore({ ...base, searchNodes: Number.MAX_SAFE_INTEGER })).toBeLessThanOrEqual(1000);
    expect(calculateDifficultyRawScore({ ...base, initialForcedClueCount: 999 })).toBeGreaterThanOrEqual(0);
  });

  it("returns identical full analysis for the same level", () => {
    expect(analyzeDifficulty(simpleLevel)).toEqual(analyzeDifficulty(simpleLevel));
  });
});
