import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getTodayPayload } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getTodayPayload());
  } catch (error) {
    logRouteError("api/today", error);
    return NextResponse.json({ error: "오늘 문제를 불러오지 못했습니다." }, { status: 500 });
  }
}
