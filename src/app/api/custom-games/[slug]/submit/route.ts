import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { submitCustomGameGuess } from "@/lib/puzzle/custom";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const guess = String(body.guess ?? "").trim();
    if (!guess) return NextResponse.json({ error: "정답을 입력해 주세요." }, { status: 400 });
    return NextResponse.json(await submitCustomGameGuess(slug, guess));
  } catch (error) {
    logRouteError("api/custom-games/[slug]/submit:POST", error);
    return NextResponse.json({ error: "제출을 처리하지 못했습니다." }, { status: 500 });
  }
}
