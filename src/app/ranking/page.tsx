import { RankingTemplate } from "@/components/templates/RankingTemplate";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ group?: string; tab?: string }> }) {
  const params = await searchParams;
  return <RankingTemplate groupCode={params.group} activeTab={params.group || params.tab === "group" ? "group" : "daily"} />;
}
