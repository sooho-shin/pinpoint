import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getDailyLeaderboard, registerDailyLeaderboardNickname } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getDailyLeaderboard());
  } catch (error) {
    logRouteError("api/leaderboard/daily", error);
    return NextResponse.json({ error: "랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerDailyLeaderboardNickname(String(body.nickname ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/leaderboard/daily:POST", error);
    return NextResponse.json({ error: "랭킹 등록을 처리하지 못했습니다." }, { status: 500 });
  }
}
