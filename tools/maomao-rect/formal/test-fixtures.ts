import type { DifficultyMetrics } from "../difficulty/types.ts";
import type { AcceptedCandidate, MaomaoMetrics } from "../model.ts";
import { FORMAL_SIZE_QUOTAS } from "./formal-config.ts";
import { selectFormalLevels } from "./formal-selector.ts";
import type { CandidateAnalysis, FormalSelectionResult } from "./types.ts";

function metrics(fingerprint: string): MaomaoMetrics {
  return {
    regionCount: 1,
    singleCellRegionCount: 0,
    maxRegionArea: 96,
    minRegionArea: 24,
    averageRegionArea: 40,
    maxAspectRatio: 1.5,
    longThinRegionCount: 0,
    horizontalRegionCount: 1,
    verticalRegionCount: 0,
    squareRegionCount: 0,
    clueEdgeCount: 1,
    clueCornerCount: 1,
    fingerprint,
  };
}

function difficulty(levelId: string, width: number, height: number, score: number): DifficultyMetrics {
  return {
    analyzerVersion: "MAOMAO_DIFFICULTY_ANALYZER_V0.1",
    levelId,
    width,
    height,
    boardArea: width * height,
    clueCount: 1,
    initialCandidateCount: 1,
    minimumCandidateCount: 1,
    maximumCandidateCount: 1,
    averageCandidateCount: 1,
    candidateCountPerClue: [1],
    initialForcedClueCount: 1,
    logicalSolved: true,
    logicalRounds: 1,
    logicalActions: 1,
    candidateEliminations: 0,
    forcedRectangleCount: 1,
    forcedCellCount: width * height,
    initialCandidateTotal: 1,
    finalCandidateTotal: 1,
    unresolvedClueCount: 0,
    unresolvedCellCount: 0,
    logicalStall: false,
    contradiction: false,
    ruleApplications: { L1: 1, L2: 0, L3: 0, L4: 0, L5: 0 },
    searchNodes: 2,
    branchCount: 0,
    backtrackCount: 0,
    maximumSearchDepth: 1,
    firstBranchCandidateCount: 0,
    solutionCountCappedAt2: 1,
    difficultyRawScore: score,
  };
}

export function buildMockAnalyses(): CandidateAnalysis[] {
  const result: CandidateAnalysis[] = [];
  FORMAL_SIZE_QUOTAS.forEach((quota, sizeIndex) => {
    const count = (quota.formal + quota.reserve) * 2;
    for (let index = 1; index <= count; index++) {
      const key = `${quota.width}x${quota.height}`;
      const suffix = String(index).padStart(6, "0");
      const levelId = `candidate_${key}_${suffix}`;
      const fingerprint = `${key}-${suffix}`;
      const candidate: AcceptedCandidate = {
        status: "accepted",
        seed: `maomao-${key}-${suffix}`,
        sourceCommit: "27554b9ec39b66941d62a28b0a7c957b05d44aa6",
        metrics: metrics(fingerprint),
        validation: { structuralValid: true, uniqueRequested: true, uniqueVerified: true, uniquenessSource: "test", errors: [] },
        level: {
          schemaVersion: 1,
          levelId,
          chapter: 0,
          order: 0,
          width: quota.width,
          height: quota.height,
          difficulty: { tier: "unrated", score: 0 },
          clues: [{ row: 0, column: 0, value: quota.width * quota.height }],
          solutionRegions: [{ top: 0, left: 0, bottom: quota.height - 1, right: quota.width - 1 }],
          tutorial: { enabled: false, stepId: "none" },
          contentVersion: 1,
          generation: {
            seed: `maomao-${key}-${suffix}`,
            sourceCommit: "27554b9ec39b66941d62a28b0a7c957b05d44aa6",
            params: { width: quota.width, height: quota.height, expandfactor: 0, unique: true },
            fingerprint,
          },
        },
      };
      result.push({
        candidate,
        difficulty: difficulty(levelId, quota.width, quota.height, 100 + sizeIndex * 130 + index),
        qualityScore: 100 - index / 100,
        sizeKey: key,
      });
    }
  });
  return result;
}

export function buildMockSelection(): FormalSelectionResult {
  return selectFormalLevels(buildMockAnalyses(), 1.01);
}
