export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, "")
    .replace(/[.,!?'"`~\-_/\\()[\]{}:;·•]/g, "");
}

export function isValidNickname(value: string) {
  const trimmed = value.trim();
  return /^[0-9A-Za-z가-힣]{2,12}$/.test(trimmed);
}
