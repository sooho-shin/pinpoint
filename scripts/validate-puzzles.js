#!/usr/bin/env node
import { CANDIDATES_PATH, DAILY_PATH, parseArgs, readPolicy, readStore, validatePuzzle } from "./lib/puzzle-store.js";

const args = parseArgs();
const filePath = String(args.file || CANDIDATES_PATH);

async function main() {
  const store = await readStore(filePath);
  const policy = await readPolicy();
  const daily = filePath === DAILY_PATH ? store.items : (await readStore(DAILY_PATH)).items;
  const all = [...store.items, ...daily];
  let issueCount = 0;

  for (const puzzle of store.items) {
    const issues = validatePuzzle(puzzle, all, policy);
    if (issues.length > 0) {
      issueCount += issues.length;
      console.log(`${puzzle.id || "(missing id)"} ${puzzle.answer || "(missing answer)"}`);
      for (const issue of issues) console.log(`  - ${issue}`);
    }
  }

  if (issueCount > 0) {
    console.error(`Validation failed: ${issueCount} issue(s).`);
    process.exit(1);
  }

  console.log(`Validation passed: ${store.items.length} puzzle(s) in ${filePath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
