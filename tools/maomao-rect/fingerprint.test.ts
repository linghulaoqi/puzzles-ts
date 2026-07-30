import { describe, expect, it } from "vitest";
import { fingerprintRectangles } from "./fingerprint.ts";

describe("maomao Rectangles fingerprints", () => {
  it("is independent of clue and region input ordering", () => {
    const clues = [{ row: 1, column: 1, value: 2 }, { row: 0, column: 0, value: 2 }];
    const regions = [{ top: 1, left: 1, bottom: 1, right: 2 }, { top: 0, left: 0, bottom: 0, right: 1 }];
    expect(fingerprintRectangles(2, 2, clues, regions)).toBe(
      fingerprintRectangles(2, 2, [...clues].reverse(), [...regions].reverse()),
    );
  });
});

