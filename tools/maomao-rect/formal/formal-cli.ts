import { fileURLToPath } from "node:url";
import path from "node:path";
import { runFormalSelection, writeDifficultyAnalysis } from "./formal-pipeline.ts";
import { writeFormalVerification } from "./formal-verifier.ts";

type FormalCommand = "analyze-difficulty" | "select-formal" | "export-formal" | "verify-formal";

function valueFor(args: readonly string[], name: string): string | undefined {
  const equal = args.find((arg) => arg.startsWith(`${name}=`));
  if (equal) return equal.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function required(args: readonly string[], name: string): string {
  const value = valueFor(args, name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function thresholdFor(args: readonly string[]): number {
  const value = Number(valueFor(args, "--similarity-threshold") ?? "0.92");
  if (!Number.isFinite(value) || value <= 0 || value > 1.01) throw new Error("Invalid --similarity-threshold");
  return value;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const command = args[0] as FormalCommand | undefined;
  if (command === "verify-formal") {
    const result = await writeFormalVerification(path.resolve(required(args, "--input")), thresholdFor(args));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "analyze-difficulty") {
    const count = await writeDifficultyAnalysis(
      required(args, "--input"),
      required(args, "--output"),
      args.includes("--overwrite"),
    );
    process.stdout.write(`${JSON.stringify({ analyzed: count }, null, 2)}\n`);
    return;
  }
  if (command === "select-formal" || command === "export-formal") {
    const formalCount = Number(valueFor(args, "--formal-count") ?? "100");
    const reserveCount = Number(valueFor(args, "--reserve-count") ?? "100");
    if (formalCount !== 100 || reserveCount !== 100) throw new Error("V0.3 requires exactly 100 formal and 100 reserve levels");
    const result = await runFormalSelection({
      input: required(args, "--input"),
      poolLock: required(args, "--pool-lock"),
      output: required(args, "--output"),
      similarityThreshold: thresholdFor(args),
      overwrite: args.includes("--overwrite"),
    });
    process.stdout.write(`${JSON.stringify({ poolLock: result.poolLock, verification: result.verification }, null, 2)}\n`);
    return;
  }
  throw new Error("Usage: formal-cli.ts <analyze-difficulty|select-formal|export-formal|verify-formal> [options]");
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
