import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { startCustomGame } from "@/lib/puzzle/custom";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    return NextResponse.json(await startCustomGame(slug));
  } catch (error) {
    logRouteError("api/custom-games/[slug]/start:POST", error);
    return NextResponse.json({ error: "커스텀 게임을 시작하지 못했습니다." }, { status: 500 });
  }
}
