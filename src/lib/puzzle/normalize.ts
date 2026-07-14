export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, "")
    .replace(/[.,!?'"`~\-_/\\()[\]{}:;·•]/g, "");
}

const HANGUL_INITIALS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ"
];

export function hangulInitials(value: string) {
  const initials = Array.from(normalizeAnswer(value), (char) => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return char;
    return HANGUL_INITIALS[Math.floor((code - 0xac00) / 588)];
  }).join("");
  return normalizeAnswer(initials);
}

export function isAnswerSpoilerMessage(message: string, acceptedAnswers: string[]) {
  const normalizedMessage = normalizeAnswer(message);
  const forbiddenTerms = acceptedAnswers
    .flatMap((term) => [normalizeAnswer(term), hangulInitials(term)])
    .filter((term) => term.length >= 2);

  return forbiddenTerms.some((term) => normalizedMessage.includes(term));
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
    }

    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

export function answerSimilarity(a: string, b: string) {
  const left = normalizeAnswer(a);
  const right = normalizeAnswer(b);
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(left, right) / maxLength;
}

export function isAcceptedAnswer(guess: string, acceptedAnswers: string[]) {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAccepted = acceptedAnswers.map(normalizeAnswer).filter(Boolean);

  if (normalizedAccepted.includes(normalizedGuess)) return true;
  if (normalizedGuess.length >= 2) {
    const hasCoreTermMatch = normalizedAccepted.some((answer) => {
      if (answer.length < 3) return false;
      if (answer.startsWith(normalizedGuess)) {
        return normalizedGuess.length / answer.length >= 0.5;
      }
      return normalizedGuess.length >= 3 && answer.includes(normalizedGuess);
    });
    if (hasCoreTermMatch) return true;
  }

  if (normalizedGuess.length < 5) return false;

  return normalizedAccepted.some((answer) => {
    if (answer.length < 5) return false;
    return answerSimilarity(normalizedGuess, answer) >= 0.95;
  });
}

export function isValidNickname(value: string) {
  const trimmed = value.trim();
  return /^[0-9A-Za-z가-힣]{2,12}$/.test(trimmed);
}
