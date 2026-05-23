export function logRouteError(scope: string, error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error
      ? JSON.stringify(error)
      : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[${scope}] ${message}`, stack ? { stack } : undefined);
}
