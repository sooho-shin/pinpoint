#!/usr/bin/env node
import { CANDIDATES_PATH, DAILY_PATH, parseArgs, readPolicy, readStore, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();

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
    : candidateStore.items.find((item) => item.status === "approved" && Number(item.qualityScore || 0) >= policy.minimumQualityScore);

  if (!candidate) {
    throw new Error(id ? `Candidate not found: ${id}` : `No approved candidate with qualityScore >= ${policy.minimumQualityScore} found.`);
  }
  if (candidate.status !== "approved") {
    throw new Error(`Candidate must be approved before scheduling: ${candidate.id} is ${candidate.status}.`);
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

  console.log(`Scheduled ${scheduled.id} ${scheduled.answer} at ${scheduledAt}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
