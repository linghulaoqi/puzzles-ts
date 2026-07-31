import type { MaomaoExportLevel } from "./model.ts";

export function assertMaomaoLevel(value: unknown): asserts value is MaomaoExportLevel {
  if (!value || typeof value !== "object") throw new Error("Level must be an object");
  const level = value as Partial<MaomaoExportLevel>;
  if (level.schemaVersion !== 1) throw new Error("Unsupported schemaVersion");
  if (typeof level.levelId !== "string" || !level.levelId) throw new Error("Missing levelId");
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) {
    throw new Error("Invalid level dimensions");
  }
  if (!Array.isArray(level.clues) || !Array.isArray(level.solutionRegions)) {
    throw new Error("Level clues and solutionRegions must be arrays");
  }
  if (level.difficulty?.tier !== "unrated" || level.difficulty.score !== 0) {
    throw new Error("Candidate difficulty must remain unrated");
  }
}

