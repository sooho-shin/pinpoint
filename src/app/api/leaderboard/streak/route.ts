import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getStreakLeaderboard } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getStreakLeaderboard());
  } catch (error) {
    logRouteError("api/leaderboard/streak", error);
    return NextResponse.json({ error: "연승 랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
