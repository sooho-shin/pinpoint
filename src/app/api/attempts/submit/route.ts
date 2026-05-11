import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationRequiredError, submitGuess } from "@/lib/puzzle/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const guess = String(body.guess ?? "").trim();
    if (!guess) return NextResponse.json({ error: "정답을 입력해 주세요." }, { status: 400 });
    return NextResponse.json(await submitGuess(guess));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: "제출을 처리하지 못했습니다." }, { status: 500 });
  }
}
