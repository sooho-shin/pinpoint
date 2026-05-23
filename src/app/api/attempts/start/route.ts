import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { startAttempt } from "@/lib/puzzle/api";

export async function POST() {
  try {
    return NextResponse.json(await startAttempt());
  } catch (error) {
    logRouteError("api/attempts/start", error);
    return NextResponse.json({ error: "풀이를 시작하지 못했습니다." }, { status: 500 });
  }
}
