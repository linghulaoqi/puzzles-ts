import { describe, expect, it } from "vitest";
import { calculateMetrics, qualityRejectReasons } from "./quality.ts";

describe("maomao Rectangles quality filters", () => {
  it("flags too many singleton regions", () => {
    const regions = [
      { top: 0, left: 0, bottom: 0, right: 0 },
      { top: 0, left: 1, bottom: 0, right: 1 },
      { top: 1, left: 0, bottom: 1, right: 1 },
    ];
    const metrics = calculateMetrics(2, 2, [{ row: 0, column: 0, value: 1 }], regions, "fingerprint", {
      maxSingletons: 1,
      maxAspectRatio: 4,
      maxLongThinFraction: 0.5,
      maxEdgeClueFraction: 1,
    });
    expect(qualityRejectReasons(metrics, { maxSingletons: 1, maxAspectRatio: 4, maxLongThinFraction: 0.5, maxEdgeClueFraction: 1 })).toContain("TOO_MANY_SINGLE_CELL_REGIONS");
  });
});

