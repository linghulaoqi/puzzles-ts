import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeDifficulty } from "../difficulty/difficulty-metrics.ts";
import type { AcceptedCandidate } from "../model.ts";
import { assertMaomaoLevel } from "../schema.ts";
import { validateRectangles } from "../validator.ts";
import { boardSizeKey, RECTANGULAR_POOL_SPECS } from "../quality-config.ts";
import {
  CHAPTER_SIZE_SEQUENCE,
  FORMAL_SIZE_QUOTAS,
  QUALITY_RELAXATION_STEPS,
  progressionEffort,
  tierForScore,
} from "./formal-config.ts";
import { calculateQualityScore } from "./quality-score.ts";
import { compareLevelSimilarity } from "./similarity.ts";
import type {
  CandidateAnalysis,
  FormalSelectionResult,
  OrderedFormalLevel,
  OrderedReserveLevel,
  RankedCandidate,
  SelectedCandidate,
  SimilarityRejection,
} from "./types.ts";

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const text = await readFile(filePath, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function compareDifficulty(first: CandidateAnalysis, second: CandidateAnalysis): number {
  return first.difficulty.difficultyRawScore - second.difficulty.difficultyRawScore
    || second.qualityScore - first.qualityScore
    || first.candidate.level.levelId.localeCompare(second.candidate.level.levelId)
    || first.candidate.seed.localeCompare(second.candidate.seed);
}

function compareProgression(first: SelectedCandidate, second: SelectedCandidate): number {
  return first.quantile - second.quantile
    || progressionEffort(first.difficulty) - progressionEffort(second.difficulty)
    || compareDifficulty(first, second);
}

function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

export async function analyzeCandidatePool(root: string): Promise<CandidateAnalysis[]> {
  const analyses: CandidateAnalysis[] = [];
  const ids = new Set<string>();
  const seeds = new Set<string>();
  const fingerprints = new Set<string>();
  for (const spec of RECTANGULAR_POOL_SPECS) {
    const key = boardSizeKey(spec.width, spec.height);
    const records = await readJsonLines<AcceptedCandidate>(path.join(root, key, "candidates.jsonl"));
    if (records.length !== spec.acceptedTarget) throw new Error(`FORMAL SELECTION BLOCKED: ${key} count mismatch`);
    for (const candidate of records) {
      if (candidate.status !== "accepted") throw new Error(`FORMAL SELECTION BLOCKED: ${candidate.seed} is not accepted`);
      assertMaomaoLevel(candidate.level);
      if (candidate.level.width !== spec.width || candidate.level.height !== spec.height) {
        throw new Error(`FORMAL SELECTION BLOCKED: ${candidate.level.levelId} size mismatch`);
      }
      if (candidate.level.generation.sourceCommit !== "27554b9ec39b66941d62a28b0a7c957b05d44aa6") {
        throw new Error(`FORMAL SELECTION BLOCKED: ${candidate.level.levelId} source commit mismatch`);
      }
      const fingerprint = candidate.metrics.fingerprint;
      if (ids.has(candidate.level.levelId) || seeds.has(candidate.seed) || fingerprints.has(fingerprint)) {
        throw new Error(`FORMAL SELECTION BLOCKED: duplicate identity for ${candidate.level.levelId}`);
      }
      ids.add(candidate.level.levelId);
      seeds.add(candidate.seed);
      fingerprints.add(fingerprint);
      const validation = validateRectangles(
        candidate.level.width,
        candidate.level.height,
        candidate.level.clues,
        candidate.level.solutionRegions,
        true,
      );
      if (!validation.structuralValid || !candidate.validation.uniqueRequested || !candidate.validation.uniqueVerified) {
        throw new Error(`FORMAL SELECTION BLOCKED: invalid candidate ${candidate.level.levelId}`);
      }
      const difficulty = analyzeDifficulty(candidate.level);
      if (difficulty.solutionCountCappedAt2 !== 1 || difficulty.contradiction) {
        throw new Error(`FORMAL SELECTION BLOCKED: uniqueness analysis failed for ${candidate.level.levelId}`);
      }
      analyses.push({
        candidate,
        difficulty,
        qualityScore: calculateQualityScore(candidate.metrics),
        sizeKey: key,
      });
    }
  }
  if (analyses.length !== 1_800) throw new Error(`FORMAL SELECTION BLOCKED: analyzed ${analyses.length}, expected 1800`);
  return analyses;
}

export function rankCandidateAnalyses(analyses: readonly CandidateAnalysis[]): RankedCandidate[] {
  const result: RankedCandidate[] = [];
  for (const quota of FORMAL_SIZE_QUOTAS) {
    const key = boardSizeKey(quota.width, quota.height);
    const group = analyses.filter((analysis) => analysis.sizeKey === key).sort(compareDifficulty);
    const qualityOrder = [...group].sort((first, second) => second.qualityScore - first.qualityScore
      || first.candidate.level.levelId.localeCompare(second.candidate.level.levelId));
    const qualityRank = new Map(qualityOrder.map((candidate, index) => [candidate.candidate.level.levelId, index]));
    group.forEach((candidate, index) => {
      result.push({
        ...candidate,
        quantile: (Math.min(4, Math.floor((index * 5) / Math.max(1, group.length))) + 1) as 1 | 2 | 3 | 4 | 5,
        qualityPercentile: ((qualityRank.get(candidate.candidate.level.levelId) ?? group.length) + 1) / Math.max(1, group.length),
      });
    });
  }
  return result;
}

function nearDuplicate(
  candidate: RankedCandidate,
  selected: readonly SelectedCandidate[],
  threshold: number,
): { against: SelectedCandidate; similarity: ReturnType<typeof compareLevelSimilarity> } | null {
  for (const against of selected) {
    if (against.sizeKey !== candidate.sizeKey) continue;
    const similarity = compareLevelSimilarity(candidate.candidate.level, against.candidate.level);
    if (similarity.overallSimilarity >= threshold) return { against, similarity };
  }
  return null;
}

function addRejection(
  rejections: SimilarityRejection[],
  seen: Set<string>,
  stage: "formal" | "reserve",
  candidate: RankedCandidate,
  duplicate: NonNullable<ReturnType<typeof nearDuplicate>>,
): void {
  const key = `${stage}:${candidate.candidate.level.levelId}:${duplicate.against.candidate.level.levelId}`;
  if (seen.has(key)) return;
  seen.add(key);
  rejections.push({
    stage,
    candidateId: candidate.candidate.level.levelId,
    againstId: duplicate.against.candidate.level.levelId,
    ...duplicate.similarity,
  });
}

function chooseCandidate(
  pool: readonly RankedCandidate[],
  selected: readonly SelectedCandidate[],
  usedIds: ReadonlySet<string>,
  threshold: number,
  stage: "formal" | "reserve",
  rejections: SimilarityRejection[],
  rejectionKeys: Set<string>,
): { candidate: RankedCandidate; fraction: number } | null {
  for (const fraction of QUALITY_RELAXATION_STEPS) {
    for (const candidate of pool) {
      if (candidate.qualityPercentile > fraction || usedIds.has(candidate.candidate.level.levelId)) continue;
      const duplicate = nearDuplicate(candidate, selected, threshold);
      if (duplicate) {
        addRejection(rejections, rejectionKeys, stage, candidate, duplicate);
        continue;
      }
      return { candidate, fraction };
    }
  }
  return null;
}

export function selectFormalLevels(
  analyses: readonly CandidateAnalysis[],
  similarityThreshold: number,
): FormalSelectionResult {
  const ranked = rankCandidateAnalyses(analyses);
  const selectedFormal: SelectedCandidate[] = [];
  const selectedReserve: SelectedCandidate[] = [];
  const usedIds = new Set<string>();
  const rejections: SimilarityRejection[] = [];
  const rejectionKeys = new Set<string>();
  const qualityRelaxations: Record<string, number> = {};
  let quantileFallbacks = 0;

  for (const quota of FORMAL_SIZE_QUOTAS) {
    const key = boardSizeKey(quota.width, quota.height);
    const group = ranked.filter((candidate) => candidate.sizeKey === key).sort(compareDifficulty);
    for (let quantileIndex = 0; quantileIndex < 5; quantileIndex++) {
      const requested = (quantileIndex + 1) as 1 | 2 | 3 | 4 | 5;
      for (let count = 0; count < quota.quantiles[quantileIndex]!; count++) {
        const exact = group.filter((candidate) => candidate.quantile === requested);
        let picked = chooseCandidate(exact, selectedFormal, usedIds, similarityThreshold, "formal", rejections, rejectionKeys);
        let fallback = false;
        if (!picked) {
          const adjacent = group.filter((candidate) => candidate.quantile !== requested).sort(
            (first, second) => Math.abs(first.quantile - requested) - Math.abs(second.quantile - requested)
              || second.qualityScore - first.qualityScore
              || compareDifficulty(first, second),
          );
          picked = chooseCandidate(adjacent, selectedFormal, usedIds, similarityThreshold, "formal", rejections, rejectionKeys);
          fallback = picked !== null;
        }
        if (!picked) throw new Error(`FORMAL SELECTION BLOCKED: unable to fill ${key} Q${requested}`);
        usedIds.add(picked.candidate.candidate.level.levelId);
        selectedFormal.push({
          ...picked.candidate,
          selectionStage: "formal",
          qualityFractionUsed: picked.fraction,
          quantileRequested: requested,
          quantileFallback: fallback,
        });
        qualityRelaxations[key] = Math.max(qualityRelaxations[key] ?? 0, picked.fraction);
        if (fallback) quantileFallbacks++;
      }
    }
  }

  for (const formal of [...selectedFormal].sort((first, second) => first.sizeKey.localeCompare(second.sizeKey) || compareDifficulty(first, second))) {
    const group = ranked.filter((candidate) => candidate.sizeKey === formal.sizeKey).sort(
      (first, second) => Math.abs(first.difficulty.difficultyRawScore - formal.difficulty.difficultyRawScore)
        - Math.abs(second.difficulty.difficultyRawScore - formal.difficulty.difficultyRawScore)
        || second.qualityScore - first.qualityScore
        || first.candidate.level.levelId.localeCompare(second.candidate.level.levelId),
    );
    const picked = chooseCandidate(
      group,
      [...selectedFormal, ...selectedReserve],
      usedIds,
      similarityThreshold,
      "reserve",
      rejections,
      rejectionKeys,
    );
    if (!picked) throw new Error(`FORMAL SELECTION BLOCKED: no reserve for ${formal.candidate.level.levelId}`);
    usedIds.add(picked.candidate.candidate.level.levelId);
    selectedReserve.push({
      ...picked.candidate,
      selectionStage: "reserve",
      qualityFractionUsed: picked.fraction,
      quantileFallback: false,
      preferredForCandidateId: formal.candidate.level.levelId,
    });
    qualityRelaxations[formal.sizeKey] = Math.max(qualityRelaxations[formal.sizeKey] ?? 0, picked.fraction);
  }

  if (selectedFormal.length !== 100 || selectedReserve.length !== 100) {
    throw new Error(`FORMAL SELECTION BLOCKED: selected ${selectedFormal.length}/${selectedReserve.length}`);
  }

  const queues = new Map<string, SelectedCandidate[]>();
  for (const quota of FORMAL_SIZE_QUOTAS) {
    const key = boardSizeKey(quota.width, quota.height);
    queues.set(key, selectedFormal.filter((candidate) => candidate.sizeKey === key).sort(compareProgression));
  }
  const formalWithoutReserve = CHAPTER_SIZE_SEQUENCE.map((sizeKey, index) => {
    const selected = queues.get(sizeKey)?.shift();
    if (!selected) throw new Error(`FORMAL SELECTION BLOCKED: chapter sequence exhausted ${sizeKey}`);
    const score = index + 1;
    return {
      ...selected,
      levelId: `main_${String(score).padStart(3, "0")}`,
      chapter: Math.floor(index / 10) + 1,
      order: (index % 10) + 1,
      difficultyTier: tierForScore(score),
      difficultyScore: score,
    };
  });

  const reserveCounters = new Map<string, number>();
  const orderedReserve: OrderedReserveLevel[] = formalWithoutReserve.map((formal) => {
    const reserve = selectedReserve.find((candidate) => candidate.preferredForCandidateId === formal.candidate.level.levelId);
    if (!reserve) throw new Error(`FORMAL SELECTION BLOCKED: reserve mapping missing for ${formal.levelId}`);
    const next = (reserveCounters.get(formal.sizeKey) ?? 0) + 1;
    reserveCounters.set(formal.sizeKey, next);
    return {
      ...reserve,
      reserveId: `reserve_${formal.sizeKey}_${String(next).padStart(3, "0")}`,
      matchedFormalLevelId: formal.levelId,
      replacementScoreRange: [Math.max(1, formal.difficultyScore - 2), Math.min(100, formal.difficultyScore + 2)] as const,
    };
  });
  const reserveByFormal = new Map(orderedReserve.map((reserve) => [reserve.matchedFormalLevelId, reserve.reserveId]));
  const orderedFormal: OrderedFormalLevel[] = formalWithoutReserve.map((formal) => ({
    ...formal,
    preferredReserveId: reserveByFormal.get(formal.levelId) ?? "missing",
  }));

  const deviation = standardDeviation(ranked.map((candidate) => candidate.difficulty.difficultyRawScore));
  let majorDifficultyReversals = 0;
  for (let index = 1; index < orderedFormal.length; index++) {
    const previous = orderedFormal[index - 1]!.difficulty.difficultyRawScore;
    const current = orderedFormal[index]!.difficulty.difficultyRawScore;
    if (previous - current > deviation * 0.35) majorDifficultyReversals++;
  }
  if (majorDifficultyReversals > 0) {
    throw new Error(`FORMAL SELECTION BLOCKED: ${majorDifficultyReversals} major difficulty reversals`);
  }

  return {
    sourcePoolVersion: "maomao-rectangular-v0.2.1",
    generatorCommit: "27554b9ec39b66941d62a28b0a7c957b05d44aa6",
    analyzed: ranked,
    formal: orderedFormal,
    reserve: orderedReserve,
    similarityThreshold,
    similarityRejections: rejections,
    qualityRelaxations,
    quantileFallbacks,
    majorDifficultyReversals,
    fullPoolDifficultyStandardDeviation: Number(deviation.toFixed(6)),
  };
}
