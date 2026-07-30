import type { BatchResult } from "./generate.ts";
import type { CandidateMetricsRecord, MaomaoMetrics } from "./model.ts";

export interface GenerationReport {
  reportVersion: 1;
  generatedAt: string;
  sourceRepository: "puzzles-ts";
  sourceBranch: string;
  sourceCommit: string;
  width: number;
  height: number;
  targetCount: number;
  acceptedCount: number;
  rejectedCount: number;
  attempts: number;
  targetReached: boolean;
  qualityConfig: BatchResult["qualityConfig"];
  reasonCounts: Record<string, number>;
  metricSummary: Record<string, number>;
  determinism: { seed: string; fingerprint: string; repeatFingerprint: string; matched: boolean } | null;
}

function reasonCounts(records: CandidateMetricsRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    for (const reason of record.reasonCodes ?? []) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function metricSummary(metrics: MaomaoMetrics[]): Record<string, number> {
  if (metrics.length === 0) return {};
  const average = (key: keyof MaomaoMetrics): number => {
    const values = metrics.map((metric) => Number(metric[key])).filter((value) => Number.isFinite(value));
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
  };
  return {
    averageRegionCount: average("regionCount"),
    averageSingletonCount: average("singleCellRegionCount"),
    averageMaxRegionArea: average("maxRegionArea"),
    averageMaxAspectRatio: average("maxAspectRatio"),
    averageLongThinRegionCount: average("longThinRegionCount"),
    averageEdgeClueCount: average("clueEdgeCount"),
  };
}

export function buildReport(batch: BatchResult, sourceBranch: string, determinism: GenerationReport["determinism"]): GenerationReport {
  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceRepository: "puzzles-ts",
    sourceBranch,
    sourceCommit: batch.sourceCommit,
    width: batch.width,
    height: batch.height,
    targetCount: batch.targetCount,
    acceptedCount: batch.accepted.length,
    rejectedCount: batch.rejected.length,
    attempts: batch.attempts,
    targetReached: batch.targetReached,
    qualityConfig: batch.qualityConfig,
    reasonCounts: reasonCounts(batch.rejected),
    metricSummary: metricSummary(batch.accepted.map((candidate) => candidate.metrics)),
    determinism,
  };
}

export function renderReportMarkdown(report: GenerationReport): string {
  const reasons = Object.entries(report.reasonCounts).sort(([a], [b]) => a.localeCompare(b));
  const reasonLines = reasons.length ? reasons.map(([reason, count]) => `| ${reason} | ${count} |`).join("\n") : "| none | 0 |";
  const metricLines = Object.entries(report.metricSummary)
    .map(([metric, value]) => `| ${metric} | ${value} |`)
    .join("\n");
  const determinism = report.determinism
    ? `${report.determinism.matched ? "PASS" : "FAIL"}: ${report.determinism.seed}`
    : "not sampled";
  return `# maomao Rectangles Candidate Generation Report

- Source: ${report.sourceRepository}@${report.sourceCommit}
- Branch: ${report.sourceBranch}
- Size: ${report.width}x${report.height}
- Target accepted: ${report.targetCount}
- Accepted: ${report.acceptedCount}
- Rejected or failed: ${report.rejectedCount}
- Attempts: ${report.attempts}
- Target reached: ${report.targetReached ? "YES" : "NO"}
- Determinism sample: ${determinism}

## Provisional Quality Configuration

\`${JSON.stringify(report.qualityConfig)}\`

## Rejection Reasons

| Reason | Count |
| --- | ---: |
${reasonLines}

## Accepted Metric Averages

| Metric | Average |
| --- | ---: |
${metricLines || "| none | 0 |"}

This is an offline candidate report. Difficulty remains \`unrated\`; maomao
runtime, renderer, device, and formal difficulty acceptance are separate gates.
`;
}

