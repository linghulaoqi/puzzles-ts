import type { QualityConfig } from "./model.ts";

export const QUALITY_CONFIG_VERSION = "PROVISIONAL_RECTANGULAR_QUALITY_FILTERS_V0.1";

export interface RectangularPoolSpec {
  readonly width: number;
  readonly height: number;
  readonly acceptedTarget: number;
  readonly maxAttempts: number;
}

export const RECTANGULAR_POOL_SPECS: readonly RectangularPoolSpec[] = Object.freeze([
  { width: 4, height: 6, acceptedTarget: 100, maxAttempts: 10_000 },
  { width: 5, height: 7, acceptedTarget: 200, maxAttempts: 20_000 },
  { width: 5, height: 8, acceptedTarget: 250, maxAttempts: 25_000 },
  { width: 6, height: 9, acceptedTarget: 350, maxAttempts: 35_000 },
  { width: 7, height: 10, acceptedTarget: 400, maxAttempts: 40_000 },
  { width: 8, height: 12, acceptedTarget: 500, maxAttempts: 50_000 },
]);

export function boardSizeKey(width: number, height: number): string {
  return `${width}x${height}`;
}

export const QUALITY_CONFIGS: Readonly<Record<string, QualityConfig>> = Object.freeze({
  "4x4": { maxSingletons: 2, maxAspectRatio: 4, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.75 },
  "5x5": { maxSingletons: 2, maxAspectRatio: 4, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.75 },
  "6x6": { maxSingletons: 3, maxAspectRatio: 4, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.75 },
  "7x7": { maxSingletons: 4, maxAspectRatio: 4, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.75 },
  "4x6": { maxSingletons: 2, maxAspectRatio: 6, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
  "5x7": { maxSingletons: 3, maxAspectRatio: 7, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
  "5x8": { maxSingletons: 3, maxAspectRatio: 8, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
  "6x9": { maxSingletons: 4, maxAspectRatio: 9, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
  "7x10": { maxSingletons: 5, maxAspectRatio: 10, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
  "8x12": { maxSingletons: 6, maxAspectRatio: 12, maxLongThinFraction: 0.5, maxEdgeClueFraction: 0.85 },
});

export interface ResolvedQualityConfig {
  readonly key: string;
  readonly config: QualityConfig;
  readonly dedicated: boolean;
}

export function resolveQualityConfig(width: number, height: number): ResolvedQualityConfig {
  const key = boardSizeKey(width, height);
  const dedicated = QUALITY_CONFIGS[key];
  if (dedicated !== undefined) return { key, config: dedicated, dedicated: true };
  return {
    key,
    dedicated: false,
    config: {
      maxSingletons: Math.max(1, Math.floor((width * height) / 8)),
      maxAspectRatio: 4,
      maxLongThinFraction: 0.5,
      maxEdgeClueFraction: 0.75,
    },
  };
}

export function isRectangularProductionSize(width: number, height: number): boolean {
  return RECTANGULAR_POOL_SPECS.some((spec) => spec.width === width && spec.height === height);
}
