import { NextResponse } from "next/server";
import { AuthenticationRequiredError, revealNextClue } from "@/lib/puzzle/api";

export async function POST() {
  try {
    return NextResponse.json(await revealNextClue());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: "단서를 열지 못했습니다." }, { status: 500 });
  }
}
