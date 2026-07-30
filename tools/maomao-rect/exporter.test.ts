import { describe, expect, it } from "vitest";
import { exportMaomaoLevel } from "./exporter.ts";
import { parseRectangles } from "./parser.ts";
import { newDesc } from "../../src/native/games/rect/generator.ts";
import { randomNew } from "../../src/native/random/index.ts";
import { fingerprintRectangles } from "./fingerprint.ts";

describe("maomao level exporter", () => {
  it("keeps candidate numbering and difficulty provisional", () => {
    const native = newDesc({ w: 4, h: 4, expandfactor: 0, unique: true }, randomNew("export-test"));
    const parsed = parseRectangles(4, 4, native.desc, native.aux);
    const fingerprint = fingerprintRectangles(4, 4, parsed.clues, parsed.solutionRegions);
    const level = exportMaomaoLevel(parsed, "export-test", "commit", { width: 4, height: 4, expandfactor: 0, unique: true }, fingerprint, 3);
    expect(level.levelId).toBe("candidate_4x4_000003");
    expect(level.difficulty).toEqual({ tier: "unrated", score: 0 });
    expect(level.generation.fingerprint).toBe(fingerprint);
  });
});

