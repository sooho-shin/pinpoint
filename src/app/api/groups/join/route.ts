import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { joinRankingGroup } from "@/lib/puzzle/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await joinRankingGroup(String(body?.inviteCode ?? ""));
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/groups/join", error);
    return NextResponse.json({ ok: false, error: "그룹에 참여하지 못했습니다." }, { status: 500 });
  }
}
