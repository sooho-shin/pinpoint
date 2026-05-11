import { NextResponse } from "next/server";
import { startAttempt } from "@/lib/puzzle/api";

export async function POST() {
  try {
    return NextResponse.json(await startAttempt());
  } catch {
    return NextResponse.json({ error: "풀이를 시작하지 못했습니다." }, { status: 500 });
  }
}
