import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint-seven.vercel.app"),
  title: {
    default: "Pinpoint",
    template: "%s | Pinpoint"
  },
  description: "매일 오후 5시, 단서로 맞히는 한국어 연상 퍼즐",
  openGraph: {
    title: "Pinpoint",
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    url: "/",
    siteName: "Pinpoint",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Pinpoint 한국어 일일 연상 퍼즐"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Pinpoint",
    description: "매일 오후 5시, 단서로 맞히는 오늘의 정답",
    images: ["/og.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
