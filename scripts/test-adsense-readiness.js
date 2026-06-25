#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeHtmlPage, runAdsenseReadiness } from "./lib/adsense-readiness.js";

const config = {
  version: 1,
  thresholds: {
    siteScoreReviewReady: 85,
    siteScoreWarning: 70,
    requiredMinVisibleText: 80,
    uniqueContentRatioReviewNotReady: 0.5,
    maxBrokenInternalLinks: 0,
    maxRequiredApiErrors: 0
  },
  baseline: {
    regressionScoreTolerance: 0
  },
  contentCategories: {
    guide: { minVisibleText: 80, required: true }
  },
  requiredPages: [
    { path: "/", label: "home", category: "guide" }
  ],
  excludedPatterns: [
    { pattern: "^/api/", reason: "api" },
    { pattern: "^/signin$", reason: "signin" }
  ],
  requiredApis: [],
  riskPatterns: {
    "review-not-ready": [
      { code: "placeholder", pattern: "TODO|placeholder", message: "placeholder" }
    ],
    warning: [
      { code: "loading", pattern: "loading", message: "loading" }
    ]
  },
  policyReferences: []
};

const healthyHtml = `
  <html>
    <head>
      <title>Narrow guide</title>
      <meta name="description" content="한국어 연상 퍼즐을 자세히 설명하는 페이지입니다." />
      <link rel="canonical" href="https://example.test/" />
      <meta property="og:title" content="Narrow guide" />
      <meta property="og:description" content="한국어 연상 퍼즐 안내" />
    </head>
    <body>
      <main>
        <h1>한국어 연상 퍼즐 안내</h1>
        <p>서로 다른 단서를 순서대로 읽고 정답 후보를 좁혀 가는 방식입니다.</p>
        <p>단서는 문화, 과학, 일상어, 인물, 작품, 제도처럼 다양한 영역에서 출발합니다.</p>
        <p>사용자는 단서가 추가될 때마다 이전 추론을 점검하고 새 후보를 비교할 수 있습니다.</p>
        <a href="/about">소개</a>
      </main>
    </body>
  </html>
`;

const thinHtml = `
  <html>
    <head><title>TODO</title></head>
    <body><main>placeholder</main></body>
  </html>
`;

const healthyPage = await analyzeHtmlPage({
  baseUrl: "https://example.test",
  page: { path: "/", label: "home", category: "guide", required: true },
  config,
  html: healthyHtml,
  status: 200,
  contentType: "text/html"
});

assert.equal(healthyPage.verdict, "review-ready");
assert.equal(healthyPage.issues.length, 0);

const thinPage = await analyzeHtmlPage({
  baseUrl: "https://example.test",
  page: { path: "/", label: "home", category: "guide", required: true },
  config,
  html: thinHtml,
  status: 200,
  contentType: "text/html"
});

assert.equal(thinPage.verdict, "review-not-ready");
assert.ok(thinPage.issues.some((issue) => issue.code === "thin_visible_text"));
assert.ok(thinPage.issues.some((issue) => issue.code === "missing_description"));

const fetched = new Map([
  ["https://example.test/sitemap.xml", { ok: true, status: 200, contentType: "application/xml", body: "<urlset><url><loc>https://example.test/</loc></url><url><loc>https://example.test/signin</loc></url></urlset>" }],
  ["https://example.test/", { ok: true, status: 200, contentType: "text/html", body: healthyHtml }],
  ["https://example.test/about", { ok: true, status: 200, contentType: "text/html", body: healthyHtml }]
]);

const report = await runAdsenseReadiness({
  baseUrl: "https://example.test",
  fetchText: async (url) => {
    const response = fetched.get(url);
    if (!response) return { ok: false, status: 404, contentType: "text/html", body: "<html><body>missing</body></html>" };
    return response;
  },
  configPath: "config/adsense-readiness.json",
  customGameSlug: "test"
});

assert.ok(Array.isArray(report.pageResults));
assert.equal(report.summary.ciRegressionStatus, "pass");
assert.ok(report.excludedUrls.some((item) => item.path === "/signin"));

console.log("adsense readiness tests passed");
