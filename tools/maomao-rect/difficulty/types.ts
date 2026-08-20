import type { MaomaoClue, MaomaoExportLevel, MaomaoRegion } from "../model.ts";

export interface RectangleCandidate extends MaomaoRegion {
  readonly clueIndex: number;
  readonly mask: bigint;
}

export interface CandidateEnumeration {
  readonly width: number;
  readonly height: number;
  readonly clues: readonly MaomaoClue[];
  readonly candidatesByClue: readonly (readonly RectangleCandidate[])[];
  readonly initialCandidateCount: number;
  readonly minimumCandidateCount: number;
  readonly maximumCandidateCount: number;
  readonly averageCandidateCount: number;
  readonly candidateCountPerClue: readonly number[];
  readonly initialForcedClueCount: number;
}

export interface LogicalRuleApplications {
  readonly L1: number;
  readonly L2: number;
  readonly L3: number;
  readonly L4: number;
  readonly L5: number;
}

export interface LogicalAnalysis {
  readonly logicalSolved: boolean;
  readonly logicalRounds: number;
  readonly logicalActions: number;
  readonly candidateEliminations: number;
  readonly forcedRectangleCount: number;
  readonly forcedCellCount: number;
  readonly initialCandidateTotal: number;
  readonly finalCandidateTotal: number;
  readonly unresolvedClueCount: number;
  readonly unresolvedCellCount: number;
  readonly logicalStall: boolean;
  readonly contradiction: boolean;
  readonly ruleApplications: LogicalRuleApplications;
}

export interface SearchProfile {
  readonly searchNodes: number;
  readonly branchCount: number;
  readonly backtrackCount: number;
  readonly maximumSearchDepth: number;
  readonly firstBranchCandidateCount: number;
  readonly solutionCountCappedAt2: 0 | 1 | 2;
}

export interface DifficultyMetrics extends LogicalAnalysis, SearchProfile {
  readonly analyzerVersion: string;
  readonly levelId: string;
  readonly width: number;
  readonly height: number;
  readonly boardArea: number;
  readonly clueCount: number;
  readonly initialCandidateCount: number;
  readonly minimumCandidateCount: number;
  readonly maximumCandidateCount: number;
  readonly averageCandidateCount: number;
  readonly candidateCountPerClue: readonly number[];
  readonly initialForcedClueCount: number;
  readonly difficultyRawScore: number;
}

export interface AnalyzedLevel {
  readonly level: MaomaoExportLevel;
  readonly difficulty: DifficultyMetrics;
}
