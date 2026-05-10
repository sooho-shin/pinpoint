#!/usr/bin/env node
import { CANDIDATES_PATH, parseArgs, readStore, writeStore } from "./lib/puzzle-store.js";

const args = parseArgs();
const allowedStatuses = new Set(["approved", "rejected"]);

async function main() {
  const id = args.id ? String(args.id) : null;
  const status = args.status ? String(args.status) : null;
  const reason = args.reason ? String(args.reason) : "";

  if (!id) throw new Error("Missing required --id.");
  if (!allowedStatuses.has(status)) {
    throw new Error("Missing or invalid --status. Use approved or rejected.");
  }

  const store = await readStore(CANDIDATES_PATH);
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`Candidate not found: ${id}`);

  const reviewedAt = new Date().toISOString();
  store.items[index] = {
    ...store.items[index],
    status,
    reviewReason: reason || store.items[index].reviewReason || "",
    reviewedAt,
    updatedAt: reviewedAt
  };

  await writeStore(CANDIDATES_PATH, store);
  console.log(`${status} ${store.items[index].id} ${store.items[index].answer}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
