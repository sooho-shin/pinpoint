import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG_PATH = "config/adsense-readiness.json";
const DEFAULT_BASE_URL = "https://pinpoint-seven.vercel.app";
const DEFAULT_JSON_REPORT = "reports/adsense-readiness-report.json";
const DEFAULT_MARKDOWN_REPORT = "reports/adsense-readiness-report.md";

const VERDICTS = {
  READY: "review-ready",
  WARNING: "warning",
  NOT_READY: "review-not-ready"
};

function unique(values) {
  return [...new Set(values)];
}

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim().replace(/\/$/, "");
  const candidate = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  return new URL(candidate).origin;
}

function normalizePath(value) {
  if (!value) return "/";
  try {
    const url = value.startsWith("http://") || value.startsWith("https://") ? new URL(value) : null;
    if (url) return url.pathname || "/";
  } catch {
    return "/";
  }
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

function absoluteUrl(baseUrl, pagePath) {
  return new URL(pagePath, `${baseUrl}/`).toString();
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleTextLength(text) {
  return [...text.replace(/\s+/g, "")].length;
}

function tokenize(text) {
  const tokens = text
    .toLowerCase()
    .match(/[0-9a-z가-힣]{2,}/g);
  return tokens ?? [];
}

function uniqueContentRatio(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

function matchTag(html, regex) {
  return html.match(regex)?.[1]?.trim() ?? "";
}

function extractMeta(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameFirst = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escapedName}["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`, "i");
  const contentFirst = new RegExp(`<meta\\b(?=[^>]*content=["']([^"']+)["'])(?=[^>]*(?:name|property)=["']${escapedName}["'])[^>]*>`, "i");
  return matchTag(html, nameFirst) || matchTag(html, contentFirst);
}

function extractLinks(html, baseUrl, currentPath) {
  const links = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const url = new URL(href, absoluteUrl(baseUrl, currentPath));
      if (url.origin === baseUrl) links.push(normalizePath(url.pathname));
    } catch {
      // Ignore malformed hrefs. They are reported only when fetchable links fail.
    }
  }
  return unique(links);
}

function extractSitemapUrls(xml, baseUrl) {
  const urls = [];
  const regex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    try {
      const url = new URL(match[1]);
      if (url.origin === baseUrl) urls.push(normalizePath(url.pathname));
    } catch {
      // Ignore malformed sitemap entries.
    }
  }
  return unique(urls);
}

function isExcluded(pagePath, config) {
  for (const excluded of config.excludedPatterns ?? []) {
    const regex = new RegExp(excluded.pattern);
    if (regex.test(pagePath)) return excluded.reason;
  }
  return "";
}

function requiredPages(config, customGameSlug) {
  return (config.requiredPages ?? []).map((page) => {
    if (page.path) return { ...page, path: normalizePath(page.path), required: true };
    const slug = customGameSlug || process.env[page.slugEnv] || page.defaultSlug;
    const pagePath = String(page.pathTemplate).replace("{slug}", slug);
    return {
      ...page,
      path: normalizePath(pagePath),
      required: true,
      resolvedSlug: slug
    };
  });
}

function classifyCategory(pagePath, config, requiredLookup) {
  const required = requiredLookup.get(pagePath);
  if (required) return required.category;
  if (pagePath === "/privacy" || pagePath === "/terms") return "legal";
  if (pagePath === "/archive" || pagePath.startsWith("/archive/")) return "archive";
  if (pagePath === "/about" || pagePath === "/how-to-play") return "guide";
  if (pagePath.startsWith("/custom/") && !pagePath.startsWith("/custom/manage/")) return "custom-public-game";
  if (pagePath === "/ranking" || pagePath.endsWith("/ranking")) return "ranking";
  if (["/puzzle-strategy", "/korean-word-association", "/difficulty", "/categories", "/faq"].includes(pagePath)) return "seo-support";
  return "support";
}

async function defaultFetchText(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "user-agent": "pinpoint-adsense-readiness/1.0",
      accept: options.accept ?? "text/html,application/xhtml+xml"
    },
    redirect: "follow"
  });
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: await response.text()
  };
}

function pageIssue(severity, code, message) {
  return { severity, code, message };
}

function evaluateSeo(meta, pagePath, isRequired) {
  const issues = [];
  if (!meta.title) issues.push(pageIssue("review-not-ready", "missing_title", "Missing <title>."));
  if (!meta.description) issues.push(pageIssue("review-not-ready", "missing_description", "Missing meta description."));
  if (!meta.canonical) issues.push(pageIssue("review-not-ready", "missing_canonical", "Missing canonical URL."));
  if (isRequired && /noindex/i.test(meta.robots)) {
    issues.push(pageIssue("review-not-ready", "required_noindex", "Required public page is marked noindex."));
  }
  if (!meta.ogTitle || !meta.ogDescription) {
    issues.push(pageIssue("warning", "missing_open_graph", "Open Graph title or description is missing."));
  }
  if (meta.canonical) {
    try {
      const canonicalPath = normalizePath(new URL(meta.canonical).pathname);
      if (canonicalPath !== pagePath && !(pagePath === "/" && canonicalPath === "/")) {
        issues.push(pageIssue("warning", "canonical_path_mismatch", `Canonical points to ${canonicalPath}.`));
      }
    } catch {
      if (normalizePath(meta.canonical) !== pagePath) {
        issues.push(pageIssue("warning", "canonical_path_mismatch", `Canonical points to ${meta.canonical}.`));
      }
    }
  }
  return issues;
}

function evaluateRisks(text, config) {
  const issues = [];
  for (const [severity, patterns] of Object.entries(config.riskPatterns ?? {})) {
    for (const risk of patterns) {
      const regex = new RegExp(risk.pattern, "i");
      if (regex.test(text)) {
        issues.push(pageIssue(severity, risk.code, risk.message));
      }
    }
  }
  return issues;
}

function scorePage(issues, metrics) {
  let score = 100;
  for (const issue of issues) {
    score -= issue.severity === "review-not-ready" ? 20 : 8;
  }
  if (metrics.visibleTextLength < metrics.minVisibleText) score -= 16;
  if (metrics.uniqueContentRatio < 0.5) score -= 16;
  return Math.max(0, Math.min(100, score));
}

function verdictFromIssues(issues, score, config) {
  if (issues.some((issue) => issue.severity === "review-not-ready")) return VERDICTS.NOT_READY;
  if (score >= config.thresholds.siteScoreReviewReady) return VERDICTS.READY;
  if (score >= config.thresholds.siteScoreWarning) return VERDICTS.WARNING;
  return VERDICTS.NOT_READY;
}

export async function analyzeHtmlPage({ baseUrl, page, config, html, status = 200, contentType = "text/html" }) {
  const text = stripHtml(html);
  const category = page.category;
  const categoryRule = config.contentCategories?.[category] ?? {};
  const minVisibleText = categoryRule.minVisibleText ?? config.thresholds.requiredMinVisibleText;
  const metrics = {
    visibleTextLength: visibleTextLength(text),
    uniqueContentRatio: Number(uniqueContentRatio(text).toFixed(3)),
    minVisibleText,
    internalLinkCount: extractLinks(html, baseUrl, page.path).length
  };
  const meta = {
    title: matchTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: extractMeta(html, "description"),
    canonical: matchTag(html, /<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i),
    robots: extractMeta(html, "robots"),
    ogTitle: extractMeta(html, "og:title"),
    ogDescription: extractMeta(html, "og:description")
  };
  const issues = [];
  if (status < 200 || status >= 300) {
    issues.push(pageIssue("review-not-ready", "http_not_ok", `HTTP status is ${status}.`));
  }
  if (!/html/i.test(contentType)) {
    issues.push(pageIssue("review-not-ready", "non_html_response", `Response content-type is ${contentType || "unknown"}.`));
  }
  if (metrics.visibleTextLength < minVisibleText) {
    issues.push(pageIssue("review-not-ready", "thin_visible_text", `Visible text ${metrics.visibleTextLength} is below ${minVisibleText}.`));
  }
  if (metrics.visibleTextLength < config.thresholds.requiredMinVisibleText && page.required) {
    issues.push(pageIssue("review-not-ready", "required_page_too_short", `Required page visible text is below ${config.thresholds.requiredMinVisibleText}.`));
  }
  if (metrics.uniqueContentRatio < config.thresholds.uniqueContentRatioReviewNotReady) {
    issues.push(pageIssue("review-not-ready", "low_unique_content_ratio", `Unique content ratio ${metrics.uniqueContentRatio} is below ${config.thresholds.uniqueContentRatioReviewNotReady}.`));
  }
  issues.push(...evaluateSeo(meta, page.path, page.required));
  issues.push(...evaluateRisks(text, config));

  const score = scorePage(issues, metrics);
  return {
    path: page.path,
    url: absoluteUrl(baseUrl, page.path),
    label: page.label ?? page.path,
    category,
    required: Boolean(page.required),
    status,
    contentType,
    verdict: verdictFromIssues(issues, score, config),
    score,
    metrics,
    meta,
    issues
  };
}

async function discoverPublicPages(baseUrl, config, fetchText, customGameSlug) {
  const required = requiredPages(config, customGameSlug);
  const requiredLookup = new Map(required.map((page) => [page.path, page]));
  const notices = [];
  const excludedPages = [];
  let sitemapPaths = [];

  try {
    const sitemap = await fetchText(absoluteUrl(baseUrl, "/sitemap.xml"), { accept: "application/xml,text/xml" });
    if (sitemap.ok) sitemapPaths = extractSitemapUrls(sitemap.body, baseUrl);
    else notices.push({ code: "sitemap_fetch_failed", message: `sitemap.xml returned ${sitemap.status}.` });
  } catch (error) {
    notices.push({ code: "sitemap_fetch_failed", message: error instanceof Error ? error.message : String(error) });
  }

  const candidates = unique([...required.map((page) => page.path), ...sitemapPaths]);
  const pages = [];
  for (const pagePath of candidates) {
    const excludedReason = isExcluded(pagePath, config);
    if (excludedReason) {
      excludedPages.push({ path: pagePath, reason: excludedReason });
      continue;
    }
    const requiredPage = requiredLookup.get(pagePath);
    pages.push({
      path: pagePath,
      label: requiredPage?.label ?? pagePath,
      category: classifyCategory(pagePath, config, requiredLookup),
      required: Boolean(requiredPage)
    });
  }

  for (const page of required) {
    if (!pages.some((candidate) => candidate.path === page.path)) {
      const excludedReason = isExcluded(page.path, config);
      if (excludedReason) excludedPages.push({ path: page.path, reason: excludedReason });
      else pages.push(page);
    }
  }

  return { pages, notices, excludedPages };
}

async function checkInternalLinks(baseUrl, pageResults, fetchText, config) {
  const links = unique(pageResults.flatMap((page) => extractLinks(page.html ?? "", baseUrl, page.path)));
  const broken = [];
  for (const linkPath of links) {
    if (isExcluded(linkPath, config)) continue;
    try {
      const response = await fetchText(absoluteUrl(baseUrl, linkPath), { method: "GET" });
      if (response.status >= 400) broken.push({ path: linkPath, status: response.status });
    } catch (error) {
      broken.push({ path: linkPath, status: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return broken;
}

async function checkRequiredApis(baseUrl, config, fetchText) {
  const results = [];
  for (const api of config.requiredApis ?? []) {
    try {
      const response = await fetchText(absoluteUrl(baseUrl, api.path), {
        method: api.method ?? "GET",
        accept: "application/json"
      });
      results.push({
        method: api.method ?? "GET",
        path: api.path,
        status: response.status,
        ok: response.status >= 200 && response.status < 500
      });
    } catch (error) {
      results.push({
        method: api.method ?? "GET",
        path: api.path,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
}

function summarizeSite(pageResults, brokenInternalLinks, apiResults, config, baseline) {
  const issues = [];
  const requiredFailures = pageResults.filter((page) => page.required && page.verdict === VERDICTS.NOT_READY);
  if (requiredFailures.length > 0) {
    issues.push({ severity: "review-not-ready", code: "required_page_not_ready", message: `${requiredFailures.length} required page(s) are not ready.` });
  }
  if (brokenInternalLinks.length > config.thresholds.maxBrokenInternalLinks) {
    issues.push({ severity: "review-not-ready", code: "broken_internal_links", message: `${brokenInternalLinks.length} broken internal link(s) found.` });
  }
  const apiErrors = apiResults.filter((api) => !api.ok);
  if (apiErrors.length > config.thresholds.maxRequiredApiErrors) {
    issues.push({ severity: "review-not-ready", code: "required_api_errors", message: `${apiErrors.length} required API check(s) failed.` });
  }

  const averageScore = pageResults.length
    ? Math.round(pageResults.reduce((sum, page) => sum + page.score, 0) / pageResults.length)
    : 0;
  let ciRegressionStatus = "pass";
  const notices = [];
  if (baseline?.summary?.siteScore != null) {
    const previousScore = Number(baseline.summary.siteScore);
    if (averageScore + config.baseline.regressionScoreTolerance < previousScore) {
      ciRegressionStatus = "fail";
      issues.push({ severity: "warning", code: "baseline_score_regression", message: `Site score regressed from ${previousScore} to ${averageScore}.` });
    }
  } else {
    notices.push({ code: "baseline_missing", message: "No baseline report was provided; ciRegressionStatus is pass by default." });
  }

  const verdict = issues.some((issue) => issue.severity === "review-not-ready")
    ? VERDICTS.NOT_READY
    : averageScore >= config.thresholds.siteScoreReviewReady
      ? VERDICTS.READY
      : averageScore >= config.thresholds.siteScoreWarning
        ? VERDICTS.WARNING
        : VERDICTS.NOT_READY;

  return {
    verdict,
    siteScore: averageScore,
    ciRegressionStatus,
    pageCount: pageResults.length,
    requiredPageFailureCount: requiredFailures.length,
    brokenInternalLinkCount: brokenInternalLinks.length,
    requiredApiErrorCount: apiErrors.length,
    issues,
    notices
  };
}

export async function runAdsenseReadiness(options = {}) {
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.ADSENSE_READINESS_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL);
  const fetchText = options.fetchText ?? defaultFetchText;
  const baseline = options.baselinePath
    ? JSON.parse(await fs.readFile(options.baselinePath, "utf8"))
    : null;
  const discovery = await discoverPublicPages(baseUrl, config, fetchText, options.customGameSlug);
  const rawPageResults = [];

  for (const page of discovery.pages) {
    let response;
    try {
      response = await fetchText(absoluteUrl(baseUrl, page.path));
    } catch (error) {
      response = {
        ok: false,
        status: 0,
        contentType: "",
        body: `<html><head><title>${page.path}</title></head><body>${error instanceof Error ? error.message : String(error)}</body></html>`
      };
    }
    const result = await analyzeHtmlPage({
      baseUrl,
      page,
      config,
      html: response.body,
      status: response.status,
      contentType: response.contentType
    });
    rawPageResults.push({ ...result, html: response.body });
  }

  const brokenInternalLinks = await checkInternalLinks(baseUrl, rawPageResults, fetchText, config);
  const requiredApiResults = await checkRequiredApis(baseUrl, config, fetchText);
  const pageResults = rawPageResults.map(({ html, ...page }) => page);
  const summary = summarizeSite(pageResults, brokenInternalLinks, requiredApiResults, config, baseline);
  summary.notices.push(...discovery.notices);

  return {
    generatedAt: new Date().toISOString(),
    targetBaseUrl: baseUrl,
    configVersion: config.version,
    policyReferences: config.policyReferences,
    discoveredUrls: discovery.pages.map((page) => page.path),
    excludedUrls: discovery.excludedPages,
    summary,
    pageResults,
    brokenInternalLinks,
    requiredApiResults
  };
}

export function formatMarkdownReport(report) {
  const lines = [
    "# AdSense readiness report",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Target: ${report.targetBaseUrl}`,
    `- Verdict: ${report.summary.verdict}`,
    `- Site score: ${report.summary.siteScore}`,
    `- CI regression: ${report.summary.ciRegressionStatus}`,
    "",
    "This is a non-blocking engineering readiness check. It does not guarantee Google AdSense approval.",
    "",
    "## Policy references",
    "",
    ...report.policyReferences.map((reference) => `- [${reference.label}](${reference.url})`),
    "",
    "## Page results",
    ""
  ];

  for (const page of report.pageResults) {
    lines.push(`### ${page.path}`);
    lines.push("");
    lines.push(`- Verdict: ${page.verdict}`);
    lines.push(`- Score: ${page.score}`);
    lines.push(`- Category: ${page.category}`);
    lines.push(`- Visible text: ${page.metrics.visibleTextLength}/${page.metrics.minVisibleText}`);
    lines.push(`- Unique ratio: ${page.metrics.uniqueContentRatio}`);
    if (page.issues.length === 0) {
      lines.push("- Issues: none");
    } else {
      lines.push("- Issues:");
      for (const issue of page.issues) {
        lines.push(`  - ${issue.severity}: ${issue.code} - ${issue.message}`);
      }
    }
    lines.push("");
  }

  if (report.brokenInternalLinks.length > 0) {
    lines.push("## Broken internal links", "");
    for (const link of report.brokenInternalLinks) {
      lines.push(`- ${link.path}: ${link.status}`);
    }
    lines.push("");
  }

  if (report.summary.notices.length > 0) {
    lines.push("## Notices", "");
    for (const notice of report.summary.notices) {
      lines.push(`- ${notice.code}: ${notice.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

export async function writeReportFiles(report, options = {}) {
  const jsonPath = options.jsonReportPath ?? DEFAULT_JSON_REPORT;
  const markdownPath = options.markdownReportPath ?? DEFAULT_MARKDOWN_REPORT;
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(markdownPath, formatMarkdownReport(report));
  return { jsonPath, markdownPath };
}

export {
  DEFAULT_CONFIG_PATH,
  DEFAULT_JSON_REPORT,
  DEFAULT_MARKDOWN_REPORT,
  VERDICTS,
  absoluteUrl,
  requiredPages,
  stripHtml,
  uniqueContentRatio,
  visibleTextLength
};
