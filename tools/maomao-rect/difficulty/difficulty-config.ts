export const DIFFICULTY_ANALYZER_VERSION = "MAOMAO_DIFFICULTY_ANALYZER_V0.1";
export const DIFFICULTY_MODEL_VERSION = "PROVISIONAL_DIFFICULTY_MODEL_V0.1";

export interface DifficultyScoreConfig {
  readonly areaWeight: number;
  readonly averageCandidateWeight: number;
  readonly initialForcedRatioWeight: number;
  readonly logicalRoundsWeight: number;
  readonly eliminationRatioWeight: number;
  readonly logicalStallWeight: number;
  readonly unresolvedClueRatioWeight: number;
  readonly searchNodeWeight: number;
  readonly searchDepthWeight: number;
  readonly backtrackWeight: number;
}

export const DIFFICULTY_SCORE_CONFIG: DifficultyScoreConfig = Object.freeze({
  areaWeight: 800,
  averageCandidateWeight: 30,
  initialForcedRatioWeight: -20,
  logicalRoundsWeight: 20,
  eliminationRatioWeight: 20,
  logicalStallWeight: 20,
  unresolvedClueRatioWeight: 15,
  searchNodeWeight: 35,
  searchDepthWeight: 20,
  backtrackWeight: 30,
});
