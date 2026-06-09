import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { AnalyticsConsent } from "@/components/organisms/AnalyticsConsent";
import { getSiteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} - 매일 한 문제 한국어 연상 퍼즐`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: `${siteConfig.name} - 매일 한 문제 한국어 연상 퍼즐`,
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    url: "/",
    siteName: siteConfig.name,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Narrow 한국어 일일 연상 퍼즐"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - 한국어 연상 퍼즐`,
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    images: [siteConfig.ogImage]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? "ca-pub-4621241846705196";
  const adsenseScriptEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SCRIPT_ENABLED === "true";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteUrl,
    inLanguage: "ko-KR",
    description: siteConfig.description,
    potentialAction: {
      "@type": "PlayAction",
      target: siteUrl
    }
  };

  return (
    <html lang="ko">
      <body>
        <Script
          id="website-json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {adsenseScriptEnabled ? (
          <Script
            id="google-adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        <AnalyticsConsent measurementId={gaMeasurementId} />
        <header className="site-header" aria-label="주요 메뉴">
          <nav className="site-nav">
            <Link className="site-brand" href="/">
              {siteConfig.name}
            </Link>
            <div className="site-nav-links">
              <Link href="/how-to-play">플레이 방법</Link>
              <Link href="/archive">지난 문제</Link>
              <Link href="/puzzle-strategy">퍼즐 읽기</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="site-footer" aria-label="사이트 정보">
          <Link href="/about">소개</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/contact">문의</Link>
        </footer>
      </body>
    </html>
  );
}
