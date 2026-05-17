#!/usr/bin/env node
import { spawn } from "node:child_process";
import { CANDIDATES_PATH, DAILY_PATH, parseArgs, readPolicy, readStore, writeStore } from "./lib/puzzle-store.js";

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

function nextKoreaFivePm() {
  const now = new Date();
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  const koreaNow = new Date(now.getTime() + koreaOffsetMs);
  const yyyy = koreaNow.getUTCFullYear();
  const mm = koreaNow.getUTCMonth();
  const dd = koreaNow.getUTCDate();
  let targetKst = Date.UTC(yyyy, mm, dd, 17, 0, 0);
  if (koreaNow.getUTCHours() >= 17) targetKst += 24 * 60 * 60 * 1000;
  return new Date(targetKst - koreaOffsetMs).toISOString();
}

async function main() {
  const id = args.id ? String(args.id) : null;
  const scheduledAt = args.at ? new Date(String(args.at)).toISOString() : nextKoreaFivePm();
  const candidateStore = await readStore(CANDIDATES_PATH);
  const dailyStore = await readStore(DAILY_PATH);
  const policy = await readPolicy();

  const candidate = id
    ? candidateStore.items.find((item) => item.id === id)
    : candidateStore.items.find((item) => ["generated", "approved", "scheduled"].includes(item.status) && Number(item.qualityScore || 0) >= policy.minimumQualityScore);

  if (!candidate) {
    throw new Error(id ? `Candidate not found: ${id}` : `No candidate with qualityScore >= ${policy.minimumQualityScore} found.`);
  }
  if (Number(candidate.qualityScore || 0) < policy.minimumQualityScore) {
    throw new Error(`Candidate qualityScore must be >= ${policy.minimumQualityScore} before scheduling.`);
  }

  const scheduled = {
    ...candidate,
    status: "scheduled",
    scheduledAt,
    publishedAt: null,
    updatedAt: new Date().toISOString()
  };

  dailyStore.items = dailyStore.items.filter((item) => item.id !== scheduled.id);
  dailyStore.items.push(scheduled);
  candidateStore.items = candidateStore.items.map((item) =>
    item.id === scheduled.id ? { ...item, status: "scheduled", scheduledAt, updatedAt: scheduled.updatedAt } : item
  );

  await writeStore(DAILY_PATH, dailyStore);
  await writeStore(CANDIDATES_PATH, candidateStore);

  if (args["sync-db"]) {
    await run("node", ["--env-file=.env.local", "scripts/db-sync-puzzles.js"]);
  }

  console.log(`Scheduled ${scheduled.id} ${scheduled.answer} at ${scheduledAt}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
