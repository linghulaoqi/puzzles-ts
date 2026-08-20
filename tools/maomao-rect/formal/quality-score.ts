import type { MaomaoMetrics } from "../model.ts";

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function calculateQualityScore(metrics: MaomaoMetrics): number {
  const regions = Math.max(1, metrics.regionCount);
  const singletonFraction = metrics.singleCellRegionCount / regions;
  const longThinFraction = metrics.longThinRegionCount / regions;
  const edgeFraction = metrics.clueEdgeCount / regions;
  const orientationKinds = [metrics.horizontalRegionCount, metrics.verticalRegionCount, metrics.squareRegionCount]
    .filter((count) => count > 0).length;
  const aspectPenalty = clamp((metrics.maxAspectRatio - 1) / 11);
  const score = 100
    - singletonFraction * 20
    - longThinFraction * 20
    - edgeFraction * 15
    - aspectPenalty * 15
    + clamp((orientationKinds - 1) / 2) * 10;
  return Number(Math.max(0, Math.min(100, score)).toFixed(4));
}
