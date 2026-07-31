export type CandidateStatus =
  | "accepted"
  | "rejected"
  | "generation_failed"
  | "validation_failed"
  | "duplicate";

export interface RectGenerationParams {
  width: number;
  height: number;
  expandfactor: number;
  unique: boolean;
}

export interface MaomaoClue {
  row: number;
  column: number;
  value: number;
}

export interface MaomaoRegion {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface MaomaoMetrics {
  regionCount: number;
  singleCellRegionCount: number;
  maxRegionArea: number;
  minRegionArea: number;
  averageRegionArea: number;
  maxAspectRatio: number;
  longThinRegionCount: number;
  horizontalRegionCount: number;
  verticalRegionCount: number;
  squareRegionCount: number;
  clueEdgeCount: number;
  clueCornerCount: number;
  fingerprint: string;
}

export interface MaomaoValidation {
  structuralValid: boolean;
  uniqueRequested: boolean;
  uniqueVerified: boolean;
  uniquenessSource: string;
  errors: string[];
}

export interface MaomaoExportLevel {
  schemaVersion: 1;
  levelId: string;
  chapter: 0;
  order: 0;
  width: number;
  height: number;
  difficulty: { tier: "unrated"; score: 0 };
  clues: MaomaoClue[];
  solutionRegions: MaomaoRegion[];
  tutorial: { enabled: false; stepId: "none" };
  contentVersion: 1;
  generation: {
    seed: string;
    sourceCommit: string;
    params: RectGenerationParams;
    fingerprint: string;
  };
}

export interface CandidateMetricsRecord {
  status: CandidateStatus;
  seed: string;
  sourceCommit: string;
  reasonCodes?: string[];
  metrics?: MaomaoMetrics;
  validation?: MaomaoValidation;
  level?: MaomaoExportLevel;
}

export interface AcceptedCandidate extends CandidateMetricsRecord {
  status: "accepted";
  metrics: MaomaoMetrics;
  validation: MaomaoValidation;
  level: MaomaoExportLevel;
}

export interface QualityConfig {
  maxSingletons: number;
  maxAspectRatio: number;
  maxLongThinFraction: number;
  maxEdgeClueFraction: number;
}

export interface ParsedRectangles {
  width: number;
  height: number;
  desc: string;
  aux: string;
  clues: MaomaoClue[];
  solutionRegions: MaomaoRegion[];
}
