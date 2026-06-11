import { isValidNickname, normalizeAnswer } from "@/lib/puzzle/normalize";

const FORBIDDEN_TERMS = [
  "씨발",
  "시발",
  "병신",
  "개새끼",
  "좆",
  "ㅅㅂ",
  "ㅂㅅ"
];

export function containsForbiddenTerm(value: string) {
  const normalized = normalizeAnswer(value);
  return FORBIDDEN_TERMS.some((term) => normalized.includes(normalizeAnswer(term)));
}

export function validatePublicNickname(value: string) {
  const nickname = value.trim();
  if (!isValidNickname(nickname)) {
    return { ok: false as const, error: "닉네임은 2~12자의 한글, 영문, 숫자로 입력해 주세요." };
  }
  if (containsForbiddenTerm(nickname)) {
    return { ok: false as const, error: "사용할 수 없는 닉네임입니다." };
  }
  return { ok: true as const, nickname };
}

export function validateCustomGameInput(input: { answer: string; clues: string[] }) {
  const answer = input.answer.trim();
  const clues = input.clues.map((clue) => clue.trim());
  if (answer.length < 1 || answer.length > 40) {
    return { ok: false as const, error: "정답은 1~40자로 입력해 주세요." };
  }
  if (containsForbiddenTerm(answer)) {
    return { ok: false as const, error: "정답에 사용할 수 없는 표현이 있습니다." };
  }
  if (clues.length !== 5 || clues.some((clue) => clue.length < 1 || clue.length > 30)) {
    return { ok: false as const, error: "단서는 5개를 각각 1~30자로 입력해 주세요." };
  }
  if (clues.some(containsForbiddenTerm)) {
    return { ok: false as const, error: "단서에 사용할 수 없는 표현이 있습니다." };
  }

  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedClues = clues.map(normalizeAnswer);
  if (new Set(normalizedClues).size !== normalizedClues.length) {
    return { ok: false as const, error: "중복된 단서는 사용할 수 없습니다." };
  }
  if (normalizedAnswer.length >= 1 && normalizedClues.some((clue) => clue.includes(normalizedAnswer))) {
    return { ok: false as const, error: "단서에는 정답을 그대로 넣을 수 없습니다." };
  }

  return { ok: true as const, answer, clues };
}
