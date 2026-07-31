import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateRectangles } from "../validator.ts";
import { FORMAL_SIZE_QUOTAS, tierForScore } from "./formal-config.ts";
import { compareLevelSimilarity } from "./similarity.ts";
import type { FormalRuntimeLevel, ReserveRuntimeLevel } from "./types.ts";

interface MappingRecord {
  readonly levelId?: string;
  readonly reserveId?: string;
  readonly candidateId: string;
  readonly fingerprint: string;
  readonly width: number;
  readonly height: number;
  readonly difficultyRawScore: number;
  readonly preferredReserveId?: string;
  readonly matchedFormalLevelId?: string;
}

interface MappingFile {
  readonly levels: readonly MappingRecord[];
  readonly majorDifficultyReversals?: number;
}

export interface FormalVerification {
  readonly valid: boolean;
  readonly formalLevels: number;
  readonly reserveLevels: number;
  readonly manifestReferences: number;
  readonly exactDuplicates: number;
  readonly nearDuplicates: number;
  readonly formalReserveOverlap: number;
  readonly majorDifficultyReversals: number;
  readonly errors: readonly string[];
}

const forbiddenAuditFields = [
  "candidateId", "seed", "fingerprint", "generatorCommit", "qualityScore", "difficultyRawScore",
  "searchNodes", "branchCount", "backtrackCount", "selectionReason", "generation",
] as const;

function sizeKey(level: { width: number; height: number }): string {
  return `${level.width}x${level.height}`;
}

function validateRuntimeLevel(level: FormalRuntimeLevel, expectedIndex: number, errors: string[]): void {
  const expectedId = `main_${String(expectedIndex).padStart(3, "0")}`;
  const expectedChapter = Math.floor((expectedIndex - 1) / 10) + 1;
  const expectedOrder = ((expectedIndex - 1) % 10) + 1;
  if (level.levelId !== expectedId) errors.push(`LEVEL_ID:${level.levelId}:${expectedId}`);
  if (level.chapter !== expectedChapter || level.order !== expectedOrder) errors.push(`CHAPTER_ORDER:${level.levelId}`);
  if (level.difficulty.score !== expectedIndex || level.difficulty.tier !== tierForScore(expectedIndex)) errors.push(`DIFFICULTY:${level.levelId}`);
  if (forbiddenAuditFields.some((field) => Object.hasOwn(level, field))) errors.push(`AUDIT_FIELD:${level.levelId}`);
  const validation = validateRectangles(level.width, level.height, level.clues, level.solutionRegions, true);
  if (!validation.structuralValid) errors.push(`STRUCTURE:${level.levelId}:${validation.errors.join(",")}`);
}

export async function verifyFormalOutput(outputRoot: string, similarityThreshold = 0.92): Promise<FormalVerification> {
  const errors: string[] = [];
  const manifest = JSON.parse(await readFile(path.join(outputRoot, "formal-manifest.json"), "utf8")) as { levels?: unknown };
  const formalMapping = JSON.parse(await readFile(path.join(outputRoot, "formal-mapping.json"), "utf8")) as MappingFile;
  const reserveMapping = JSON.parse(await readFile(path.join(outputRoot, "reserve-mapping.json"), "utf8")) as MappingFile;
  const formalFiles = (await readdir(path.join(outputRoot, "formal"))).filter((name) => /^main_\d{3}\.json$/.test(name)).sort();
  const reserveFiles = (await readdir(path.join(outputRoot, "reserve"))).filter((name) => /^reserve_.*\.json$/.test(name)).sort();
  if (formalFiles.length !== 100) errors.push(`FORMAL_COUNT:${formalFiles.length}`);
  if (reserveFiles.length !== 100) errors.push(`RESERVE_COUNT:${reserveFiles.length}`);
  const levels: FormalRuntimeLevel[] = [];
  for (let index = 1; index <= formalFiles.length; index++) {
    const level = JSON.parse(await readFile(path.join(outputRoot, "formal", formalFiles[index - 1]!), "utf8")) as FormalRuntimeLevel;
    levels.push(level);
    validateRuntimeLevel(level, index, errors);
  }
  const reserves: ReserveRuntimeLevel[] = [];
  for (const file of reserveFiles) {
    const level = JSON.parse(await readFile(path.join(outputRoot, "reserve", file), "utf8")) as ReserveRuntimeLevel;
    reserves.push(level);
    if (forbiddenAuditFields.some((field) => Object.hasOwn(level, field))) errors.push(`RESERVE_AUDIT_FIELD:${level.levelId}`);
    const validation = validateRectangles(level.width, level.height, level.clues, level.solutionRegions, true);
    if (!validation.structuralValid) errors.push(`RESERVE_STRUCTURE:${level.levelId}`);
  }
  const references = Array.isArray(manifest.levels) ? manifest.levels.filter((entry): entry is string => typeof entry === "string") : [];
  const expectedReferences = levels.map((level) => `main/${level.levelId}.json`);
  if (JSON.stringify(references) !== JSON.stringify(expectedReferences)) errors.push("MANIFEST_ORDER");

  for (const quota of FORMAL_SIZE_QUOTAS) {
    const key = `${quota.width}x${quota.height}`;
    if (levels.filter((level) => sizeKey(level) === key).length !== quota.formal) errors.push(`FORMAL_QUOTA:${key}`);
    if (reserves.filter((level) => sizeKey(level) === key).length !== quota.reserve) errors.push(`RESERVE_QUOTA:${key}`);
  }

  const formalCandidates = new Set(formalMapping.levels.map((entry) => entry.candidateId));
  const reserveCandidates = new Set(reserveMapping.levels.map((entry) => entry.candidateId));
  const formalFingerprints = new Set(formalMapping.levels.map((entry) => entry.fingerprint));
  const reserveFingerprints = new Set(reserveMapping.levels.map((entry) => entry.fingerprint));
  const formalReserveOverlap = [...formalCandidates].filter((candidate) => reserveCandidates.has(candidate)).length;
  const exactDuplicates = (formalMapping.levels.length - formalFingerprints.size)
    + (reserveMapping.levels.length - reserveFingerprints.size)
    + [...formalFingerprints].filter((fingerprint) => reserveFingerprints.has(fingerprint)).length;
  if (formalReserveOverlap > 0) errors.push(`FORMAL_RESERVE_OVERLAP:${formalReserveOverlap}`);
  if (exactDuplicates > 0) errors.push(`EXACT_DUPLICATES:${exactDuplicates}`);

  const combined = [...levels, ...reserves];
  let nearDuplicates = 0;
  for (let first = 0; first < combined.length; first++) {
    for (let second = first + 1; second < combined.length; second++) {
      if (sizeKey(combined[first]!) !== sizeKey(combined[second]!)) continue;
      if (compareLevelSimilarity(combined[first]! as never, combined[second]! as never).overallSimilarity >= similarityThreshold) nearDuplicates++;
    }
  }
  if (nearDuplicates > 0) errors.push(`NEAR_DUPLICATES:${nearDuplicates}`);
  const majorDifficultyReversals = formalMapping.majorDifficultyReversals ?? -1;
  if (majorDifficultyReversals !== 0) errors.push(`MAJOR_DIFFICULTY_REVERSALS:${majorDifficultyReversals}`);
  if (formalMapping.levels.length !== 100 || reserveMapping.levels.length !== 100) errors.push("MAPPING_COUNT");

  return {
    valid: errors.length === 0,
    formalLevels: levels.length,
    reserveLevels: reserves.length,
    manifestReferences: references.length,
    exactDuplicates,
    nearDuplicates,
    formalReserveOverlap,
    majorDifficultyReversals,
    errors,
  };
}

export async function writeFormalVerification(outputRoot: string, similarityThreshold = 0.92): Promise<FormalVerification> {
  const result = await verifyFormalOutput(outputRoot, similarityThreshold);
  await writeFile(path.join(outputRoot, "formal-validation.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.valid) throw new Error(`FORMAL VERIFICATION FAILED: ${result.errors.join(",")}`);
  return result;
}
