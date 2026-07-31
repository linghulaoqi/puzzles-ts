import { describe, expect, it } from "vitest";
import { validateRectangles } from "./validator.ts";

describe("maomao Rectangles validator", () => {
  it("rejects overlapping or incorrectly numbered regions", () => {
    const result = validateRectangles(2, 2, [{ row: 0, column: 0, value: 3 }], [
      { top: 0, left: 0, bottom: 1, right: 0 },
      { top: 0, left: 0, bottom: 0, right: 1 },
    ]);
    expect(result.structuralValid).toBe(false);
    expect(result.errors).toContain("REGION_OVERLAP:0");
  });
});

