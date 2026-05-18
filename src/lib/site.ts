export const siteConfig = {
  name: "Narrow",
  defaultUrl: "https://pinpoint-seven.vercel.app",
  description: "매일 오후 5시, 단서로 맞히는 한국어 연상 퍼즐",
  ogImage: "/og-narrow.png",
  keywords: [
    "Narrow",
    "한국어 연상 퍼즐",
    "오늘의 퍼즐",
    "단서 퀴즈",
    "연상 퀴즈",
    "매일 퍼즐"
  ]
};

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.defaultUrl).replace(/\/$/, "");
}
