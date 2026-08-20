import type { CandidateEnumeration, LogicalAnalysis, RectangleCandidate } from "./types.ts";

function bitCount(value: bigint): number {
  let count = 0;
  let remaining = value;
  while (remaining !== 0n) {
    remaining &= remaining - 1n;
    count++;
  }
  return count;
}

function intersection(candidates: readonly RectangleCandidate[]): bigint {
  if (!candidates[0]) return 0n;
  return candidates.slice(1).reduce((mask, candidate) => mask & candidate.mask, candidates[0].mask);
}

export function solveLogically(enumeration: CandidateEnumeration): LogicalAnalysis {
  const candidates = enumeration.candidatesByClue.map((items) => [...items]);
  const fixed: Array<RectangleCandidate | null> = candidates.map(() => null);
  const ownedMasks = candidates.map(() => 0n);
  const ruleApplications = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
  let logicalRounds = 0;
  let logicalActions = 0;
  let candidateEliminations = 0;
  let forcedRectangleCount = 0;
  let forcedCellCount = 0;
  let contradiction = candidates.some((items) => items.length === 0);

  const eliminateOverlaps = (owner: number, mask: bigint, rule: "L3" | "L5"): boolean => {
    let changed = false;
    for (let index = 0; index < candidates.length; index++) {
      if (index === owner || fixed[index]) continue;
      const before = candidates[index]?.length ?? 0;
      candidates[index] = (candidates[index] ?? []).filter((candidate) => (candidate.mask & mask) === 0n);
      const removed = before - (candidates[index]?.length ?? 0);
      if (removed > 0) {
        candidateEliminations += removed;
        logicalActions += removed;
        ruleApplications[rule] += removed;
        changed = true;
      }
      if ((candidates[index]?.length ?? 0) === 0) contradiction = true;
    }
    return changed;
  };

  const forceCandidate = (clueIndex: number, candidate: RectangleCandidate, rule: "L1" | "L4"): boolean => {
    const existing = fixed[clueIndex];
    if (existing) {
      if (existing.mask !== candidate.mask) contradiction = true;
      return false;
    }
    for (let index = 0; index < fixed.length; index++) {
      const other = fixed[index];
      if (index !== clueIndex && other && (other.mask & candidate.mask) !== 0n) {
        contradiction = true;
        return false;
      }
    }
    const removedFromOwn = Math.max(0, (candidates[clueIndex]?.length ?? 0) - 1);
    candidateEliminations += removedFromOwn;
    logicalActions += removedFromOwn;
    fixed[clueIndex] = candidate;
    candidates[clueIndex] = [candidate];
    const newCells = candidate.mask & ~ownedMasks[clueIndex];
    ownedMasks[clueIndex] |= candidate.mask;
    forcedCellCount += bitCount(newCells);
    forcedRectangleCount++;
    logicalActions++;
    ruleApplications[rule]++;
    eliminateOverlaps(clueIndex, candidate.mask, "L3");
    return true;
  };

  const fullMask = (1n << BigInt(enumeration.width * enumeration.height)) - 1n;
  while (!contradiction) {
    let changed = false;

    for (let index = 0; index < candidates.length; index++) {
      const only = candidates[index]?.length === 1 ? candidates[index]?.[0] : undefined;
      if (!fixed[index] && only && forceCandidate(index, only, "L1")) changed = true;
    }
    if (contradiction) break;

    for (let index = 0; index < candidates.length; index++) {
      if (fixed[index] || (candidates[index]?.length ?? 0) < 2) continue;
      const commonMask = intersection(candidates[index] ?? []);
      const newlyOwned = commonMask & ~ownedMasks[index];
      if (newlyOwned === 0n) continue;
      ownedMasks[index] |= newlyOwned;
      forcedCellCount += bitCount(newlyOwned);
      logicalActions++;
      ruleApplications.L2++;
      eliminateOverlaps(index, newlyOwned, "L5");
      changed = true;
    }
    if (contradiction) break;

    const ownedUnion = ownedMasks.reduce((mask, value) => mask | value, 0n);
    for (let cell = 0; cell < enumeration.width * enumeration.height; cell++) {
      const cellMask = 1n << BigInt(cell);
      if ((ownedUnion & cellMask) !== 0n) continue;
      let sole: RectangleCandidate | undefined;
      let soleClue = -1;
      let occurrences = 0;
      for (let clueIndex = 0; clueIndex < candidates.length && occurrences <= 1; clueIndex++) {
        if (fixed[clueIndex]) continue;
        for (const candidate of candidates[clueIndex] ?? []) {
          if ((candidate.mask & cellMask) === 0n) continue;
          occurrences++;
          sole = candidate;
          soleClue = clueIndex;
          if (occurrences > 1) break;
        }
      }
      if (occurrences === 1 && sole && forceCandidate(soleClue, sole, "L4")) changed = true;
      if (contradiction) break;
    }

    if (!changed) break;
    logicalRounds++;
  }

  const ownedUnion = ownedMasks.reduce((mask, value) => mask | value, 0n);
  const unresolvedClueCount = fixed.filter((candidate) => candidate === null).length;
  const logicalSolved = !contradiction && unresolvedClueCount === 0 && ownedUnion === fullMask;
  return {
    logicalSolved,
    logicalRounds,
    logicalActions,
    candidateEliminations,
    forcedRectangleCount,
    forcedCellCount,
    initialCandidateTotal: enumeration.initialCandidateCount,
    finalCandidateTotal: candidates.reduce((sum, items) => sum + items.length, 0),
    unresolvedClueCount,
    unresolvedCellCount: bitCount(fullMask & ~ownedUnion),
    logicalStall: !logicalSolved && !contradiction,
    contradiction,
    ruleApplications,
  };
}
