import { describe, expect, it } from "vitest";
import { newDesc } from "../../src/native/games/rect/generator.ts";
import { randomNew } from "../../src/native/random/index.ts";
import { parseRectangles } from "./parser.ts";

describe("maomao Rectangles parser", () => {
  it("extracts one clue per complete solution region", () => {
    const native = newDesc({ w: 4, h: 4, expandfactor: 0, unique: true }, randomNew("parser-test"));
    const parsed = parseRectangles(4, 4, native.desc, native.aux);
    expect(parsed.clues).toHaveLength(parsed.solutionRegions.length);
    expect(parsed.solutionRegions.reduce((sum, region) => sum + (region.bottom - region.top + 1) * (region.right - region.left + 1), 0)).toBe(16);
  });
});

