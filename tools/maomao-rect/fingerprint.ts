import { shaSimple } from "../../src/native/random/sha1.ts";
import type { MaomaoClue, MaomaoRegion } from "./model.ts";

function canonicalJson(width: number, height: number, clues: MaomaoClue[], regions: MaomaoRegion[]): string {
  const sortedClues = [...clues].sort((a, b) => a.row - b.row || a.column - b.column || a.value - b.value);
  const sortedRegions = [...regions].sort(
    (a, b) => a.top - b.top || a.left - b.left || a.bottom - b.bottom || a.right - b.right,
  );
  return JSON.stringify({ width, height, clues: sortedClues, solutionRegions: sortedRegions });
}

export function fingerprintRectangles(
  width: number,
  height: number,
  clues: MaomaoClue[],
  regions: MaomaoRegion[],
): string {
  const digest = new Uint8Array(20);
  shaSimple(new TextEncoder().encode(canonicalJson(width, height, clues, regions)), digest);
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

