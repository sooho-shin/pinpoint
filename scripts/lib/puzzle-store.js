import fs from "node:fs/promises";
import path from "node:path";

export const CANDIDATES_PATH = "data/puzzle-candidates.ko.json";
export const DAILY_PATH = "data/daily-puzzles.ko.json";
export const REPORT_PATH = "reports/puzzle-harness-report.json";
export const POLICY_PATH = "config/puzzle-policy.json";

export function parseArgs(argv = process.argv.slice(2)) {
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

export async function readStore(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    throw new Error(`${filePath} must be { "version": 1, "items": [] }`);
  }
  return parsed;
}

export async function readPolicy(filePath = POLICY_PATH) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    minimumQualityScore: Number(parsed.minimumQualityScore || 70),
    weakAnswers: Array.isArray(parsed.weakAnswers) ? parsed.weakAnswers : []
  };
}

export async function writeStore(filePath, store) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

export function createPuzzleId(prefix = "ko") {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${suffix}`;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

export function toCandidate(input) {
  const createdAt = nowIso();
  return {
    id: input.id || createPuzzleId(),
    answer: String(input.answer || "").trim(),
    aliases: Array.isArray(input.aliases) ? input.aliases.map(String).map((v) => v.trim()).filter(Boolean) : [],
    category: String(input.category || "미분류").trim(),
    difficulty: Number(input.difficulty || 4),
    clues: Array.isArray(input.clues) ? input.clues.map(String).map((v) => v.trim()).filter(Boolean) : [],
    rationale: String(input.rationale || "").trim(),
    status: input.status || "generated",
    qualityScore: input.qualityScore,
    issueFlags: Array.isArray(input.issueFlags) ? input.issueFlags : [],
    scheduledAt: input.scheduledAt || null,
    publishedAt: input.publishedAt || null,
    createdAt: input.createdAt || createdAt,
    updatedAt: createdAt
  };
}

export function validatePuzzle(puzzle, existing = [], policy = { weakAnswers: [] }) {
  const issues = [];

  if (typeof puzzle !== "object" || puzzle === null || Array.isArray(puzzle)) {
    return ["puzzle_not_object"];
  }

  if (!puzzle.id) issues.push("missing_id");
  if (puzzle.id && !/^ko-[0-9]{14}-[a-z0-9]{5}$/.test(String(puzzle.id))) issues.push("invalid_id_format");
  if (!puzzle.answer) issues.push("missing_answer");
  if (!Array.isArray(puzzle.aliases)) issues.push("aliases_not_array");
  if (!Array.isArray(puzzle.clues)) {
    issues.push("clues_not_array");
  } else if (puzzle.clues.length !== 5) {
    issues.push("clues_must_have_5_items");
  }
  if (!puzzle.category) issues.push("missing_category");
  if (!Number.isFinite(Number(puzzle.difficulty))) issues.push("missing_difficulty");
  if (Number.isFinite(Number(puzzle.difficulty)) && (Number(puzzle.difficulty) < 1 || Number(puzzle.difficulty) > 5)) {
    issues.push("difficulty_out_of_range");
  }
  if (!["generated", "approved", "scheduled", "published", "rejected"].includes(String(puzzle.status || ""))) {
    issues.push("invalid_status");
  }
  if (!Array.isArray(puzzle.issueFlags)) issues.push("issue_flags_not_array");

  const normalizedAnswer = normalizeText(puzzle.answer);
  const normalizedClues = (puzzle.clues || []).map(normalizeText);
  const clueSet = new Set(normalizedClues);
  if (clueSet.size !== normalizedClues.length) issues.push("duplicate_clues");

  const normalizedAliases = (puzzle.aliases || []).map(normalizeText).filter(Boolean);
  const forbiddenAnswerTerms = [normalizedAnswer, ...normalizedAliases].filter(Boolean);
  for (const clue of normalizedClues) {
    if (forbiddenAnswerTerms.some((term) => clue.includes(term))) {
      issues.push("answer_appears_in_clue");
      break;
    }
  }

  const weakAnswers = policy.weakAnswers.map(normalizeText);
  if (weakAnswers.includes(normalizedAnswer)) issues.push("too_broad_or_easy_answer");

  const allAcceptedAnswers = [normalizedAnswer, ...normalizedAliases].filter(Boolean);
  const existingAcceptedAnswers = new Set(
    existing
      .filter((item) => item.id !== puzzle.id)
      .flatMap((item) => [item.answer, ...(Array.isArray(item.aliases) ? item.aliases : [])])
      .map(normalizeText)
      .filter(Boolean)
  );
  if (allAcceptedAnswers.some((answer) => existingAcceptedAnswers.has(answer))) issues.push("duplicate_answer_or_alias");

  if (new Set(allAcceptedAnswers).size !== allAcceptedAnswers.length) issues.push("duplicate_alias");

  return issues;
}

export function scorePuzzle(puzzle, existing = [], policy = { weakAnswers: [] }) {
  const issues = validatePuzzle(puzzle, existing, policy);
  let score = 100;

  score -= issues.length * 12;
  if (Number(puzzle.difficulty) < 4) score -= 15;
  if ((puzzle.aliases || []).length < 2) score -= 8;
  if (!puzzle.rationale) score -= 8;

  const clueLengths = (puzzle.clues || []).map((clue) => clue.length);
  if (clueLengths.some((length) => length > 12)) score -= 5;
  if ((puzzle.clues || []).some((clue) => /[.!?。！？]/.test(clue))) score -= 5;

  const earlyClues = (puzzle.clues || []).slice(0, 2).map(normalizeText);
  const accepted = [puzzle.answer, ...(puzzle.aliases || [])].map(normalizeText).filter(Boolean);
  if (earlyClues.some((clue) => accepted.some((answer) => answer && (clue.includes(answer) || answer.includes(clue))))) {
    score -= 20;
    issues.push("early_clue_too_direct");
  }

  return {
    qualityScore: Math.max(0, Math.min(100, score)),
    issueFlags: [...new Set(issues)]
  };
}

export function mergeUniqueById(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export function buildCandidateBatch(inputItems, existing = [], policy = { weakAnswers: [] }) {
  return inputItems.map((item) => {
    const candidate = toCandidate(item);
    return {
      ...candidate,
      ...scorePuzzle(candidate, existing, policy)
    };
  });
}
