import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getDailyPuzzleFeedback } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getDailyPuzzleFeedback());
  } catch (error) {
    logRouteError("api/puzzle-feedback/daily", error);
    return NextResponse.json({ error: "평가를 불러오지 못했습니다." }, { status: 500 });
  }
}
