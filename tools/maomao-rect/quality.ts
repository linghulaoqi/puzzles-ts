import type { MaomaoClue, MaomaoMetrics, MaomaoRegion, QualityConfig } from "./model.ts";

export { QUALITY_CONFIGS as DEFAULT_QUALITY } from "./quality-config.ts";

function area(region: MaomaoRegion): number {
  return (region.bottom - region.top + 1) * (region.right - region.left + 1);
}

function aspect(region: MaomaoRegion): number {
  const width = region.right - region.left + 1;
  const height = region.bottom - region.top + 1;
  return Math.max(width / height, height / width);
}

function isEdge(clue: MaomaoClue, width: number, height: number): boolean {
  return clue.row === 0 || clue.row === height - 1 || clue.column === 0 || clue.column === width - 1;
}

function isCorner(clue: MaomaoClue, width: number, height: number): boolean {
  const horizontal = clue.column === 0 || clue.column === width - 1;
  const vertical = clue.row === 0 || clue.row === height - 1;
  return horizontal && vertical;
}

export function calculateMetrics(
  width: number,
  height: number,
  clues: MaomaoClue[],
  regions: MaomaoRegion[],
  fingerprint: string,
  config: QualityConfig,
): MaomaoMetrics {
  const areas = regions.map(area);
  const aspects = regions.map(aspect);
  return {
    regionCount: regions.length,
    singleCellRegionCount: areas.filter((value) => value === 1).length,
    maxRegionArea: Math.max(...areas, 0),
    minRegionArea: regions.length ? Math.min(...areas) : 0,
    averageRegionArea: regions.length ? areas.reduce((sum, value) => sum + value, 0) / regions.length : 0,
    maxAspectRatio: Number(Math.max(...aspects, 0).toFixed(4)),
    longThinRegionCount: aspects.filter((value) => value >= config.maxAspectRatio).length,
    horizontalRegionCount: regions.filter((region) => region.right - region.left > region.bottom - region.top).length,
    verticalRegionCount: regions.filter((region) => region.bottom - region.top > region.right - region.left).length,
    squareRegionCount: regions.filter((region) => region.right - region.left === region.bottom - region.top).length,
    clueEdgeCount: clues.filter((clue) => isEdge(clue, width, height)).length,
    clueCornerCount: clues.filter((clue) => isCorner(clue, width, height)).length,
    fingerprint,
  };
}

export function qualityRejectReasons(metrics: MaomaoMetrics, config: QualityConfig): string[] {
  const reasons: string[] = [];
  if (
    metrics.singleCellRegionCount > config.maxSingletons ||
    (metrics.regionCount > 0 && metrics.singleCellRegionCount / metrics.regionCount > 0.5)
  ) {
    reasons.push("TOO_MANY_SINGLE_CELL_REGIONS");
  }
  if (metrics.maxAspectRatio > config.maxAspectRatio) reasons.push("EXTREME_ASPECT_RATIO");
  if (metrics.regionCount && metrics.longThinRegionCount / metrics.regionCount > config.maxLongThinFraction) {
    reasons.push("TOO_MANY_LONG_THIN_REGIONS");
  }
  if (metrics.regionCount && metrics.horizontalRegionCount === metrics.regionCount) reasons.push("ALL_REGIONS_HORIZONTAL");
  if (metrics.regionCount && metrics.verticalRegionCount === metrics.regionCount) reasons.push("ALL_REGIONS_VERTICAL");
  if (metrics.regionCount && metrics.clueEdgeCount / metrics.regionCount > config.maxEdgeClueFraction) {
    reasons.push("ALL_CLUES_ON_EDGE");
  }
  return reasons;
}
