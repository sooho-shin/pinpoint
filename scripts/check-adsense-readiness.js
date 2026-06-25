#!/usr/bin/env node
import { runAdsenseReadiness, writeReportFiles } from "./lib/adsense-readiness.js";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

const args = parseArgs();
const report = await runAdsenseReadiness({
  baseUrl: args["base-url"],
  configPath: args.config,
  baselinePath: args.baseline,
  customGameSlug: args["custom-game-slug"]
});
const output = await writeReportFiles(report, {
  jsonReportPath: args["report-json"],
  markdownReportPath: args["report-md"]
});

console.log(`AdSense readiness verdict: ${report.summary.verdict}`);
console.log(`Site score: ${report.summary.siteScore}`);
console.log(`JSON report: ${output.jsonPath}`);
console.log(`Markdown report: ${output.markdownPath}`);

if (args.ci && report.summary.verdict === "review-not-ready") {
  process.exitCode = 1;
}
