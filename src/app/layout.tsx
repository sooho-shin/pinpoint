import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const DEFAULT_ADSENSE_CLIENT = "ca-pub-4621241846705196";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint-seven.vercel.app"),
  title: {
    default: "Narrow",
    template: "%s | Narrow"
  },
  description: "매일 오후 5시, 단서로 맞히는 한국어 연상 퍼즐",
  openGraph: {
    title: "Narrow",
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    url: "/",
    siteName: "Narrow",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-narrow.png",
        width: 1200,
        height: 630,
        alt: "Narrow 한국어 일일 연상 퍼즐"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Narrow",
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    images: ["/og-narrow.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? DEFAULT_ADSENSE_CLIENT;

  return (
    <html lang="ko">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        ) : null}
        {children}
        <footer className="site-footer" aria-label="사이트 정보">
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/contact">문의</Link>
        </footer>
      </body>
    </html>
  );
}
