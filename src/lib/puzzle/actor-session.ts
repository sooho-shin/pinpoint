export function ensureAnonymousSessionId(existing?: string) {
  return existing && existing.length >= 16 ? existing : crypto.randomUUID();
}
