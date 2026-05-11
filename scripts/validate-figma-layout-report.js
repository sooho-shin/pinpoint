#!/usr/bin/env node
import fs from "node:fs/promises";

const COMPONENTS_PATH = "design/components.json";
const SCREENS_PATH = "design/screens.json";
const DEFAULT_REPORT_PATH = "reports/figma-layout-report.json";
const REQUIRED_LAYOUT_CHECKS = [
  "screen_exists",
  "no_child_overflow",
  "no_panel_control_overflow",
  "no_text_overlap"
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

function validateContracts(components, screens, issues) {
  const mobile = components.layoutContracts?.mobile;
  if (!mobile) addIssue(issues, "missing_mobile_layout_contract", COMPONENTS_PATH);
  if (mobile && mobile.panelWidth - mobile.panelPaddingX * 2 !== mobile.panelContentWidth) {
    addIssue(
      issues,
      "invalid_mobile_panel_content_width",
      `expected panelWidth - panelPaddingX * 2 to equal panelContentWidth in ${COMPONENTS_PATH}`
    );
  }

  for (const componentName of ["TextInput", "Button", "GoogleSignInButton"]) {
    const contract = components.layoutContracts?.atoms?.[componentName];
    if (!contract) {
      addIssue(issues, "missing_atom_layout_contract", componentName);
      continue;
    }
    if (contract.width !== "fill-parent-content") {
      addIssue(issues, "atom_width_must_fill_parent_content", componentName);
    }
    if (contract.mustStayInsideParentContentBounds !== true) {
      addIssue(issues, "atom_missing_containment_requirement", componentName);
    }
    if (contract.mustStayInsideParentBounds !== true) {
      addIssue(issues, "atom_missing_parent_bounds_requirement", componentName);
    }
  }

  const guessInputGroup = components.layoutContracts?.molecules?.GuessInputGroup;
  if (!guessInputGroup) {
    addIssue(issues, "missing_molecule_layout_contract", "GuessInputGroup");
  } else {
    if (!Number.isFinite(Number(guessInputGroup.minHeight)) || Number(guessInputGroup.minHeight) < 160) {
      addIssue(issues, "guess_input_group_min_height_too_small", "GuessInputGroup");
    }
    for (const control of ["Atoms/TextInput", "Atoms/Button/Primary"]) {
      if (!guessInputGroup.containedControls?.includes(control)) {
        addIssue(issues, "guess_input_group_missing_contained_control", control);
      }
    }
  }

  for (const [componentName, expected] of Object.entries({
    ShareActionGroup: { slotCount: 2, width: 278 },
    LeaderboardTabs: { slotCount: 2, width: 278 }
  })) {
    const contract = components.layoutContracts?.molecules?.[componentName];
    if (!contract) {
      addIssue(issues, "missing_molecule_layout_contract", componentName);
      continue;
    }
    if (Number(contract.width) !== expected.width) {
      addIssue(issues, "action_group_width_mismatch", componentName);
    }
    if (Number(contract.slotCount) !== expected.slotCount || !Number.isFinite(Number(contract.slotWidth))) {
      addIssue(issues, "invalid_action_group_slots", componentName);
    }
    const totalWidth = Number(contract.slotWidth) * Number(contract.slotCount) + Number(contract.gap || 0) * (Number(contract.slotCount) - 1);
    if (totalWidth > Number(contract.width)) {
      addIssue(issues, "action_group_slots_overflow_contract", `${componentName}: ${totalWidth} > ${contract.width}`);
    }
  }

  const rankingRow = components.layoutContracts?.molecules?.RankingRow;
  if (!rankingRow) {
    addIssue(issues, "missing_molecule_layout_contract", "RankingRow");
  } else {
    if (Number(rankingRow.width) !== 278 || Number(rankingRow.height) !== 64) {
      addIssue(issues, "ranking_row_size_mismatch", "RankingRow");
    }
    if (!Number.isFinite(Number(rankingRow.badgeMaxWidth)) || Number(rankingRow.badgeMaxWidth) > 92) {
      addIssue(issues, "ranking_row_badge_max_width_too_large", "RankingRow");
    }
  }

  const puzzleBoard = components.layoutContracts?.organisms?.PuzzleBoard;
  if (!puzzleBoard) {
    addIssue(issues, "missing_organism_layout_contract", "PuzzleBoard");
  } else {
    if (!Number.isFinite(Number(puzzleBoard.minHeight)) || Number(puzzleBoard.minHeight) < 590) {
      addIssue(issues, "puzzle_board_min_height_too_small", "PuzzleBoard");
    }
    if (!puzzleBoard.containedControls?.includes("Molecules/GuessInputGroup")) {
      addIssue(issues, "puzzle_board_missing_guess_input_group_containment", "PuzzleBoard");
    }
  }

  const nicknamePanel = components.layoutContracts?.organisms?.NicknamePanel;
  if (!nicknamePanel) {
    addIssue(issues, "missing_organism_layout_contract", "NicknamePanel");
  } else {
    if (nicknamePanel.surfaceWidth - nicknamePanel.contentPaddingX * 2 !== nicknamePanel.contentWidth) {
      addIssue(issues, "invalid_nickname_panel_content_width", "NicknamePanel");
    }
    if (!Number.isFinite(Number(nicknamePanel.minHeight)) || Number(nicknamePanel.minHeight) < 406) {
      addIssue(issues, "nickname_panel_min_height_too_small", "NicknamePanel");
    }
    if (!Number.isFinite(Number(nicknamePanel.contentPaddingTop)) || Number(nicknamePanel.contentPaddingTop) < 30) {
      addIssue(issues, "nickname_panel_top_padding_too_small", "NicknamePanel");
    }
    if (!Number.isFinite(Number(nicknamePanel.contentPaddingBottom)) || Number(nicknamePanel.contentPaddingBottom) < 24) {
      addIssue(issues, "nickname_panel_bottom_padding_too_small", "NicknamePanel");
    }
    for (const control of ["Atoms/TextInput", "Atoms/Button/Primary"]) {
      if (!nicknamePanel.containedControls?.includes(control)) {
        addIssue(issues, "nickname_panel_missing_contained_control", control);
      }
    }
  }

  const leaderboardPanel = components.layoutContracts?.organisms?.LeaderboardPanel;
  if (!leaderboardPanel) {
    addIssue(issues, "missing_organism_layout_contract", "LeaderboardPanel");
  } else {
    if (leaderboardPanel.surfaceWidth - leaderboardPanel.contentPaddingX * 2 !== leaderboardPanel.contentWidth) {
      addIssue(issues, "invalid_leaderboard_panel_content_width", "LeaderboardPanel");
    }
    const visibleRowCount = Number(leaderboardPanel.visibleRowCount);
    const rowHeight = Number(leaderboardPanel.rowHeight);
    const rowGap = Number(leaderboardPanel.rowGap);
    const tabsHeight = Number(leaderboardPanel.tabsHeight);
    const tabsToRowsGap = Number(leaderboardPanel.tabsToRowsGap);
    const bottomPadding = Number(leaderboardPanel.contentPaddingBottom);
    const minHeight = Number(leaderboardPanel.minHeight);
    const requiredListHeight = tabsHeight + tabsToRowsGap + visibleRowCount * rowHeight + Math.max(0, visibleRowCount - 1) * rowGap + bottomPadding;
    if ([visibleRowCount, rowHeight, rowGap, tabsHeight, tabsToRowsGap, bottomPadding, minHeight].some((value) => !Number.isFinite(value))) {
      addIssue(issues, "invalid_leaderboard_panel_geometry_contract", "LeaderboardPanel");
    } else {
      if (visibleRowCount < 5) addIssue(issues, "leaderboard_panel_visible_rows_too_small", "LeaderboardPanel");
      if (bottomPadding < 24) addIssue(issues, "leaderboard_panel_bottom_padding_too_small", "LeaderboardPanel");
      if (minHeight < 544) addIssue(issues, "leaderboard_panel_min_height_too_small", "LeaderboardPanel");
      if (minHeight < requiredListHeight + 100) {
        addIssue(
          issues,
          "leaderboard_panel_cannot_fit_rows",
          `minHeight ${minHeight} must fit heading plus rows; row block requires ${requiredListHeight}`
        );
      }
    }
  }

  if (!Array.isArray(screens.screens) || screens.screens.length === 0) {
    addIssue(issues, "missing_screens", SCREENS_PATH);
    return;
  }

  for (const screen of screens.screens) {
    const checks = screen.layoutChecks || [];
    for (const checkName of REQUIRED_LAYOUT_CHECKS) {
      if (!checks.includes(checkName)) {
        addIssue(issues, "missing_screen_layout_check", `${screen.name}.${checkName}`);
      }
    }

    if (screen.viewport === "mobile") {
      const layout = screen.layout || {};
      for (const [key, expected] of Object.entries(screens.sharedLayout?.mobile || {})) {
        if (key === "requiredChecks" || key === "authRhythm") continue;
        if (layout[key] !== expected) {
          addIssue(issues, "mobile_screen_layout_mismatch", `${screen.name}.${key}`);
        }
      }
    }

    if (["Sign In", "Nickname Setup"].includes(screen.name)) {
      const checks = screen.layoutChecks || [];
      for (const checkName of ["auth_header_not_duplicated", "auth_panel_spacing"]) {
        if (!checks.includes(checkName)) addIssue(issues, "missing_auth_screen_layout_check", `${screen.name}.${checkName}`);
      }
    }
  }
}

function paddingValue(padding, key) {
  if (typeof padding === "number") return padding;
  if (!padding || typeof padding !== "object") return 0;
  return Number(padding[key] ?? 0);
}

function validateContainmentCheck(check, issues) {
  if (check.pass === false) {
    addIssue(issues, "reported_containment_failure", check.name || check.id || "(unnamed)");
  }

  if (check.semanticPass === false) {
    addIssue(issues, "reported_semantic_layout_failure", check.name || check.id || "(unnamed)");
  }

  if (!check.node || !check.container) return;

  const tolerance = Number(check.tolerance ?? 0.5);
  const node = check.node;
  const container = check.container;
  const left = Number(container.x) + paddingValue(check.padding, "left");
  const top = Number(container.y) + paddingValue(check.padding, "top");
  const right = Number(container.x) + Number(container.width) - paddingValue(check.padding, "right");
  const bottom = Number(container.y) + Number(container.height) - paddingValue(check.padding, "bottom");
  const nodeLeft = Number(node.x);
  const nodeTop = Number(node.y);
  const nodeRight = Number(node.x) + Number(node.width);
  const nodeBottom = Number(node.y) + Number(node.height);

  if ([left, top, right, bottom, nodeLeft, nodeTop, nodeRight, nodeBottom].some((value) => !Number.isFinite(value))) {
    addIssue(issues, "invalid_containment_geometry", check.name || check.id || "(unnamed)");
    return;
  }

  if (nodeLeft < left - tolerance || nodeTop < top - tolerance || nodeRight > right + tolerance || nodeBottom > bottom + tolerance) {
    addIssue(
      issues,
      "node_overflows_container",
      `${check.name || check.id || "(unnamed)"}: node ${nodeLeft},${nodeTop},${nodeRight},${nodeBottom} outside container ${left},${top},${right},${bottom}`
    );
  }
}

async function validateReport(reportPath, expectedScreens, issues) {
  let report;
  try {
    report = await readJson(reportPath);
  } catch (error) {
    addIssue(issues, "missing_figma_layout_report", reportPath);
    return;
  }

  if (report.version !== 1) addIssue(issues, "invalid_report_version", String(report.version));
  if (!report.fileKey) addIssue(issues, "missing_report_file_key", reportPath);
  if (!report.ranAt) addIssue(issues, "missing_report_ran_at", reportPath);

  for (const issue of report.issues || []) {
    addIssue(issues, "reported_layout_issue", typeof issue === "string" ? issue : JSON.stringify(issue));
  }

  const reportedScreens = new Set((report.screens || []).map((screen) => screen.name));
  for (const screen of expectedScreens) {
    if (!reportedScreens.has(screen.name)) {
      addIssue(issues, "screen_missing_from_layout_report", screen.name);
    }
  }

  if (!Array.isArray(report.containmentChecks) || report.containmentChecks.length === 0) {
    addIssue(issues, "missing_containment_checks", reportPath);
    return;
  }

  for (const check of report.containmentChecks) validateContainmentCheck(check, issues);
}

async function main() {
  const args = parseArgs();
  const contractOnly = Boolean(args["contract-only"]);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const components = await readJson(COMPONENTS_PATH);
  const screens = await readJson(SCREENS_PATH);
  const issues = [];

  validateContracts(components, screens, issues);
  if (!contractOnly) await validateReport(reportPath, screens.screens || [], issues);

  if (issues.length > 0) {
    console.error(`Figma layout validation failed: ${issues.length} issue(s).`);
    for (const issue of issues) console.error(`  - ${issue.code}: ${issue.detail}`);
    process.exit(1);
  }

  console.log(contractOnly ? "Figma layout contract validation passed." : `Figma layout report validation passed: ${reportPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
