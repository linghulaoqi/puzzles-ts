import { describe, expect, it } from "vitest";
import { newDesc } from "../../src/native/games/rect/generator.ts";
import { randomNew } from "../../src/native/random/index.ts";
import { parseCliArgs } from "./cli.ts";
import { fingerprintRectangles } from "./fingerprint.ts";
import { parseRectangles } from "./parser.ts";
import { RECTANGULAR_POOL_SPECS } from "./quality-config.ts";
import { validateRectangles } from "./validator.ts";

const determinismSeeds = [1, 2] as const;

describe("rectangular CLI dimensions", () => {
  it.each(RECTANGULAR_POOL_SPECS)("$width x $height preserves columns and rows", (spec) => {
    const size = `${spec.width}x${spec.height}`;
    const options = parseCliArgs([
      "generate",
      "--width",
      String(spec.width),
      "--height",
      String(spec.height),
      "--count",
      "3",
      "--seed-prefix",
      `maomao-smoke-${size}`,
      "--output",
      `output/smoke/${size}`,
      "--source-commit",
      "commit",
    ]);
    expect(options.width).toBe(spec.width);
    expect(options.height).toBe(spec.height);
  });
});

describe("rectangular generator determinism", () => {
  it.each(
    RECTANGULAR_POOL_SPECS.flatMap((spec) =>
      determinismSeeds.map((seedIndex) => ({ ...spec, seed: `maomao-determinism-${spec.width}x${spec.height}-${seedIndex}` })),
    ),
  )("$width x $height repeats seed $seed", ({ width, height, seed }) => {
    const params = { w: width, h: height, expandfactor: 0, unique: true };
    const firstNative = newDesc(params, randomNew(seed));
    const secondNative = newDesc(params, randomNew(seed));
    expect(secondNative.desc).toBe(firstNative.desc);
    expect(secondNative.aux).toBe(firstNative.aux);

    const first = parseRectangles(width, height, firstNative.desc, firstNative.aux);
    const second = parseRectangles(width, height, secondNative.desc, secondNative.aux);
    expect(second.clues).toEqual(first.clues);
    expect(second.solutionRegions).toEqual(first.solutionRegions);
    const firstFingerprint = fingerprintRectangles(width, height, first.clues, first.solutionRegions);
    const secondFingerprint = fingerprintRectangles(width, height, second.clues, second.solutionRegions);
    expect(secondFingerprint).toBe(firstFingerprint);

    const validation = validateRectangles(width, height, first.clues, first.solutionRegions, true);
    expect(validation).toMatchObject({
      structuralValid: true,
      uniqueRequested: true,
      uniqueVerified: true,
    });
    expect(first.width).toBe(width);
    expect(first.height).toBe(height);
  });

  it("includes dimensions in the structural fingerprint", () => {
    const clues = [{ row: 0, column: 0, value: 1 }];
    const regions = [{ top: 0, left: 0, bottom: 0, right: 0 }];
    expect(fingerprintRectangles(4, 6, clues, regions)).not.toBe(
      fingerprintRectangles(6, 4, clues, regions),
    );
  });
});
