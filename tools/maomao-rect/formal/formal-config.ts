export const FORMAL_SELECTION_VERSION = "MAOMAO_FORMAL_SELECTION_V0.3";
export const SIMILARITY_FILTER_VERSION = "PROVISIONAL_SIMILARITY_FILTER_V0.1";
export const DEFAULT_SIMILARITY_THRESHOLD = 0.92;
export const QUALITY_RELAXATION_STEPS = [0.7, 0.8, 0.9, 1] as const;

export interface FormalSizeQuota {
  readonly width: number;
  readonly height: number;
  readonly formal: number;
  readonly reserve: number;
  readonly quantiles: readonly [number, number, number, number, number];
}

export const FORMAL_SIZE_QUOTAS: readonly FormalSizeQuota[] = Object.freeze([
  { width: 4, height: 6, formal: 15, reserve: 15, quantiles: [5, 4, 3, 2, 1] },
  { width: 5, height: 7, formal: 20, reserve: 20, quantiles: [4, 5, 5, 4, 2] },
  { width: 5, height: 8, formal: 20, reserve: 20, quantiles: [3, 4, 5, 5, 3] },
  { width: 6, height: 9, formal: 20, reserve: 20, quantiles: [2, 4, 5, 5, 4] },
  { width: 7, height: 10, formal: 15, reserve: 15, quantiles: [1, 2, 4, 4, 4] },
  { width: 8, height: 12, formal: 10, reserve: 10, quantiles: [0, 1, 2, 3, 4] },
]);

export const CHAPTER_SIZE_SEQUENCE: readonly string[] = Object.freeze([
  ...Array<string>(10).fill("4x6"),
  ...Array<string>(5).fill("4x6"),
  ...Array<string>(5).fill("5x7"),
  ...Array<string>(10).fill("5x7"),
  ...Array<string>(5).fill("5x7"),
  ...Array<string>(5).fill("5x8"),
  ...Array<string>(10).fill("5x8"),
  ...Array<string>(5).fill("5x8"),
  ...Array<string>(5).fill("6x9"),
  ...Array<string>(10).fill("6x9"),
  ...Array<string>(5).fill("6x9"),
  ...Array<string>(5).fill("7x10"),
  ...Array<string>(10).fill("7x10"),
  ...Array<string>(10).fill("8x12"),
]);

export function tierForScore(score: number): "easy" | "medium" | "hard" {
  if (score <= 30) return "easy";
  if (score <= 80) return "medium";
  return "hard";
}
