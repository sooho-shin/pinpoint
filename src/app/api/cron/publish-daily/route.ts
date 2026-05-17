import { NextRequest, NextResponse } from "next/server";
import { publishDailyPuzzle } from "@/lib/puzzle/publication-admin";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const dateKst = request.nextUrl.searchParams.get("date") ?? undefined;
    const result = await publishDailyPuzzle({ dateKst, force });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "오늘 공개 예약을 처리하지 못했습니다." }, { status: 500 });
  }
}
