#!/usr/bin/env node
import { CANDIDATES_PATH, parseArgs, readPolicy, readStore, scorePuzzle, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();
const filePath = String(args.file || CANDIDATES_PATH);

async function main() {
  const store = await readStore(filePath);
  const policy = await readPolicy();
  store.items = store.items.map((puzzle) => {
    const scored = scorePuzzle(puzzle, store.items, policy);
    const changed =
      puzzle.qualityScore !== scored.qualityScore ||
      JSON.stringify(puzzle.issueFlags || []) !== JSON.stringify(scored.issueFlags || []);
    return {
      ...puzzle,
      ...scored,
      updatedAt: changed ? new Date().toISOString() : puzzle.updatedAt
    };
  });

  for (const puzzle of store.items) {
    console.log(`${puzzle.id} ${puzzle.answer} score=${puzzle.qualityScore} issues=${puzzle.issueFlags.join(",") || "none"}`);
  }

  if (args.write) {
    await writeStore(filePath, store);
    console.log(`Scores written to ${filePath}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
