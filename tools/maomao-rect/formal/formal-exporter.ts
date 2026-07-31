import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DIFFICULTY_MODEL_VERSION } from "../difficulty/difficulty-config.ts";
import { FORMAL_SELECTION_VERSION, SIMILARITY_FILTER_VERSION } from "./formal-config.ts";
import type {
  FormalRuntimeLevel,
  FormalSelectionResult,
  OrderedFormalLevel,
  OrderedReserveLevel,
  ReserveRuntimeLevel,
} from "./types.ts";

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function formalRuntimeLevel(entry: OrderedFormalLevel): FormalRuntimeLevel {
  const source = entry.candidate.level;
  return {
    schemaVersion: 1,
    levelId: entry.levelId,
    chapter: entry.chapter,
    order: entry.order,
    width: source.width,
    height: source.height,
    difficulty: { tier: entry.difficultyTier, score: entry.difficultyScore },
    clues: source.clues.map((clue) => ({ ...clue })),
    solutionRegions: source.solutionRegions.map((region) => ({ ...region })),
    tutorial: { enabled: false, stepId: "none" },
    contentVersion: 1,
  };
}

export function reserveRuntimeLevel(entry: OrderedReserveLevel): ReserveRuntimeLevel {
  const source = entry.candidate.level;
  return {
    schemaVersion: 1,
    levelId: entry.reserveId,
    chapter: 0,
    order: 0,
    width: source.width,
    height: source.height,
    difficulty: { tier: "unrated", score: 0 },
    clues: source.clues.map((clue) => ({ ...clue })),
    solutionRegions: source.solutionRegions.map((region) => ({ ...region })),
    tutorial: { enabled: false, stepId: "none" },
    contentVersion: 1,
  };
}

function auditFields(entry: OrderedFormalLevel | OrderedReserveLevel): Record<string, unknown> {
  return {
    candidateId: entry.candidate.level.levelId,
    seed: entry.candidate.seed,
    fingerprint: entry.candidate.metrics.fingerprint,
    generatorCommit: entry.candidate.level.generation.sourceCommit,
    width: entry.candidate.level.width,
    height: entry.candidate.level.height,
    qualityScore: entry.qualityScore,
    difficultyRawScore: entry.difficulty.difficultyRawScore,
    logicalSolved: entry.difficulty.logicalSolved,
    logicalRounds: entry.difficulty.logicalRounds,
    logicalActions: entry.difficulty.logicalActions,
    candidateEliminations: entry.difficulty.candidateEliminations,
    logicalStall: entry.difficulty.logicalStall,
    searchNodes: entry.difficulty.searchNodes,
    branchCount: entry.difficulty.branchCount,
    backtrackCount: entry.difficulty.backtrackCount,
    maximumSearchDepth: entry.difficulty.maximumSearchDepth,
    solutionCountCappedAt2: entry.difficulty.solutionCountCappedAt2,
    quantile: entry.quantile,
    qualityPercentile: entry.qualityPercentile,
    qualityFractionUsed: entry.qualityFractionUsed,
  };
}

export function formalMapping(result: FormalSelectionResult): Record<string, unknown> {
  return {
    schemaVersion: 1,
    selectionVersion: FORMAL_SELECTION_VERSION,
    sourcePoolVersion: result.sourcePoolVersion,
    generatorCommit: result.generatorCommit,
    difficultyModel: DIFFICULTY_MODEL_VERSION,
    similarityFilter: SIMILARITY_FILTER_VERSION,
    similarityThreshold: result.similarityThreshold,
    majorDifficultyReversals: result.majorDifficultyReversals,
    fullPoolDifficultyStandardDeviation: result.fullPoolDifficultyStandardDeviation,
    levels: result.formal.map((entry) => ({
      levelId: entry.levelId,
      chapter: entry.chapter,
      order: entry.order,
      difficultyTier: entry.difficultyTier,
      difficultyScore: entry.difficultyScore,
      preferredReserveId: entry.preferredReserveId,
      ...auditFields(entry),
    })),
  };
}

export function reserveMapping(result: FormalSelectionResult): Record<string, unknown> {
  return {
    schemaVersion: 1,
    selectionVersion: FORMAL_SELECTION_VERSION,
    sourcePoolVersion: result.sourcePoolVersion,
    generatorCommit: result.generatorCommit,
    levels: result.reserve.map((entry) => ({
      reserveId: entry.reserveId,
      matchedFormalLevelId: entry.matchedFormalLevelId,
      replacementScoreRange: entry.replacementScoreRange,
      ...auditFields(entry),
    })),
  };
}

function renderReport(result: FormalSelectionResult): string {
  const logicalSolved = result.analyzed.filter((candidate) => candidate.difficulty.logicalSolved).length;
  const logicalStalled = result.analyzed.filter((candidate) => candidate.difficulty.logicalStall).length;
  const sizes = ["4x6", "5x7", "5x8", "6x9", "7x10", "8x12"];
  const rows = sizes.map((size) => `| ${size} | ${result.formal.filter((entry) => entry.sizeKey === size).length} | ${result.reserve.filter((entry) => entry.sizeKey === size).length} | ${result.qualityRelaxations[size] ?? 0} |`).join("\n");
  return `# maomao Formal Selection Report V0.3

- Candidate pool: \`${result.sourcePoolVersion}\`
- Generator commit: \`${result.generatorCommit}\`
- Candidates analyzed: ${result.analyzed.length}
- Logical solved: ${logicalSolved}
- Logical stalled: ${logicalStalled}
- Formal selected: ${result.formal.length}
- Reserve selected: ${result.reserve.length}
- Similarity threshold: ${result.similarityThreshold}
- Near-duplicate decisions: ${result.similarityRejections.length}
- Quantile fallbacks: ${result.quantileFallbacks}
- Major difficulty reversals: ${result.majorDifficultyReversals}
- Difficulty classification: PROVISIONAL V0.1
- Human-calibrated difficulty: NO

| Size | Formal | Reserve | Maximum quality fraction used |
| --- | ---: | ---: | ---: |
${rows}
`;
}

export async function writeFormalOutput(
  result: FormalSelectionResult,
  outputRoot: string,
  overwrite = false,
): Promise<void> {
  const exists = await access(outputRoot).then(() => true).catch(() => false);
  if (exists && !overwrite) throw new Error("FORMAL SELECTION BLOCKED: OUTPUT ALREADY EXISTS");
  if (exists) await rm(outputRoot, { recursive: true, force: true });
  const formalRoot = path.join(outputRoot, "formal");
  const reserveRoot = path.join(outputRoot, "reserve");
  const analysisRoot = path.join(outputRoot, "analysis");
  await Promise.all([mkdir(formalRoot, { recursive: true }), mkdir(reserveRoot, { recursive: true }), mkdir(analysisRoot, { recursive: true })]);

  await Promise.all(result.formal.map((entry) => writeJson(path.join(formalRoot, `${entry.levelId}.json`), formalRuntimeLevel(entry))));
  await Promise.all(result.reserve.map((entry) => writeJson(path.join(reserveRoot, `${entry.reserveId}.json`), reserveRuntimeLevel(entry))));
  await writeJson(path.join(outputRoot, "formal-manifest.json"), {
    schemaVersion: 1,
    levels: result.formal.map((entry) => `main/${entry.levelId}.json`),
  });
  await writeJson(path.join(outputRoot, "formal-mapping.json"), formalMapping(result));
  await writeJson(path.join(outputRoot, "reserve-mapping.json"), reserveMapping(result));
  await writeFile(
    path.join(analysisRoot, "difficulty-analysis.jsonl"),
    `${result.analyzed.map((entry) => JSON.stringify({
      candidateId: entry.candidate.level.levelId,
      seed: entry.candidate.seed,
      fingerprint: entry.candidate.metrics.fingerprint,
      qualityScore: entry.qualityScore,
      quantile: entry.quantile,
      qualityPercentile: entry.qualityPercentile,
      ...entry.difficulty,
    })).join("\n")}\n`,
    "utf8",
  );
  await writeFile(
    path.join(analysisRoot, "similarity-rejections.jsonl"),
    result.similarityRejections.length ? `${result.similarityRejections.map((entry) => JSON.stringify(entry)).join("\n")}\n` : "",
    "utf8",
  );
  await writeFile(
    path.join(analysisRoot, "selection-decisions.jsonl"),
    `${[
      ...result.formal.map((entry) => ({ stage: "formal", outputId: entry.levelId, candidateId: entry.candidate.level.levelId, quantile: entry.quantile, quantileRequested: entry.quantileRequested, quantileFallback: entry.quantileFallback, qualityFractionUsed: entry.qualityFractionUsed })),
      ...result.reserve.map((entry) => ({ stage: "reserve", outputId: entry.reserveId, candidateId: entry.candidate.level.levelId, matchedFormalLevelId: entry.matchedFormalLevelId, qualityFractionUsed: entry.qualityFractionUsed })),
    ].map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    "utf8",
  );
  await writeFile(path.join(outputRoot, "FORMAL_SELECTION_REPORT.md"), renderReport(result), "utf8");
}

export async function readFormalRuntimeLevel(filePath: string): Promise<FormalRuntimeLevel> {
  return JSON.parse(await readFile(filePath, "utf8")) as FormalRuntimeLevel;
}
