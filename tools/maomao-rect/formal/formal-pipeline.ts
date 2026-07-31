import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditRectangularPool } from "../pool.ts";
import { analyzeCandidatePool, rankCandidateAnalyses, selectFormalLevels } from "./formal-selector.ts";
import { writeFormalOutput } from "./formal-exporter.ts";
import { writeFormalVerification, type FormalVerification } from "./formal-verifier.ts";
import type { FormalSelectionResult } from "./types.ts";

interface PoolLock {
  readonly sourceCommit: string;
  readonly totalAccepted: number;
  readonly structuralValidation: { readonly passed: number };
  readonly determinism: { readonly samples: number; readonly matches: number };
  readonly sizes: Readonly<Record<string, {
    readonly count: number;
    readonly fingerprintSha256: string;
    readonly outputSha256: Readonly<Record<string, string>>;
  }>>;
}

export interface PoolLockVerification {
  readonly matched: boolean;
  readonly candidateCount: number;
  readonly structuralPassed: number;
  readonly reproductionSamples: number;
  readonly reproductionMatches: number;
  readonly poolManifestSha256: string;
  readonly mismatches: readonly string[];
}

export async function verifyCandidatePoolLock(poolRoot: string, lockPath: string): Promise<PoolLockVerification> {
  const lock = JSON.parse(await readFile(lockPath, "utf8")) as PoolLock;
  const audit = await auditRectangularPool(poolRoot, lock.sourceCommit);
  const mismatches: string[] = [];
  if (lock.totalAccepted !== audit.totalAccepted) mismatches.push("totalAccepted");
  if (lock.structuralValidation.passed !== audit.structuralPassed) mismatches.push("structuralPassed");
  if (lock.determinism.samples !== audit.determinismSamples || lock.determinism.matches !== audit.determinismMatches) {
    mismatches.push("determinism");
  }
  for (const size of audit.sizes) {
    const key = `${size.width}x${size.height}`;
    const expected = lock.sizes[key];
    if (!expected || expected.count !== size.accepted || expected.fingerprintSha256 !== size.fingerprintDigest
      || JSON.stringify(expected.outputSha256) !== JSON.stringify(size.outputSha256)) mismatches.push(key);
  }
  const manifest = await readFile(path.join(poolRoot, "manifest.candidates.json"));
  return {
    matched: mismatches.length === 0,
    candidateCount: audit.totalAccepted,
    structuralPassed: audit.structuralPassed,
    reproductionSamples: audit.determinismSamples,
    reproductionMatches: audit.determinismMatches,
    poolManifestSha256: createHash("sha256").update(manifest).digest("hex"),
    mismatches,
  };
}

export interface FormalPipelineOptions {
  readonly input: string;
  readonly poolLock: string;
  readonly output: string;
  readonly similarityThreshold: number;
  readonly overwrite: boolean;
}

export interface FormalPipelineResult {
  readonly poolLock: PoolLockVerification;
  readonly selection: FormalSelectionResult;
  readonly verification: FormalVerification;
}

export async function runFormalSelection(options: FormalPipelineOptions): Promise<FormalPipelineResult> {
  const poolRoot = path.resolve(options.input);
  const lockPath = path.resolve(options.poolLock);
  const outputRoot = path.resolve(options.output);
  const poolLock = await verifyCandidatePoolLock(poolRoot, lockPath);
  if (!poolLock.matched) throw new Error(`FORMAL SELECTION BLOCKED: CANDIDATE POOL LOCK MISMATCH ${poolLock.mismatches.join(",")}`);
  const analyses = await analyzeCandidatePool(poolRoot);
  const selection = selectFormalLevels(analyses, options.similarityThreshold);
  await writeFormalOutput(selection, outputRoot, options.overwrite);
  const verification = await writeFormalVerification(outputRoot, options.similarityThreshold);
  return { poolLock, selection, verification };
}

export async function writeDifficultyAnalysis(input: string, output: string, overwrite = false): Promise<number> {
  const outputPath = path.resolve(output);
  const exists = await access(outputPath).then(() => true).catch(() => false);
  if (exists && !overwrite) throw new Error("DIFFICULTY ANALYSIS BLOCKED: OUTPUT ALREADY EXISTS");
  if (exists) await rm(outputPath, { recursive: true, force: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  const ranked = rankCandidateAnalyses(await analyzeCandidatePool(path.resolve(input)));
  await writeFile(outputPath, `${ranked.map((entry) => JSON.stringify({
    candidateId: entry.candidate.level.levelId,
    seed: entry.candidate.seed,
    fingerprint: entry.candidate.metrics.fingerprint,
    qualityScore: entry.qualityScore,
    quantile: entry.quantile,
    qualityPercentile: entry.qualityPercentile,
    ...entry.difficulty,
  })).join("\n")}\n`, "utf8");
  return ranked.length;
}
