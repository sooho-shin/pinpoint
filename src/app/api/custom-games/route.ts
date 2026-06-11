import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { createCustomGame } from "@/lib/puzzle/custom";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createCustomGame({
      answer: String(body.answer ?? ""),
      clues: Array.isArray(body.clues) ? body.clues.map(String) : []
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/custom-games:POST", error);
    return NextResponse.json({ error: "커스텀 게임을 만들지 못했습니다." }, { status: 500 });
  }
}
