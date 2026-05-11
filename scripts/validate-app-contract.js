#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const CONTRACT_PATH = "schema/app-contract.json";
const DB_CONTRACT_PATH = "schema/database-contract.json";
const SCREENS_PATH = "design/screens.json";
const COMPONENTS_PATH = "design/components.json";
const TOKENS_PATH = "design/tokens.json";
const GLOBALS_CSS_PATH = "src/app/globals.css";

const REQUIRED_PRINCIPLES = [
  "figma_atomic_design_is_source_of_truth",
  "figma_tokens_are_source_of_truth",
  "pages_use_template_components",
  "server_authoritative_clue_progression",
  "server_authoritative_answer_checking",
  "daily_publication_has_user_scoped_attempts",
  "do_not_expose_answer_before_terminal_result",
  "do_not_expose_locked_clues",
  "do_not_read_puzzles_directly_from_browser_supabase_client",
  "authenticated_play_required",
  "signup_nickname_required",
  "ranking_requires_authenticated_profile",
  "email_is_never_public",
  "service_role_key_is_server_only"
];

const REQUIRED_PAGES = [
  "/",
  "/result",
  "/ranking",
  "/signin",
  "/nickname"
];

const REQUIRED_ROUTE_HANDLERS = [
  "GET /auth/callback",
  "GET /api/today",
  "POST /api/attempts/start",
  "POST /api/attempts/reveal",
  "POST /api/attempts/submit",
  "GET /api/leaderboard/daily",
  "GET /api/winner-message/current",
  "POST /api/winner-message"
];

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const FORBIDDEN_PUBLIC_RESPONSE_FIELDS = [
  "email",
  "answer",
  "aliases",
  "rationale",
  "submitted_answer",
  "normalized_answer",
  "device_hash",
  "ip_hash",
  "user_agent_hash"
];

const EXPECTED_RANKING_ORDER = [
  "used_clue_count:asc",
  "elapsed_ms:asc",
  "submitted_at:asc"
];

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function addIssue(issues, code, detail) {
  issues.push({ code, detail });
}

function routeKey(route) {
  return `${route.method} ${route.path}`;
}

function orderKey(item) {
  return `${item.column}:${item.direction}`;
}

function kebabCase(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function componentFileFor(layer, componentName) {
  const normalized = componentName.split("/")[0];
  return `src/components/${layer}/${normalized}.tsx`;
}

function validateStack(contract, issues) {
  const stack = contract.stack || {};
  const expected = {
    framework: "nextjs-app-router",
    language: "typescript",
    backend: "nextjs-route-handlers",
    database: "supabase-postgres",
    auth: "supabase-google-oauth",
    supabaseSsrPackage: "@supabase/ssr"
  };

  for (const [key, value] of Object.entries(expected)) {
    if (stack[key] !== value) {
      addIssue(issues, "stack_value_mismatch", `${key}: expected ${value}`);
    }
  }
}

function validatePrinciples(contract, issues) {
  const principles = contract.principles || [];
  for (const principle of REQUIRED_PRINCIPLES) {
    if (!principles.includes(principle)) {
      addIssue(issues, "missing_principle", principle);
    }
  }
}

function validatePages(contract, screens, issues) {
  const pages = contract.frontend?.pages || [];
  const pagePaths = new Set(pages.map((page) => page.path));
  for (const pagePath of REQUIRED_PAGES) {
    if (!pagePaths.has(pagePath)) {
      addIssue(issues, "missing_page", pagePath);
    }
  }

  const designScreens = new Set((screens.screens || []).map((screen) => screen.name));
  for (const page of pages) {
    if (!page.file?.startsWith("src/app/")) {
      addIssue(issues, "page_file_outside_app_router", `${page.name}: ${page.file}`);
    }

    const requiredScreens = [
      ...(page.designScreen ? [page.designScreen] : []),
      ...(page.designScreens || [])
    ];
    for (const screenName of requiredScreens) {
      if (!designScreens.has(screenName)) {
        addIssue(issues, "page_references_missing_design_screen", `${page.name}: ${screenName}`);
      }
    }
  }
}

function validateFigmaParityContract(contract, components, tokens, issues) {
  const layers = contract.frontend?.componentLayers || {};
  for (const layer of ["atoms", "molecules", "organisms", "templates"]) {
    const expected = components[layer] || [];
    const actual = layers[layer] || [];
    for (const componentName of expected) {
      if (!actual.includes(componentName)) {
        addIssue(issues, "component_layer_missing_figma_component", `${layer}.${componentName}`);
      }
    }
  }

  const parity = contract.frontend?.figmaParity;
  if (!parity) {
    addIssue(issues, "missing_figma_parity_contract", "frontend.figmaParity");
    return;
  }

  for (const sourceFile of [COMPONENTS_PATH, SCREENS_PATH, TOKENS_PATH]) {
    if (!parity.sourceFiles?.includes(sourceFile)) {
      addIssue(issues, "missing_figma_parity_source_file", sourceFile);
    }
  }

  if (parity.componentRoot !== "src/components") {
    addIssue(issues, "invalid_component_root", "frontend.figmaParity.componentRoot");
  }
  if (parity.globalsCss !== GLOBALS_CSS_PATH) {
    addIssue(issues, "invalid_globals_css_path", "frontend.figmaParity.globalsCss");
  }
  if (parity.requiredCssVariablesFromTokens !== true) {
    addIssue(issues, "css_variables_from_tokens_not_required", "frontend.figmaParity.requiredCssVariablesFromTokens");
  }
  if (parity.pagesMustUseTemplates !== true) {
    addIssue(issues, "pages_must_use_templates_not_required", "frontend.figmaParity.pagesMustUseTemplates");
  }

  const layoutNumbers = parity.layoutNumbers || {};
  const mobile = components.layoutContracts?.mobile || {};
  const atoms = components.layoutContracts?.atoms || {};
  const rankingRow = components.layoutContracts?.molecules?.RankingRow || {};
  const expectedNumbers = {
    mobileFrameWidth: mobile.frameWidth,
    screenPaddingX: mobile.screenPaddingX,
    panelWidth: mobile.panelWidth,
    panelPaddingX: mobile.panelPaddingX,
    panelContentWidth: mobile.panelContentWidth,
    buttonHeight: atoms.Button?.height,
    textInputHeight: atoms.TextInput?.height,
    rankingRowHeight: rankingRow.height
  };
  for (const [key, expected] of Object.entries(expectedNumbers)) {
    if (Number(layoutNumbers[key]) !== Number(expected)) {
      addIssue(issues, "figma_layout_number_mismatch", `${key}: expected ${expected}`);
    }
  }

  if (!tokens.color || Object.keys(tokens.color).length === 0) {
    addIssue(issues, "missing_design_color_tokens", TOKENS_PATH);
  }
}

function validateRouteHandlers(contract, issues) {
  const routes = contract.backend?.routeHandlers || [];
  const keys = new Set(routes.map(routeKey));
  for (const required of REQUIRED_ROUTE_HANDLERS) {
    if (!keys.has(required)) {
      addIssue(issues, "missing_route_handler", required);
    }
  }

  for (const route of routes) {
    if (!route.file?.startsWith("src/app/") || !route.file.endsWith("/route.ts")) {
      addIssue(issues, "route_handler_file_mismatch", `${routeKey(route)} -> ${route.file}`);
    }

    if (["/api/today", "/api/attempts/reveal"].includes(route.path)) {
      for (const field of ["answer", "aliases", "locked_clues"]) {
        if (!route.mustNotExpose?.includes(field)) {
          addIssue(issues, "route_missing_puzzle_secrecy_field", `${routeKey(route)}.${field}`);
        }
      }
    }

    if (route.path === "/api/leaderboard/daily") {
      for (const field of ["email", "submitted_answer", "normalized_answer", "device_hash", "ip_hash", "user_agent_hash"]) {
        if (!route.mustNotExpose?.includes(field)) {
          addIssue(issues, "leaderboard_route_missing_forbidden_field", field);
        }
      }

      const order = (route.order || []).map(orderKey);
      if (order.join(",") !== EXPECTED_RANKING_ORDER.join(",")) {
        addIssue(issues, "leaderboard_route_order_mismatch", EXPECTED_RANKING_ORDER.join(" -> "));
      }
    }

    if (route.path === "/api/winner-message" && Number(route.maxMessageLength) !== 100) {
      addIssue(issues, "winner_message_length_mismatch", "POST /api/winner-message");
    }
  }

  const requiredAuthRoutes = new Set([
    "/api/today",
    "/api/attempts/start",
    "/api/attempts/reveal",
    "/api/attempts/submit",
    "/api/leaderboard/daily"
  ]);
  for (const route of routes) {
    if (requiredAuthRoutes.has(route.path) && route.auth !== "required") {
      addIssue(issues, "route_auth_must_be_required", routeKey(route));
    }
  }
}

function validateAuthPolicy(contract, dbContract, issues) {
  const pages = contract.frontend?.pages || [];
  for (const page of pages) {
    if (["/", "/result", "/ranking"].includes(page.path) && page.auth !== "required") {
      addIssue(issues, "page_auth_must_be_required", page.path);
    }
  }

  if (dbContract.apiRequirements?.anonymousPlayAllowed !== false) {
    addIssue(issues, "database_contract_allows_anonymous_play", "apiRequirements.anonymousPlayAllowed");
  }
}

function validatePlayModel(contract, dbContract, issues) {
  const model = contract.backend?.playModel || {};
  const dbRequirements = dbContract.apiRequirements || {};
  const expected = {
    dailyPublicationScope: "one_published_puzzle_per_kst_date",
    attemptScope: "publication_id+user_id",
    allAuthenticatedUsersCanPlaySamePublication: true,
    leaderboardDoesNotLockPlay: true,
    winnerDoesNotLockPlay: true
  };

  for (const [key, value] of Object.entries(expected)) {
    if (model[key] !== value) {
      addIssue(issues, "app_play_model_mismatch", `${key}: expected ${value}`);
    }
    if (dbRequirements[key] !== value) {
      addIssue(issues, "db_play_model_mismatch", `${key}: expected ${value}`);
    }
  }

  if (model.oneRankedEntryPerUserPublication !== true) {
    addIssue(issues, "app_play_model_missing_rank_uniqueness", "oneRankedEntryPerUserPublication");
  }
}

function validatePrivacy(contract, dbContract, issues) {
  const forbidden = contract.backend?.forbiddenPublicResponseFields || [];
  for (const field of FORBIDDEN_PUBLIC_RESPONSE_FIELDS) {
    if (!forbidden.includes(field)) {
      addIssue(issues, "missing_forbidden_public_response_field", field);
    }
  }

  const dbForbidden = dbContract.apiRequirements?.publicRankingMustNotExposeColumns || [];
  for (const field of dbForbidden) {
    if (!forbidden.includes(field)) {
      addIssue(issues, "db_forbidden_field_not_in_app_contract", field);
    }
  }

  const serverOnly = contract.environment?.serverOnly || [];
  if (!serverOnly.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    addIssue(issues, "service_role_key_not_server_only", "SUPABASE_SERVICE_ROLE_KEY");
  }

  const publicAllowed = contract.environment?.publicAllowed || [];
  if (publicAllowed.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    addIssue(issues, "service_role_key_publicly_allowed", "SUPABASE_SERVICE_ROLE_KEY");
  }
}

function validateEnvironment(contract, issues) {
  const required = contract.environment?.required || [];
  for (const envName of REQUIRED_ENV) {
    if (!required.includes(envName)) {
      addIssue(issues, "missing_required_env", envName);
    }
  }
}

function validateRanking(contract, dbContract, issues) {
  const appOrder = (contract.backend?.rankingOrder || []).map(orderKey);
  if (appOrder.join(",") !== EXPECTED_RANKING_ORDER.join(",")) {
    addIssue(issues, "app_ranking_order_mismatch", EXPECTED_RANKING_ORDER.join(" -> "));
  }

  const dbOrder = (dbContract.apiRequirements?.dailyRankingOrder || []).map(orderKey);
  if (dbOrder.join(",") !== appOrder.join(",")) {
    addIssue(issues, "app_db_ranking_order_mismatch", `app ${appOrder.join(",")} db ${dbOrder.join(",")}`);
  }
}

async function validateImplementation(contract, options, issues) {
  const srcAppExists = await pathExists("src/app");
  if (!srcAppExists) {
    if (options.requireImplementation) {
      addIssue(issues, "missing_app_directory", "src/app");
    }
    return { checked: false };
  }

  const expectedFiles = [
    ...(contract.frontend?.pages || []).map((page) => page.file),
    ...(contract.backend?.routeHandlers || []).map((route) => route.file)
  ];
  const layers = contract.frontend?.componentLayers || {};
  for (const layer of ["atoms", "molecules", "organisms", "templates"]) {
    for (const componentName of layers[layer] || []) {
      expectedFiles.push(componentFileFor(layer, componentName));
    }
  }

  for (const filePath of expectedFiles) {
    if (!await pathExists(filePath)) {
      addIssue(issues, "missing_implementation_file", filePath);
    }
  }

  const sourceFiles = (await listFiles("src"))
    .filter((filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath));
  const globalsCss = await fs.readFile(GLOBALS_CSS_PATH, "utf8").catch(() => "");

  for (const filePath of sourceFiles) {
    const source = await fs.readFile(filePath, "utf8");
    const isRouteHandler = filePath.endsWith("/route.ts") || filePath.endsWith("/route.js");
    const isClientComponent = source.includes("\"use client\"") || source.includes("'use client'");
    const usesBrowserSupabaseClient = source.includes("createBrowserClient");
    const isComponentFile = filePath.includes(`${path.sep}components${path.sep}`);

    if (isClientComponent && source.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      addIssue(issues, "service_role_key_used_in_client_component", filePath);
    }

    const readsPuzzlesTable = source.includes(".from(\"puzzles\")") || source.includes(".from('puzzles')");
    if (readsPuzzlesTable && (isClientComponent || usesBrowserSupabaseClient || isComponentFile)) {
      addIssue(issues, "direct_puzzles_read_from_browser_surface", filePath);
    }

    if (filePath.includes("api/leaderboard") || filePath.includes("api/today")) {
      for (const field of FORBIDDEN_PUBLIC_RESPONSE_FIELDS) {
        const quotedDouble = `"${field}"`;
        const quotedSingle = `'${field}'`;
        if (source.includes(quotedDouble) || source.includes(quotedSingle)) {
          addIssue(issues, "api_route_mentions_forbidden_response_field", `${filePath}: ${field}`);
        }
      }
    }
  }

  const pageFiles = contract.frontend?.pages || [];
  for (const page of pageFiles) {
    if (!await pathExists(page.file)) continue;
    const source = await fs.readFile(page.file, "utf8");
    if (!source.includes("@/components/templates/")) {
      addIssue(issues, "page_does_not_use_template_layer", page.file);
    }
    if (source.includes("@/components/organisms/") || source.includes("@/components/molecules/") || source.includes("@/components/atoms/")) {
      addIssue(issues, "page_imports_lower_atomic_layer_directly", page.file);
    }
  }

  const tokens = await readJson(TOKENS_PATH);
  for (const [tokenName, tokenValue] of Object.entries(tokens.color || {})) {
    const cssVar = `--${kebabCase(tokenName)}`;
    if (!globalsCss.includes(`${cssVar}: ${tokenValue}`)) {
      addIssue(issues, "css_color_token_mismatch", `${cssVar}: ${tokenValue}`);
    }
  }

  return { checked: true };
}

async function main() {
  const args = parseArgs();
  const issues = [];

  const contract = await readJson(CONTRACT_PATH);
  const dbContract = await readJson(DB_CONTRACT_PATH);
  const screens = await readJson(SCREENS_PATH);
  const components = await readJson(COMPONENTS_PATH);
  const tokens = await readJson(TOKENS_PATH);

  validateStack(contract, issues);
  validatePrinciples(contract, issues);
  validatePages(contract, screens, issues);
  validateFigmaParityContract(contract, components, tokens, issues);
  validateRouteHandlers(contract, issues);
  validateAuthPolicy(contract, dbContract, issues);
  validatePlayModel(contract, dbContract, issues);
  validatePrivacy(contract, dbContract, issues);
  validateEnvironment(contract, issues);
  validateRanking(contract, dbContract, issues);

  let implementation = { checked: false };
  if (!args["contract-only"]) {
    implementation = await validateImplementation(contract, {
      requireImplementation: Boolean(args["require-implementation"])
    }, issues);
  }

  if (issues.length > 0) {
    console.error("App contract validation failed:");
    for (const issue of issues) {
      console.error(`- ${issue.code}: ${issue.detail}`);
    }
    process.exit(1);
  }

  const mode = args["contract-only"]
    ? "contract"
    : implementation.checked
      ? "contract + implementation"
      : "contract; implementation skipped because src/app is not present";
  console.log(`App contract validation passed (${mode}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
