import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getTodayPayload } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getTodayPayload());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: "오늘 문제를 불러오지 못했습니다." }, { status: 500 });
  }
}
