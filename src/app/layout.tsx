import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pinpoint",
  description: "매일 하나씩 공개되는 한국어 연상 퍼즐"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
