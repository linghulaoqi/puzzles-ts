import { describe, expect, it } from "vitest";
import {
  boardSizeKey,
  QUALITY_CONFIG_VERSION,
  RECTANGULAR_POOL_SPECS,
  resolveQualityConfig,
} from "./quality-config.ts";

describe("rectangular quality configuration", () => {
  it("defines all six production rectangular sizes with dedicated thresholds", () => {
    expect(QUALITY_CONFIG_VERSION).toBe("PROVISIONAL_RECTANGULAR_QUALITY_FILTERS_V0.1");
    expect(RECTANGULAR_POOL_SPECS).toHaveLength(6);
    for (const spec of RECTANGULAR_POOL_SPECS) {
      const resolved = resolveQualityConfig(spec.width, spec.height);
      expect(resolved.key).toBe(boardSizeKey(spec.width, spec.height));
      expect(resolved.dedicated).toBe(true);
    }
  });

  it("does not silently rotate width and height", () => {
    expect(resolveQualityConfig(4, 6).dedicated).toBe(true);
    expect(resolveQualityConfig(6, 4).dedicated).toBe(false);
  });

  it("uses a safe fallback for an unknown size", () => {
    const fallback = resolveQualityConfig(9, 11);
    expect(fallback.dedicated).toBe(false);
    expect(fallback.config.maxLongThinFraction).toBe(0.5);
    expect(fallback.config.maxEdgeClueFraction).toBeLessThan(1);
  });
});
