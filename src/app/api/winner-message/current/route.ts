import { NextResponse } from "next/server";
import { getCurrentWinnerMessage } from "@/lib/puzzle/api";

export async function GET() {
  try {
    return NextResponse.json(await getCurrentWinnerMessage());
  } catch {
    return NextResponse.json({ error: "메시지를 불러오지 못했습니다." }, { status: 500 });
  }
}
