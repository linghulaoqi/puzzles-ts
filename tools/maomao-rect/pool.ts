import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateOne } from "./generate.ts";
import type { AcceptedCandidate, CandidateMetricsRecord, MaomaoExportLevel } from "./model.ts";
import {
  boardSizeKey,
  QUALITY_CONFIG_VERSION,
  RECTANGULAR_POOL_SPECS,
  resolveQualityConfig,
} from "./quality-config.ts";
import { assertMaomaoLevel } from "./schema.ts";
import { validateRectangles } from "./validator.ts";

interface SizeAudit {
  readonly width: number;
  readonly height: number;
  readonly target: number;
  readonly attempts: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly duplicates: number;
  readonly failed: number;
  readonly structuralPassed: number;
  readonly determinismSamples: number;
  readonly determinismMatches: number;
  readonly fingerprintDigest: string;
  readonly seedStart: string;
  readonly seedEnd: string;
  readonly reasonCounts: Readonly<Record<string, number>>;
  readonly outputSha256: Readonly<Record<string, string>>;
}

export interface RectangularPoolAudit {
  readonly sourceCommit: string;
  readonly totalAccepted: number;
  readonly totalAttempts: number;
  readonly totalRejected: number;
  readonly totalDuplicates: number;
  readonly totalFailed: number;
  readonly structuralPassed: number;
  readonly exactDuplicates: number;
  readonly widthHeightReversals: number;
  readonly determinismSamples: number;
  readonly determinismMatches: number;
  readonly sizes: readonly SizeAudit[];
}

interface NativeSizeReport {
  readonly attempts: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly reasonCounts: Readonly<Record<string, number>>;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const text = await readFile(filePath, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function fail(message: string): never {
  throw new Error(`RECTANGULAR POOL AUDIT FAILED: ${message}`);
}

function candidateIndex(levelId: string): number {
  const match = /_(\d{6})$/.exec(levelId);
  if (!match?.[1]) fail(`candidate ID has no six-digit suffix: ${levelId}`);
  return Number(match[1]);
}

function sampleTen(records: readonly AcceptedCandidate[]): AcceptedCandidate[] {
  if (records.length < 10) fail("fewer than 10 accepted candidates available for determinism sampling");
  const last = records.length - 1;
  return Array.from({ length: 10 }, (_, index) => records[Math.round((index * last) / 9)] as AcceptedCandidate);
}

export async function auditRectangularPool(root: string, sourceCommit: string): Promise<RectangularPoolAudit> {
  const globalIds = new Set<string>();
  const globalSeeds = new Set<string>();
  const globalFingerprints = new Set<string>();
  const audits: SizeAudit[] = [];
  let widthHeightReversals = 0;

  for (const spec of RECTANGULAR_POOL_SPECS) {
    const key = boardSizeKey(spec.width, spec.height);
    const sizeRoot = path.join(root, key);
    const candidatesPath = path.join(sizeRoot, "candidates.json");
    const recordsPath = path.join(sizeRoot, "candidates.jsonl");
    const rejectedPath = path.join(sizeRoot, "rejected.jsonl");
    const reportPath = path.join(sizeRoot, "report.json");
    const levels = await readJson<MaomaoExportLevel[]>(candidatesPath);
    const records = await readJsonLines<AcceptedCandidate>(recordsPath);
    const rejectedRecords = await readJsonLines<CandidateMetricsRecord>(rejectedPath);
    const report = await readJson<NativeSizeReport>(reportPath);
    if (levels.length !== spec.acceptedTarget || records.length !== spec.acceptedTarget) {
      fail(`${key} accepted count is ${levels.length}/${records.length}, expected ${spec.acceptedTarget}`);
    }
    if (report.acceptedCount !== spec.acceptedTarget || report.attempts !== records.length + rejectedRecords.length) {
      fail(`${key} report counts do not match output records`);
    }

    const localFingerprints = new Set<string>();
    let structuralPassed = 0;
    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      const level = levels[index];
      if (!record || !level) fail(`${key} accepted JSON and JSONL order mismatch`);
      assertMaomaoLevel(level);
      if (record.status !== "accepted" || record.level.levelId !== level.levelId) fail(`${key} accepted record mismatch`);
      if (level.width !== spec.width || level.height !== spec.height) {
        if (level.width === spec.height && level.height === spec.width) widthHeightReversals++;
        fail(`${level.levelId} has ${level.width}x${level.height}, expected ${key}`);
      }
      if (
        level.generation.sourceCommit !== sourceCommit ||
        level.generation.params.width !== spec.width ||
        level.generation.params.height !== spec.height ||
        level.generation.params.unique !== true
      ) {
        fail(`${level.levelId} generation metadata mismatch`);
      }
      if (
        record.validation.uniqueRequested !== true ||
        record.validation.uniqueVerified !== true ||
        !record.metrics.fingerprint ||
        record.metrics.fingerprint !== level.generation.fingerprint
      ) {
        fail(`${level.levelId} uniqueness or fingerprint metadata invalid`);
      }
      const validation = validateRectangles(level.width, level.height, level.clues, level.solutionRegions, true);
      if (!validation.structuralValid) fail(`${level.levelId} structural errors: ${validation.errors.join(",")}`);
      structuralPassed++;
      if (localFingerprints.has(level.generation.fingerprint)) fail(`${key} duplicate fingerprint ${level.generation.fingerprint}`);
      localFingerprints.add(level.generation.fingerprint);
      if (globalIds.has(level.levelId)) fail(`duplicate candidate ID ${level.levelId}`);
      if (globalSeeds.has(level.generation.seed)) fail(`duplicate seed ${level.generation.seed}`);
      if (globalFingerprints.has(level.generation.fingerprint)) fail(`cross-size duplicate fingerprint ${level.generation.fingerprint}`);
      globalIds.add(level.levelId);
      globalSeeds.add(level.generation.seed);
      globalFingerprints.add(level.generation.fingerprint);
    }

    let determinismMatches = 0;
    const qualityConfig = resolveQualityConfig(spec.width, spec.height);
    if (!qualityConfig.dedicated) fail(`${key} did not resolve a dedicated quality configuration`);
    const samples = sampleTen(records);
    for (const record of samples) {
      const repeated = generateOne({
        width: spec.width,
        height: spec.height,
        seed: record.seed,
        sourceCommit,
        index: candidateIndex(record.level.levelId),
        qualityConfig: qualityConfig.config,
      });
      if (
        repeated.status !== "accepted" ||
        repeated.metrics?.fingerprint !== record.metrics.fingerprint ||
        JSON.stringify(repeated.level?.clues) !== JSON.stringify(record.level.clues) ||
        JSON.stringify(repeated.level?.solutionRegions) !== JSON.stringify(record.level.solutionRegions)
      ) {
        fail(`${record.seed} candidate determinism mismatch`);
      }
      determinismMatches++;
    }

    const duplicates = rejectedRecords.filter((record) => record.status === "duplicate").length;
    const failed = rejectedRecords.filter(
      (record) => record.status === "generation_failed" || record.status === "validation_failed",
    ).length;
    const rejected = rejectedRecords.filter((record) => record.status === "rejected").length;
    const sortedFingerprints = [...localFingerprints].sort();
    audits.push({
      width: spec.width,
      height: spec.height,
      target: spec.acceptedTarget,
      attempts: report.attempts,
      accepted: records.length,
      rejected,
      duplicates,
      failed,
      structuralPassed,
      determinismSamples: samples.length,
      determinismMatches,
      fingerprintDigest: sha256Text(`${sortedFingerprints.join("\n")}\n`),
      seedStart: `maomao-${key}-000001`,
      seedEnd: `maomao-${key}-${String(report.attempts).padStart(6, "0")}`,
      reasonCounts: report.reasonCounts,
      outputSha256: {
        "candidates.json": await sha256File(candidatesPath),
        "candidates.jsonl": await sha256File(recordsPath),
        "rejected.jsonl": await sha256File(rejectedPath),
        "report.json": await sha256File(reportPath),
      },
    });
  }

  const totalAccepted = audits.reduce((sum, audit) => sum + audit.accepted, 0);
  const totalAttempts = audits.reduce((sum, audit) => sum + audit.attempts, 0);
  const totalRejected = audits.reduce((sum, audit) => sum + audit.rejected, 0);
  const totalDuplicates = audits.reduce((sum, audit) => sum + audit.duplicates, 0);
  const totalFailed = audits.reduce((sum, audit) => sum + audit.failed, 0);
  const structuralPassed = audits.reduce((sum, audit) => sum + audit.structuralPassed, 0);
  const determinismSamples = audits.reduce((sum, audit) => sum + audit.determinismSamples, 0);
  const determinismMatches = audits.reduce((sum, audit) => sum + audit.determinismMatches, 0);
  if (totalAccepted !== 1_800 || structuralPassed !== 1_800) fail("total accepted or structural pass count is not 1800");
  if (widthHeightReversals !== 0) fail(`${widthHeightReversals} width/height reversals found`);
  return {
    sourceCommit,
    totalAccepted,
    totalAttempts,
    totalRejected,
    totalDuplicates,
    totalFailed,
    structuralPassed,
    exactDuplicates: 0,
    widthHeightReversals,
    determinismSamples,
    determinismMatches,
    sizes: audits,
  };
}

function renderPoolReport(audit: RectangularPoolAudit): string {
  const rows = audit.sizes
    .map(
      (size) =>
        `| ${size.width}x${size.height} | ${size.target} | ${size.attempts} | ${size.accepted} | ${size.rejected} | ${size.duplicates} | ${size.failed} |`,
    )
    .join("\n");
  return `# maomao Rectangular Candidate Generation Report V0.2.1

- Source commit: \`${audit.sourceCommit}\`
- Quality configuration: \`${QUALITY_CONFIG_VERSION}\`
- Accepted: ${audit.totalAccepted}
- Structural validation: ${audit.structuralPassed}/${audit.totalAccepted} PASS
- Candidate determinism: ${audit.determinismMatches}/${audit.determinismSamples} PASS
- Exact duplicates: ${audit.exactDuplicates}
- Width/height reversals: ${audit.widthHeightReversals}

| Size | Target | Attempts | Accepted | Rejected | Duplicates | Failed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}
| **Total** | **${audit.totalAccepted}** | **${audit.totalAttempts}** | **${audit.totalAccepted}** | **${audit.totalRejected}** | **${audit.totalDuplicates}** | **${audit.totalFailed}** |

The files in this directory are offline candidates. They are not numbered
production levels and are not imported into the maomao Cocos assets or formal
level manifest.
`;
}

export async function writeRectangularPoolArtifacts(
  root: string,
  lockPath: string,
  sourceCommit: string,
): Promise<RectangularPoolAudit> {
  const audit = await auditRectangularPool(root, sourceCommit);
  const sizes = Object.fromEntries(audit.sizes.map((size) => [boardSizeKey(size.width, size.height), size.accepted]));
  const manifest = {
    schemaVersion: 1,
    poolVersion: "maomao-rectangular-v0.2.1",
    sourceRepository: "linghulaoqi/puzzles-ts",
    sourceCommit,
    status: "candidate_pool",
    totalAccepted: audit.totalAccepted,
    sizes,
  };
  const lock = {
    schemaVersion: 1,
    poolVersion: "maomao-rectangular-v0.2.1",
    sourceCommit,
    qualityConfigVersion: QUALITY_CONFIG_VERSION,
    generation: {
      expandfactor: 0,
      unique: true,
      seedPattern: "maomao-<width>x<height>-<six-digit-index>",
      format: ["json", "jsonl"],
    },
    totalAccepted: audit.totalAccepted,
    structuralValidation: {
      records: audit.totalAccepted,
      passed: audit.structuralPassed,
      failed: audit.totalAccepted - audit.structuralPassed,
      exactDuplicates: audit.exactDuplicates,
      widthHeightReversals: audit.widthHeightReversals,
    },
    determinism: {
      samples: audit.determinismSamples,
      matches: audit.determinismMatches,
    },
    sizes: Object.fromEntries(
      audit.sizes.map((size) => [
        boardSizeKey(size.width, size.height),
        {
          count: size.accepted,
          attempts: size.attempts,
          seedRange: { start: size.seedStart, end: size.seedEnd },
          fingerprintSha256: size.fingerprintDigest,
          outputSha256: size.outputSha256,
        },
      ]),
    ),
  };
  await writeFile(path.join(root, "manifest.candidates.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(root, "RECTANGULAR_GENERATION_REPORT.md"), renderPoolReport(audit), "utf8");
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return audit;
}
