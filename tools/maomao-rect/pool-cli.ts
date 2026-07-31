import path from "node:path";
import { writeRectangularPoolArtifacts } from "./pool.ts";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const input = option(args, "--input");
  const lockOutput = option(args, "--lock-output");
  const sourceCommit = option(args, "--source-commit");
  if (!input || !lockOutput || !sourceCommit) {
    throw new Error("pool-cli requires --input --lock-output --source-commit");
  }
  const audit = await writeRectangularPoolArtifacts(
    path.resolve(input),
    path.resolve(lockOutput),
    sourceCommit,
  );
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
