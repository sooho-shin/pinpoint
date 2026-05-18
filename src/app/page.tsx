import type { Metadata } from "next";
import { DailyPuzzleTemplate } from "@/components/templates/DailyPuzzleTemplate";

export const metadata: Metadata = {
  title: "매일 한 문제 한국어 연상 퍼즐",
  description: "매일 오후 5시에 공개되는 한국어 연상 퍼즐. 단서 5개 안에 오늘의 정답을 맞히고 랭킹에 도전하세요.",
  alternates: {
    canonical: "/"
  }
};

export default async function TodayPage() {
  return <DailyPuzzleTemplate />;
}
