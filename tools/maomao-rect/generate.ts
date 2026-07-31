import { newDesc } from "../../src/native/games/rect/generator.ts";
import { randomNew } from "../../src/native/random/index.ts";
import { exportMaomaoLevel } from "./exporter.ts";
import { fingerprintRectangles } from "./fingerprint.ts";
import type {
  AcceptedCandidate,
  CandidateMetricsRecord,
  MaomaoValidation,
  QualityConfig,
  RectGenerationParams,
} from "./model.ts";
import { parseRectangles } from "./parser.ts";
import { calculateMetrics, qualityRejectReasons } from "./quality.ts";
import { validateRectangles } from "./validator.ts";

export interface GenerateOneOptions {
  width: number;
  height: number;
  seed: string;
  sourceCommit: string;
  index: number;
  qualityConfig: QualityConfig;
}

export function generateOne(options: GenerateOneOptions): CandidateMetricsRecord {
  const params: RectGenerationParams = { width: options.width, height: options.height, expandfactor: 0, unique: true };
  const nativeParams = { w: options.width, h: options.height, expandfactor: 0, unique: true };
  let native: { desc: string; aux: string };
  try {
    native = newDesc(nativeParams, randomNew(options.seed));
  } catch (error) {
    return {
      status: "generation_failed",
      seed: options.seed,
      sourceCommit: options.sourceCommit,
      reasonCodes: [`GENERATOR_ERROR:${error instanceof Error ? error.message : String(error)}`],
    };
  }

  let parsed;
  try {
    parsed = parseRectangles(options.width, options.height, native.desc, native.aux);
  } catch (error) {
    return {
      status: "validation_failed",
      seed: options.seed,
      sourceCommit: options.sourceCommit,
      reasonCodes: [`PARSER_ERROR:${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const fingerprint = fingerprintRectangles(parsed.width, parsed.height, parsed.clues, parsed.solutionRegions);
  const validation: MaomaoValidation = validateRectangles(
    parsed.width,
    parsed.height,
    parsed.clues,
    parsed.solutionRegions,
    params.unique,
  );
  const metrics = calculateMetrics(
    parsed.width,
    parsed.height,
    parsed.clues,
    parsed.solutionRegions,
    fingerprint,
    options.qualityConfig,
  );
  if (!validation.structuralValid) {
    return { status: "validation_failed", seed: options.seed, sourceCommit: options.sourceCommit, metrics, validation, reasonCodes: validation.errors };
  }
  const reasonCodes = qualityRejectReasons(metrics, options.qualityConfig);
  if (reasonCodes.length > 0) {
    return { status: "rejected", seed: options.seed, sourceCommit: options.sourceCommit, metrics, validation, reasonCodes };
  }
  const level = exportMaomaoLevel(parsed, options.seed, options.sourceCommit, params, fingerprint, options.index);
  return { status: "accepted", seed: options.seed, sourceCommit: options.sourceCommit, metrics, validation, level } as AcceptedCandidate;
}

export interface BatchOptions {
  width: number;
  height: number;
  count: number;
  seedPrefix: string;
  startIndex: number;
  maxAttempts: number;
  sourceCommit: string;
  qualityConfig: QualityConfig;
}

export interface BatchResult {
  width: number;
  height: number;
  targetCount: number;
  accepted: AcceptedCandidate[];
  rejected: CandidateMetricsRecord[];
  attempts: number;
  targetReached: boolean;
  sourceCommit: string;
  qualityConfig: QualityConfig;
}

function seedFor(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(6, "0")}`;
}

export function generateBatch(options: BatchOptions): BatchResult {
  const accepted: AcceptedCandidate[] = [];
  const rejected: CandidateMetricsRecord[] = [];
  const fingerprints = new Set<string>();
  let attempts = 0;
  while (accepted.length < options.count && attempts < options.maxAttempts) {
    const index = options.startIndex + attempts;
    const seed = seedFor(options.seedPrefix, index);
    const candidate = generateOne({ ...options, seed, index });
    attempts++;
    if (candidate.status === "accepted") {
      const acceptedCandidate = candidate as AcceptedCandidate;
      const fingerprint = acceptedCandidate.metrics.fingerprint;
      if (fingerprints.has(fingerprint)) {
        rejected.push({ ...acceptedCandidate, status: "duplicate", reasonCodes: ["DUPLICATE_FINGERPRINT"] });
      } else {
        fingerprints.add(fingerprint);
        accepted.push(acceptedCandidate);
      }
    } else {
      rejected.push(candidate);
    }
  }
  return {
    width: options.width,
    height: options.height,
    targetCount: options.count,
    accepted,
    rejected,
    attempts,
    targetReached: accepted.length === options.count,
    sourceCommit: options.sourceCommit,
    qualityConfig: options.qualityConfig,
  };
}
