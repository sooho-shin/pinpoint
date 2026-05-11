#!/usr/bin/env node
import fs from "node:fs/promises";

const COMPONENTS_PATH = "design/components.json";
const SCREENS_PATH = "design/screens.json";
const DEFAULT_REPORT_PATH = "reports/figma-composition-report.json";
const REQUIRED_COMPOSITION_CHECKS = [
  "screen_exists",
  "required_instances_present",
  "no_direct_drawn_ui"
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function addIssue(issues, code, detail) {
  issues.push({ code, detail });
}

function normalizeName(name) {
  return String(name || "").replace(/\s+/g, "").toLowerCase();
}

function includesInstance(actualInstances, expectedName) {
  const expected = normalizeName(expectedName);
  return actualInstances.some((instance) => {
    const names = [
      instance.name,
      instance.mainComponentName,
      instance.componentName,
      instance.sourceName
    ].map(normalizeName);
    return names.some((name) => name === expected || name.endsWith(expected) || expected.endsWith(name));
  });
}

function validateContracts(components, screens, issues) {
  const contracts = components.compositionContracts;
  if (!contracts) {
    addIssue(issues, "missing_composition_contracts", COMPONENTS_PATH);
    return;
  }

  const rules = contracts.rules || {};
  for (const rule of [
    "moleculesMustUseAtomInstances",
    "organismsMustUseMoleculeOrAtomInstances",
    "templatesMustUseOrganismInstances",
    "screensMustUseTemplateOrOrganismInstances",
    "forbidDirectDrawnUiInHigherLevels"
  ]) {
    if (rules[rule] !== true) addIssue(issues, "missing_composition_rule", rule);
  }

  if (!Array.isArray(contracts.directDrawnUiNamePatterns) || contracts.directDrawnUiNamePatterns.length === 0) {
    addIssue(issues, "missing_direct_drawn_ui_patterns", COMPONENTS_PATH);
  }

  const componentContracts = contracts.components || {};
  for (const componentName of [
    "Molecules/GuessInputGroup",
    "Organisms/NicknamePanel",
    "Organisms/SignInPanel",
    "Organisms/LeaderboardPanel",
    "Templates/AuthTemplate",
    "Templates/DailyPuzzleTemplate",
    "Templates/RankingTemplate"
  ]) {
    if (!componentContracts[componentName]) {
      addIssue(issues, "missing_component_composition_contract", componentName);
    }
  }

  for (const [componentName, contract] of Object.entries(componentContracts)) {
    if (!["molecule", "organism", "template"].includes(contract.layer)) {
      addIssue(issues, "invalid_component_contract_layer", componentName);
    }
    if (!Array.isArray(contract.mustUseInstances)) {
      addIssue(issues, "component_contract_missing_must_use_instances", componentName);
    }
  }

  for (const screen of screens.screens || []) {
    const checks = screen.compositionChecks || [];
    for (const check of REQUIRED_COMPOSITION_CHECKS) {
      if (!checks.includes(check)) addIssue(issues, "missing_screen_composition_check", `${screen.name}.${check}`);
    }
    if (!Array.isArray(screen.requiredInstances) || screen.requiredInstances.length === 0) {
      addIssue(issues, "screen_missing_required_instances", screen.name);
    }
  }
}

function validateReport(report, components, screens, issues) {
  if (report.version !== 1) addIssue(issues, "invalid_report_version", String(report.version));
  if (!report.fileKey) addIssue(issues, "missing_report_file_key", DEFAULT_REPORT_PATH);
  if (!report.ranAt) addIssue(issues, "missing_report_ran_at", DEFAULT_REPORT_PATH);

  for (const issue of report.issues || []) {
    addIssue(issues, "reported_composition_issue", typeof issue === "string" ? issue : JSON.stringify(issue));
  }

  const pageMap = new Map((report.pages || []).map((page) => [page.name, page]));
  for (const pageName of ["02 Screens", "03 Admin"]) {
    const page = pageMap.get(pageName);
    if (!page) {
      addIssue(issues, "page_missing_from_composition_report", pageName);
    } else if (Number(page.childCount || 0) === 0) {
      addIssue(issues, "figma_page_empty", pageName);
    }
  }

  const reportedScreens = new Map((report.screens || []).map((screen) => [screen.name, screen]));
  for (const screen of screens.screens || []) {
    const reported = reportedScreens.get(screen.name);
    if (!reported) {
      addIssue(issues, "screen_missing_from_composition_report", screen.name);
      continue;
    }
    if (reported.exists === false) addIssue(issues, "screen_reported_missing", screen.name);
    const actualInstances = reported.instances || [];
    for (const expected of screen.requiredInstances || []) {
      if (!includesInstance(actualInstances, expected)) {
        addIssue(issues, "screen_missing_required_instance", `${screen.name}: ${expected}`);
      }
    }
    if ((reported.directDrawnLikelyUi || []).length > 0) {
      addIssue(issues, "screen_has_direct_drawn_ui", `${screen.name}: ${reported.directDrawnLikelyUi.map((node) => node.name).join(", ")}`);
    }
  }

  const componentReports = new Map((report.components || []).map((component) => [component.name, component]));
  for (const [componentName, contract] of Object.entries(components.compositionContracts?.components || {})) {
    const reported = componentReports.get(componentName);
    if (!reported) {
      addIssue(issues, "component_missing_from_composition_report", componentName);
      continue;
    }

    const actualInstances = reported.instances || [];
    for (const expected of contract.mustUseInstances || []) {
      if (!includesInstance(actualInstances, expected)) {
        addIssue(issues, "component_missing_required_instance", `${componentName}: ${expected}`);
      }
    }

    if (contract.layer !== "molecule" && (reported.directDrawnLikelyUi || []).length > 0) {
      addIssue(issues, "component_has_direct_drawn_ui", `${componentName}: ${reported.directDrawnLikelyUi.map((node) => node.name).join(", ")}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const contractOnly = Boolean(args["contract-only"]);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const components = await readJson(COMPONENTS_PATH);
  const screens = await readJson(SCREENS_PATH);
  const issues = [];

  validateContracts(components, screens, issues);

  if (!contractOnly) {
    let report;
    try {
      report = await readJson(reportPath);
    } catch (error) {
      addIssue(issues, "missing_figma_composition_report", reportPath);
      report = null;
    }
    if (report) validateReport(report, components, screens, issues);
  }

  if (issues.length > 0) {
    console.error(`Figma composition validation failed: ${issues.length} issue(s).`);
    for (const issue of issues) console.error(`  - ${issue.code}: ${issue.detail}`);
    process.exit(1);
  }

  console.log(contractOnly ? "Figma composition contract validation passed." : `Figma composition report validation passed: ${reportPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
