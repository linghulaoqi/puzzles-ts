import { describe, expect, it } from "vitest";
import { FORMAL_SIZE_QUOTAS } from "./formal-config.ts";
import { buildMockAnalyses } from "./test-fixtures.ts";
import { selectFormalLevels } from "./formal-selector.ts";

describe("deterministic formal selector", () => {
  it("selects exact formal and reserve quotas without overlap", () => {
    const result = selectFormalLevels(buildMockAnalyses(), 1.01);
    expect(result.formal).toHaveLength(100);
    expect(result.reserve).toHaveLength(100);
    for (const quota of FORMAL_SIZE_QUOTAS) {
      const key = `${quota.width}x${quota.height}`;
      expect(result.formal.filter((entry) => entry.sizeKey === key)).toHaveLength(quota.formal);
      expect(result.reserve.filter((entry) => entry.sizeKey === key)).toHaveLength(quota.reserve);
    }
    const formalIds = new Set(result.formal.map((entry) => entry.candidate.level.levelId));
    expect(result.reserve.some((entry) => formalIds.has(entry.candidate.level.levelId))).toBe(false);
  });

  it("assigns continuous IDs, chapters, orders, scores, and tiers", () => {
    const result = selectFormalLevels(buildMockAnalyses(), 1.01);
    expect(result.formal[0]).toMatchObject({ levelId: "main_001", chapter: 1, order: 1, difficultyTier: "easy", difficultyScore: 1 });
    expect(result.formal[29]).toMatchObject({ levelId: "main_030", difficultyTier: "easy", difficultyScore: 30 });
    expect(result.formal[30]).toMatchObject({ levelId: "main_031", difficultyTier: "medium", difficultyScore: 31 });
    expect(result.formal[80]).toMatchObject({ levelId: "main_081", difficultyTier: "hard", difficultyScore: 81 });
    expect(result.formal[99]).toMatchObject({ levelId: "main_100", chapter: 10, order: 10, difficultyTier: "hard", difficultyScore: 100 });
    expect(new Set(result.formal.map((entry) => entry.preferredReserveId)).size).toBe(100);
    expect(result.majorDifficultyReversals).toBe(0);
  });

  it("returns identical selections for identical input", () => {
    const first = selectFormalLevels(buildMockAnalyses(), 1.01);
    const second = selectFormalLevels(buildMockAnalyses(), 1.01);
    expect(second.formal.map((entry) => entry.candidate.level.levelId)).toEqual(first.formal.map((entry) => entry.candidate.level.levelId));
    expect(second.reserve.map((entry) => entry.candidate.level.levelId)).toEqual(first.reserve.map((entry) => entry.candidate.level.levelId));
  });
});
