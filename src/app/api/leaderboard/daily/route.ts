import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getDailyLeaderboard } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getDailyLeaderboard());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: "랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
