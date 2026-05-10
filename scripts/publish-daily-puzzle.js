#!/usr/bin/env node
import { DAILY_PATH, parseArgs, readStore, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();

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
  console.log(`Published ${publishedCount} puzzle(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
