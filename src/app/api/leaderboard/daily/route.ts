import { NextResponse } from "next/server";
import { getDailyLeaderboard } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getDailyLeaderboard());
  } catch {
    return NextResponse.json({ error: "랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
