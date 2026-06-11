import type { Metadata } from "next";
import { CustomRankingTemplate } from "@/components/templates/CustomRankingTemplate";

export const metadata: Metadata = {
  title: "커스텀 랭킹",
  description: "공유받은 Narrow 커스텀 문제의 랭킹을 확인하세요.",
  robots: {
    index: false,
    follow: false
  }
};

function safeSlug(value: string) {
  return /^[0-9A-Za-z_-]{12,64}$/.test(value) ? value : "invalid";
}

export default async function CustomRankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CustomRankingTemplate slug={safeSlug(slug)} />;
}
