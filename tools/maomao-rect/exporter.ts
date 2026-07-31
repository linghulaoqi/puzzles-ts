import type { MaomaoExportLevel, ParsedRectangles, RectGenerationParams } from "./model.ts";
import { assertMaomaoLevel } from "./schema.ts";

export function exportMaomaoLevel(
  parsed: ParsedRectangles,
  seed: string,
  sourceCommit: string,
  params: RectGenerationParams,
  fingerprint: string,
  index: number,
): MaomaoExportLevel {
  const level: MaomaoExportLevel = {
    schemaVersion: 1,
    levelId: `candidate_${parsed.width}x${parsed.height}_${String(index).padStart(6, "0")}`,
    chapter: 0,
    order: 0,
    width: parsed.width,
    height: parsed.height,
    difficulty: { tier: "unrated", score: 0 },
    clues: parsed.clues,
    solutionRegions: parsed.solutionRegions,
    tutorial: { enabled: false, stepId: "none" },
    contentVersion: 1,
    generation: { seed, sourceCommit, params, fingerprint },
  };
  assertMaomaoLevel(level);
  return level;
}
