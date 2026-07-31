import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateBatch, generateOne } from "./generate.ts";
import type { MaomaoExportLevel } from "./model.ts";
import { resolveQualityConfig } from "./quality-config.ts";
import { buildReport, renderReportMarkdown, type GenerationReport } from "./report.ts";
import { assertMaomaoLevel } from "./schema.ts";
import { validateRectangles } from "./validator.ts";

export interface CliOptions {
  command: "generate" | "validate" | "report";
  width?: number;
  height?: number;
  count?: number;
  seedPrefix?: string;
  startIndex: number;
  output?: string;
  input?: string;
  format: "json" | "jsonl" | "both";
  maxAttempts?: number;
  sourceCommit: string;
  overwrite: boolean;
}

function valueFor(args: string[], name: string): string | undefined {
  const equal = args.find((arg) => arg.startsWith(`${name}=`));
  if (equal) return equal.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function numberFor(args: string[], name: string, required = false): number | undefined {
  const value = valueFor(args, name);
  if (value === undefined) {
    if (required) throw new Error(`Missing ${name}`);
    return undefined;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid ${name}: ${value}`);
  return number;
}

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.MAOMAO_SOURCE_COMMIT ?? "unknown";
  }
}

export function parseCliArgs(args: string[]): CliOptions {
  const command = args[0] as CliOptions["command"] | undefined;
  if (command !== "generate" && command !== "validate" && command !== "report") {
    throw new Error("Usage: cli.ts <generate|validate|report> [options]");
  }
  const format = (valueFor(args, "--format") ?? "both") as CliOptions["format"];
  if (!(["json", "jsonl", "both"] as const).includes(format)) throw new Error(`Invalid --format: ${format}`);
  const sourceCommit = valueFor(args, "--source-commit") ?? currentCommit();
  return {
    command,
    width: numberFor(args, "--width"),
    height: numberFor(args, "--height"),
    count: numberFor(args, "--count"),
    seedPrefix: valueFor(args, "--seed-prefix"),
    startIndex: numberFor(args, "--start-index") ?? 1,
    output: valueFor(args, "--output"),
    input: valueFor(args, "--input"),
    format,
    maxAttempts: numberFor(args, "--max-attempts"),
    sourceCommit,
    overwrite: args.includes("--overwrite"),
  };
}

function requireGenerateOption(options: CliOptions): Required<Pick<CliOptions, "width" | "height" | "count" | "seedPrefix" | "output">> {
  if (!options.width || !options.height || !options.count || !options.seedPrefix || !options.output) {
    throw new Error("generate requires --width --height --count --seed-prefix --output");
  }
  return {
    width: options.width,
    height: options.height,
    count: options.count,
    seedPrefix: options.seedPrefix,
    output: options.output,
  };
}

async function writeGenerated(options: CliOptions): Promise<GenerationReport> {
  const required = requireGenerateOption(options);
  const outputPath = path.resolve(required.output);
  const exists = await access(outputPath).then(() => true).catch(() => false);
  if (exists) throw new Error("GENERATION BLOCKED: OUTPUT ALREADY EXISTS");
  await mkdir(outputPath, { recursive: true });
  const batch = generateBatch({
    ...required,
    startIndex: options.startIndex,
    maxAttempts: options.maxAttempts ?? required.count * 50,
    sourceCommit: options.sourceCommit,
    qualityConfig: resolveQualityConfig(required.width, required.height).config,
  });
  const first = batch.accepted[0];
  const determinism = first
    ? (() => {
        const repeat = generateOne({
          width: required.width,
          height: required.height,
          seed: first.seed,
          sourceCommit: options.sourceCommit,
          index: options.startIndex,
          qualityConfig: batch.qualityConfig,
        });
        return {
          seed: first.seed,
          fingerprint: first.metrics.fingerprint,
          repeatFingerprint: repeat.metrics?.fingerprint ?? "missing",
          matched: first.metrics.fingerprint === repeat.metrics?.fingerprint,
        };
      })()
    : null;
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  const report = buildReport(batch, branch, determinism);
  if (options.format === "json" || options.format === "both") {
    await writeFile(path.join(outputPath, "candidates.json"), `${JSON.stringify(batch.accepted.map((candidate) => candidate.level), null, 2)}\n`, "utf8");
  }
  if (options.format === "jsonl" || options.format === "both") {
    const acceptedLines = batch.accepted.map((candidate) => JSON.stringify(candidate)).join("\n");
    await writeFile(path.join(outputPath, "candidates.jsonl"), acceptedLines ? `${acceptedLines}\n` : "", "utf8");
  }
  await writeFile(path.join(outputPath, "rejected.jsonl"), batch.rejected.map((record) => JSON.stringify(record)).join("\n") + (batch.rejected.length ? "\n" : ""), "utf8");
  await mkdir(path.join(outputPath, "levels"), { recursive: true });
  for (const candidate of batch.accepted) {
    await writeFile(path.join(outputPath, "levels", `${candidate.level.levelId}.json`), `${JSON.stringify(candidate.level, null, 2)}\n`, "utf8");
  }
  await writeFile(path.join(outputPath, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputPath, "GENERATION_REPORT.md"), renderReportMarkdown(report), "utf8");
  if (!batch.targetReached) throw new Error("GENERATION PARTIAL: TARGET ACCEPTED COUNT NOT REACHED");
  return report;
}

async function readRecords(inputPath: string): Promise<unknown[]> {
  const text = await readFile(inputPath, "utf8");
  if (inputPath.endsWith(".jsonl")) return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const parsed: unknown = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function levelFromRecord(record: unknown): MaomaoExportLevel {
  const value = record as { level?: unknown };
  const level = value.level ?? record;
  assertMaomaoLevel(level);
  return level;
}

async function validateInput(options: CliOptions): Promise<void> {
  if (!options.input) throw new Error("validate requires --input");
  const records = await readRecords(path.resolve(options.input));
  const failures: string[] = [];
  for (const record of records) {
    try {
      const level = levelFromRecord(record);
      const validation = validateRectangles(level.width, level.height, level.clues, level.solutionRegions, true);
      if (!validation.structuralValid) failures.push(`${level.levelId}:${validation.errors.join(",")}`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const result = { records: records.length, failures, valid: failures.length === 0 };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (failures.length) throw new Error("VALIDATION FAILED");
}

async function printReport(options: CliOptions): Promise<void> {
  if (!options.input && !options.output) throw new Error("report requires --input or --output");
  const candidate = path.resolve(options.input ?? path.join(options.output as string, "report.json"));
  const report = JSON.parse(await readFile(candidate, "utf8")) as GenerationReport;
  process.stdout.write(renderReportMarkdown(report));
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(args);
  if (options.command === "generate") {
    const report = await writeGenerated(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.command === "validate") {
    await validateInput(options);
  } else {
    await printReport(options);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
