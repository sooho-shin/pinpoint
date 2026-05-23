import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getGroupLeaderboard } from "@/lib/puzzle/api";

export async function GET(request: NextRequest) {
  try {
    const inviteCode = request.nextUrl.searchParams.get("code") ?? "";
    return NextResponse.json(await getGroupLeaderboard(inviteCode));
  } catch (error) {
    logRouteError("api/leaderboard/group", error);
    return NextResponse.json({ error: "그룹 랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
