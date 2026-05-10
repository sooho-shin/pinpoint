#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

function run(command, commandArgs) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe"
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

async function main() {
  const beforeCandidates = await fs.readFile("data/puzzle-candidates.ko.json", "utf8");
  const valid = await run("node", [
    "scripts/run-puzzle-harness.js",
    "--input",
    "fixtures/valid-candidates.json",
    "--dry-run",
    "--report",
    "reports/test-valid-report.json"
  ]);
  if (valid.code !== 0) {
    console.error("Expected valid fixture to pass.");
    console.error(valid.output);
    process.exit(1);
  }

  const invalid = await run("node", [
    "scripts/run-puzzle-harness.js",
    "--input",
    "fixtures/invalid-candidates.json",
    "--dry-run",
    "--report",
    "reports/test-invalid-report.json"
  ]);
  if (invalid.code === 0) {
    console.error("Expected invalid fixture to fail.");
    console.error(invalid.output);
    process.exit(1);
  }

  const invalidSave = await run("node", [
    "scripts/run-puzzle-harness.js",
    "--input",
    "fixtures/invalid-candidates.json",
    "--report",
    "reports/test-invalid-save-report.json"
  ]);
  if (invalidSave.code === 0) {
    console.error("Expected invalid save attempt to fail.");
    console.error(invalidSave.output);
    process.exit(1);
  }
  const afterCandidates = await fs.readFile("data/puzzle-candidates.ko.json", "utf8");
  if (afterCandidates !== beforeCandidates) {
    console.error("Invalid save attempt changed data/puzzle-candidates.ko.json.");
    process.exit(1);
  }

  console.log("Puzzle harness fixtures passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
