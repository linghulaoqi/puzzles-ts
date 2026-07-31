import { describe, expect, it } from "vitest";
import { generateOne } from "./generate.ts";
import { DEFAULT_QUALITY } from "./quality.ts";

describe("maomao Rectangles determinism", () => {
  it("repeats the same accepted candidate for a fixed seed", () => {
    const options = { width: 4, height: 4, seed: "determinism-test", sourceCommit: "commit", index: 1, qualityConfig: DEFAULT_QUALITY["4x4"] };
    const first = generateOne(options);
    const second = generateOne(options);
    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    expect(first.metrics?.fingerprint).toBe(second.metrics?.fingerprint);
    expect(first.level?.generation.seed).toBe("determinism-test");
  });
});

