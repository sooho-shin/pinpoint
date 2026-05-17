#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import {
  CANDIDATES_PATH,
  REPORT_PATH,
  buildCandidateBatch,
  mergeUniqueById,
  parseArgs,
  readPolicy,
  readStore,
  writeJson,
  writeStore
} from "./lib/puzzle-store.js";

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

async function newestGeneratedCandidateId() {
  const store = await readStore(CANDIDATES_PATH);
  const policy = await readPolicy();
  const candidates = store.items
    .filter((item) => item.status === "generated" && Number(item.qualityScore || 0) >= policy.minimumQualityScore)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return candidates[0]?.id || null;
}

async function main() {
  const input = args.input ? String(args.input) : "";
  if (!input) {
    throw new Error("Missing required --input <json-file>. The agent should create candidates first, then run the harness.");
  }
  const dryRun = Boolean(args["dry-run"]);
  const reportPath = args.report ? String(args.report) : REPORT_PATH;
  const tempPreparedPath = "tmp/harness-prepared-candidates.json";

  const raw = JSON.parse(await fs.readFile(input, "utf8"));
  const inputItems = Array.isArray(raw) ? raw : raw.puzzles;
  if (!Array.isArray(inputItems)) {
    throw new Error("Input must be an array or an object with a puzzles array.");
  }
  const existingStore = await readStore(CANDIDATES_PATH);
  const policy = await readPolicy();
  const preparedItems = buildCandidateBatch(inputItems, existingStore.items, policy);
  await writeJson(tempPreparedPath, { version: 1, items: preparedItems });

  const validationResults = preparedItems.map((puzzle) => ({
    id: puzzle.id,
    answer: puzzle.answer,
    issues: puzzle.issueFlags || []
  }));
  const scoreResults = preparedItems.map((puzzle) => ({
    id: puzzle.id,
    answer: puzzle.answer,
    qualityScore: puzzle.qualityScore,
    issueFlags: puzzle.issueFlags || []
  }));
  const failing = validationResults.filter((result) => result.issues.length > 0);
  const belowThreshold = preparedItems.filter((item) => Number(item.qualityScore || 0) < policy.minimumQualityScore);
  const passed = failing.length === 0 && belowThreshold.length === 0;

  if (!dryRun && passed) {
    const nextStore = {
      ...existingStore,
      items: mergeUniqueById(existingStore.items, preparedItems)
    };
    await writeStore(CANDIDATES_PATH, nextStore);
    await run("node", ["scripts/validate-puzzles.js"]);
    await run("node", ["scripts/score-puzzles.js", "--write"]);
  }

  const report = {
    ranAt: new Date().toISOString(),
    input,
    dryRun,
    addedCount: dryRun || !passed ? 0 : preparedItems.length,
    preparedCount: preparedItems.length,
    minimumQualityScore: policy.minimumQualityScore,
    validationResults,
    scoreResults,
    belowThreshold: belowThreshold.map((item) => ({
      id: item.id,
      answer: item.answer,
      qualityScore: item.qualityScore
    })),
    passed
  };
  await writeJson(reportPath, report);

  if (args.schedule) {
    if (dryRun) throw new Error("--schedule cannot be used with --dry-run.");
    if (!passed) throw new Error("--schedule cannot be used when harness validation failed.");
    const id = args.id ? String(args.id) : await newestGeneratedCandidateId();
    if (!id) throw new Error(`No generated candidate with qualityScore >= ${(await readPolicy()).minimumQualityScore} found for scheduling.`);
    const scheduleArgs = ["scripts/schedule-daily-puzzle.js", "--id", id];
    if (args.at) scheduleArgs.push("--at", String(args.at));
    if (args["sync-db"]) scheduleArgs.push("--sync-db");
    await run("node", scheduleArgs);
  }

  if (!passed) {
    console.error(`Puzzle harness failed before saving. See ${reportPath}.`);
    process.exit(1);
  }

  console.log(`Puzzle harness completed. Report written to ${reportPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
