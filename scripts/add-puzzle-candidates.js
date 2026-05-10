#!/usr/bin/env node
import fs from "node:fs/promises";
import { CANDIDATES_PATH, buildCandidateBatch, mergeUniqueById, parseArgs, readPolicy, readStore, writeJson, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();

async function readCandidates(inputPath) {
  if (!inputPath) throw new Error("Missing required --input <json-file>.");
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const candidates = Array.isArray(parsed) ? parsed : parsed.puzzles;
  if (!Array.isArray(candidates)) {
    throw new Error("Input must be an array or an object with a puzzles array.");
  }
  return candidates;
}

async function main() {
  const dryRun = Boolean(args["dry-run"]);
  const unsafeWrite = Boolean(args["unsafe-write"]);
  const output = args.output ? String(args.output) : "";
  const generated = await readCandidates(String(args.input || ""));
  const store = await readStore(CANDIDATES_PATH);
  const policy = await readPolicy();
  const candidates = buildCandidateBatch(generated, store.items, policy);
  const nextStore = {
    ...store,
    items: mergeUniqueById(store.items, candidates)
  };

  if (output) {
    await writeJson(output, { version: 1, items: candidates });
  }

  if (!dryRun && unsafeWrite) {
    await writeStore(CANDIDATES_PATH, nextStore);
  }

  const action = !dryRun && unsafeWrite ? "Added" : "Prepared";
  console.log(`${action} ${candidates.length} candidate(s)${!dryRun && unsafeWrite ? ` into ${CANDIDATES_PATH}` : ""}.`);
  for (const item of candidates) {
    console.log(`- ${item.id} ${item.answer} score=${item.qualityScore} issues=${item.issueFlags.join(",") || "none"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
