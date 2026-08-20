import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeFormalOutput } from "./formal-exporter.ts";
import { verifyFormalOutput } from "./formal-verifier.ts";
import { buildMockSelection } from "./test-fixtures.ts";

describe("formal verifier", () => {
  it("accepts a complete deterministic formal export", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "maomao-formal-verify-"));
    const output = path.join(root, "output");
    try {
      await writeFormalOutput(buildMockSelection(), output);
      const result = await verifyFormalOutput(output, 1.01);
      expect(result).toMatchObject({ valid: true, formalLevels: 100, reserveLevels: 100, manifestReferences: 100, exactDuplicates: 0, formalReserveOverlap: 0, majorDifficultyReversals: 0 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects audit fields leaked into runtime JSON", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "maomao-formal-audit-field-"));
    const output = path.join(root, "output");
    try {
      await writeFormalOutput(buildMockSelection(), output);
      const file = path.join(output, "formal", "main_001.json");
      const level = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      await writeFile(file, `${JSON.stringify({ ...level, generation: { seed: "forbidden" } }, null, 2)}\n`, "utf8");
      const result = await verifyFormalOutput(output, 1.01);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.startsWith("AUDIT_FIELD:"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
