import type { CandidateEnumeration, RectangleCandidate, SearchProfile } from "./types.ts";

interface SearchCounters {
  searchNodes: number;
  branchCount: number;
  backtrackCount: number;
  maximumSearchDepth: number;
  firstBranchCandidateCount: number;
}

function compareClueIndexes(enumeration: CandidateEnumeration, first: number, second: number): number {
  const firstClue = enumeration.clues[first];
  const secondClue = enumeration.clues[second];
  if (!firstClue || !secondClue) return first - second;
  return firstClue.row - secondClue.row || firstClue.column - secondClue.column || first - second;
}

export function profileSearch(enumeration: CandidateEnumeration): SearchProfile {
  const fullMask = (1n << BigInt(enumeration.width * enumeration.height)) - 1n;
  const counters: SearchCounters = {
    searchNodes: 0,
    branchCount: 0,
    backtrackCount: 0,
    maximumSearchDepth: 0,
    firstBranchCandidateCount: 0,
  };

  const search = (remaining: readonly number[], occupied: bigint, depth: number): 0 | 1 | 2 => {
    counters.searchNodes++;
    counters.maximumSearchDepth = Math.max(counters.maximumSearchDepth, depth);
    if (remaining.length === 0) return occupied === fullMask ? 1 : 0;

    const compatible = remaining.map((clueIndex) => ({
      clueIndex,
      candidates: (enumeration.candidatesByClue[clueIndex] ?? []).filter(
        (candidate) => (candidate.mask & occupied) === 0n,
      ),
    }));
    compatible.sort((first, second) => first.candidates.length - second.candidates.length
      || compareClueIndexes(enumeration, first.clueIndex, second.clueIndex));
    const choice = compatible[0];
    if (!choice || choice.candidates.length === 0) return 0;
    if (choice.candidates.length > 1) {
      counters.branchCount++;
      if (counters.firstBranchCandidateCount === 0) counters.firstBranchCandidateCount = choice.candidates.length;
    }
    const nextRemaining = remaining.filter((index) => index !== choice.clueIndex);
    let solutions: 0 | 1 | 2 = 0;
    for (const candidate of choice.candidates as readonly RectangleCandidate[]) {
      const found = search(nextRemaining, occupied | candidate.mask, depth + 1);
      if (found === 0) counters.backtrackCount++;
      solutions = Math.min(2, solutions + found) as 0 | 1 | 2;
      if (solutions === 2) break;
    }
    return solutions;
  };

  const solutionCountCappedAt2 = search(
    enumeration.candidatesByClue.map((_, index) => index),
    0n,
    0,
  );
  return { ...counters, solutionCountCappedAt2 };
}
