#!/usr/bin/env node
import { spawn } from "node:child_process";
import { DAILY_PATH, parseArgs, readStore, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`));
    });
  });
}

async function main() {
  const now = args.now ? new Date(String(args.now)) : new Date();
  const store = await readStore(DAILY_PATH);
  let publishedCount = 0;

  store.items = store.items.map((puzzle) => {
    if (puzzle.status !== "scheduled" || !puzzle.scheduledAt) return puzzle;
    if (new Date(puzzle.scheduledAt) > now) return puzzle;
    publishedCount += 1;
    return {
      ...puzzle,
      status: "published",
      publishedAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  });

  await writeStore(DAILY_PATH, store);
  if (args["sync-db"]) {
    await run("node", ["--env-file=.env.local", "scripts/db-sync-puzzles.js"]);
  }
  console.log(`Published ${publishedCount} puzzle(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
