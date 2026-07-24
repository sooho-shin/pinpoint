import type { Metadata } from "next";
import { RankingTemplate } from "@/components/templates/RankingTemplate";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ group?: string }> }): Promise<Metadata> {
  await searchParams;

  return {
    title: "오늘의 랭킹",
    description: "Narrow 오늘의 랭킹, 그룹 랭킹, 연승 랭킹을 확인하세요.",
    alternates: {
      canonical: "/ranking"
    },
    robots: { index: false, follow: true }
  };
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ group?: string; tab?: string }> }) {
  const params = await searchParams;
  return <RankingTemplate groupCode={params.group} activeTab={params.group || params.tab === "group" ? "group" : "daily"} />;
}
