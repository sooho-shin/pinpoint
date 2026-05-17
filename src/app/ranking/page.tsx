import { RankingTemplate } from "@/components/templates/RankingTemplate";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const params = await searchParams;
  return <RankingTemplate groupCode={params.group} />;
}
