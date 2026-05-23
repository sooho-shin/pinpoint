const DEFAULT_PRODUCTION_ORIGIN = "https://pinpoint-seven.vercel.app";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  const candidate = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function firstPublicOrigin(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const origin = normalizeOrigin(value);
    if (origin && !isLocalOrigin(origin)) return origin;
  }

  return null;
}

export function getPublicSiteOrigin(headerStore?: Headers) {
  const canonicalOrigin = firstPublicOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  );

  if (process.env.NODE_ENV === "production") {
    if (canonicalOrigin) return canonicalOrigin;

    const forwardedOrigin = firstPublicOrigin(
      headerStore?.get("origin"),
      headerStore?.get("x-forwarded-host"),
      headerStore?.get("host")
    );

    return forwardedOrigin ?? DEFAULT_PRODUCTION_ORIGIN;
  }

  const configuredOrigin = firstPublicOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  );
  if (configuredOrigin) return configuredOrigin;

  const requestOrigin = normalizeOrigin(headerStore?.get("origin"));
  if (requestOrigin) return requestOrigin;

  const forwardedHost = headerStore?.get("x-forwarded-host");
  const forwardedProto = headerStore?.get("x-forwarded-proto") ?? "https";
  const forwardedOrigin = normalizeOrigin(forwardedHost ? `${forwardedProto}://${forwardedHost}` : null);
  if (forwardedOrigin) return forwardedOrigin;

  const host = headerStore?.get("host");
  const protocol = host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  return normalizeOrigin(host ? `${protocol}://${host}` : null) ?? "http://localhost:3000";
}
