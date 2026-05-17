import { NextResponse, type NextRequest } from "next/server";
import { getGroupLeaderboard } from "@/lib/puzzle/api";

export async function GET(request: NextRequest) {
  try {
    const inviteCode = request.nextUrl.searchParams.get("code") ?? "";
    return NextResponse.json(await getGroupLeaderboard(inviteCode));
  } catch {
    return NextResponse.json({ error: "그룹 랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
