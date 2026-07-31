import { DIFFICULTY_SCORE_CONFIG, type DifficultyScoreConfig } from "./difficulty-config.ts";
import type { DifficultyMetrics } from "./types.ts";

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function logarithmic(value: number, scale: number): number {
  return clamp(Math.log2(Math.max(1, value)) / scale);
}

export type DifficultyScoreInput = Omit<DifficultyMetrics, "difficultyRawScore" | "analyzerVersion" | "levelId">;

export function calculateDifficultyRawScore(
  metrics: DifficultyScoreInput,
  config: DifficultyScoreConfig = DIFFICULTY_SCORE_CONFIG,
): number {
  const clueCount = Math.max(1, metrics.clueCount);
  const candidateTotal = Math.max(1, metrics.initialCandidateCount);
  const score =
    clamp(metrics.boardArea / 96) * config.areaWeight
    + clamp(metrics.averageCandidateCount / 20) * config.averageCandidateWeight
    + clamp(metrics.initialForcedClueCount / clueCount) * config.initialForcedRatioWeight
    + clamp(metrics.logicalRounds / 20) * config.logicalRoundsWeight
    + clamp(metrics.candidateEliminations / candidateTotal) * config.eliminationRatioWeight
    + (metrics.logicalStall ? config.logicalStallWeight : 0)
    + clamp(metrics.unresolvedClueCount / clueCount) * config.unresolvedClueRatioWeight
    + logarithmic(metrics.searchNodes, 12) * config.searchNodeWeight
    + clamp(metrics.maximumSearchDepth / clueCount) * config.searchDepthWeight
    + logarithmic(metrics.backtrackCount + 1, 10) * config.backtrackWeight;
  return Math.round(clamp(score, 0, 1000));
}
