import type { MaomaoExportLevel } from "../model.ts";
import { enumerateLevelCandidates } from "./candidate-enumerator.ts";
import { DIFFICULTY_ANALYZER_VERSION } from "./difficulty-config.ts";
import { calculateDifficultyRawScore } from "./difficulty-score.ts";
import { solveLogically } from "./logical-solver.ts";
import { profileSearch } from "./search-profiler.ts";
import type { DifficultyMetrics } from "./types.ts";

export function analyzeDifficulty(level: MaomaoExportLevel): DifficultyMetrics {
  const enumeration = enumerateLevelCandidates(level);
  const logical = solveLogically(enumeration);
  const search = profileSearch(enumeration);
  const scoreInput = {
    width: level.width,
    height: level.height,
    boardArea: level.width * level.height,
    clueCount: level.clues.length,
    initialCandidateCount: enumeration.initialCandidateCount,
    minimumCandidateCount: enumeration.minimumCandidateCount,
    maximumCandidateCount: enumeration.maximumCandidateCount,
    averageCandidateCount: enumeration.averageCandidateCount,
    candidateCountPerClue: enumeration.candidateCountPerClue,
    initialForcedClueCount: enumeration.initialForcedClueCount,
    ...logical,
    ...search,
  };
  return {
    analyzerVersion: DIFFICULTY_ANALYZER_VERSION,
    levelId: level.levelId,
    ...scoreInput,
    difficultyRawScore: calculateDifficultyRawScore(scoreInput),
  };
}
