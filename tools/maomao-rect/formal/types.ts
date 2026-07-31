import type { AcceptedCandidate, MaomaoExportLevel } from "../model.ts";
import type { DifficultyMetrics } from "../difficulty/types.ts";

export interface CandidateAnalysis {
  readonly candidate: AcceptedCandidate;
  readonly difficulty: DifficultyMetrics;
  readonly qualityScore: number;
  readonly sizeKey: string;
}

export interface RankedCandidate extends CandidateAnalysis {
  readonly quantile: 1 | 2 | 3 | 4 | 5;
  readonly qualityPercentile: number;
}

export interface SimilarityMetrics {
  readonly boundarySimilarity: number;
  readonly regionShapeSimilarity: number;
  readonly clueLayoutSimilarity: number;
  readonly overallSimilarity: number;
}

export interface SimilarityRejection extends SimilarityMetrics {
  readonly stage: "formal" | "reserve";
  readonly candidateId: string;
  readonly againstId: string;
}

export interface SelectedCandidate extends RankedCandidate {
  readonly selectionStage: "formal" | "reserve";
  readonly qualityFractionUsed: number;
  readonly quantileRequested?: 1 | 2 | 3 | 4 | 5;
  readonly quantileFallback: boolean;
  readonly preferredForCandidateId?: string;
}

export interface OrderedFormalLevel extends SelectedCandidate {
  readonly levelId: string;
  readonly chapter: number;
  readonly order: number;
  readonly difficultyTier: "easy" | "medium" | "hard";
  readonly difficultyScore: number;
  readonly preferredReserveId: string;
}

export interface OrderedReserveLevel extends SelectedCandidate {
  readonly reserveId: string;
  readonly matchedFormalLevelId: string;
  readonly replacementScoreRange: readonly [number, number];
}

export interface FormalRuntimeLevel {
  readonly schemaVersion: 1;
  readonly levelId: string;
  readonly chapter: number;
  readonly order: number;
  readonly width: number;
  readonly height: number;
  readonly difficulty: { readonly tier: "easy" | "medium" | "hard"; readonly score: number };
  readonly clues: MaomaoExportLevel["clues"];
  readonly solutionRegions: MaomaoExportLevel["solutionRegions"];
  readonly tutorial: { readonly enabled: false; readonly stepId: "none" };
  readonly contentVersion: 1;
}

export interface ReserveRuntimeLevel {
  readonly schemaVersion: 1;
  readonly levelId: string;
  readonly chapter: 0;
  readonly order: 0;
  readonly width: number;
  readonly height: number;
  readonly difficulty: { readonly tier: "unrated"; readonly score: 0 };
  readonly clues: MaomaoExportLevel["clues"];
  readonly solutionRegions: MaomaoExportLevel["solutionRegions"];
  readonly tutorial: { readonly enabled: false; readonly stepId: "none" };
  readonly contentVersion: 1;
}

export interface FormalSelectionResult {
  readonly sourcePoolVersion: "maomao-rectangular-v0.2.1";
  readonly generatorCommit: string;
  readonly analyzed: readonly RankedCandidate[];
  readonly formal: readonly OrderedFormalLevel[];
  readonly reserve: readonly OrderedReserveLevel[];
  readonly similarityThreshold: number;
  readonly similarityRejections: readonly SimilarityRejection[];
  readonly qualityRelaxations: Readonly<Record<string, number>>;
  readonly quantileFallbacks: number;
  readonly majorDifficultyReversals: number;
  readonly fullPoolDifficultyStandardDeviation: number;
}
