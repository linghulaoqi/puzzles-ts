import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROGRESSION_MODEL_VERSION } from "./formal-config.ts";
import { formalMapping, formalRuntimeLevel, writeFormalOutput } from "./formal-exporter.ts";
import { buildMockSelection } from "./test-fixtures.ts";

describe("formal exporter", () => {
  it("removes candidate audit fields from runtime JSON", () => {
    const runtime = formalRuntimeLevel(buildMockSelection().formal[0]!);
    expect(runtime).not.toHaveProperty("generation");
    expect(runtime).not.toHaveProperty("seed");
    expect(runtime).not.toHaveProperty("fingerprint");
    expect(runtime).not.toHaveProperty("difficultyRawScore");
    expect(runtime.contentVersion).toBe(2);
  });

  it("records the progression model and effort in the audit mapping", () => {
    const mapping = formalMapping(buildMockSelection()) as {
      readonly progressionModel: string;
      readonly levels: readonly { readonly progressionEffort: number }[];
    };
    expect(mapping.progressionModel).toBe(PROGRESSION_MODEL_VERSION);
    expect(mapping.levels).toHaveLength(100);
    expect(mapping.levels.every((level) => Number.isFinite(level.progressionEffort))).toBe(true);
  });

  it("writes 100 formal and 100 reserve files plus mappings", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "maomao-formal-export-"));
    const output = path.join(root, "output");
    try {
      await writeFormalOutput(buildMockSelection(), output);
      expect((await readdir(path.join(output, "formal"))).filter((name) => name.endsWith(".json"))).toHaveLength(100);
      expect((await readdir(path.join(output, "reserve"))).filter((name) => name.endsWith(".json"))).toHaveLength(100);
      const main = JSON.parse(await readFile(path.join(output, "formal", "main_001.json"), "utf8")) as Record<string, unknown>;
      expect(main).not.toHaveProperty("generation");
      expect(JSON.parse(await readFile(path.join(output, "formal-mapping.json"), "utf8"))).toHaveProperty("levels");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
