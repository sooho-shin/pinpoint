import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getCurrentWinnerMessage } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getCurrentWinnerMessage());
  } catch (error) {
    logRouteError("api/winner-message/current", error);
    return NextResponse.json({ error: "메시지를 불러오지 못했습니다." }, { status: 500 });
  }
}
