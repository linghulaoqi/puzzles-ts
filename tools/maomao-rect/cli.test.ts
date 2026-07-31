import { describe, expect, it } from "vitest";
import { parseCliArgs } from "./cli.ts";

describe("maomao Rectangles CLI", () => {
  it("parses deterministic batch options", () => {
    const options = parseCliArgs([
      "generate",
      "--width",
      "5",
      "--height",
      "5",
      "--count",
      "10",
      "--seed-prefix",
      "maomao-5x5",
      "--output",
      "output/maomao-rect/5x5",
      "--format",
      "jsonl",
      "--source-commit",
      "abc",
    ]);
    expect(options).toMatchObject({ command: "generate", width: 5, height: 5, count: 10, format: "jsonl", sourceCommit: "abc" });
  });
});

