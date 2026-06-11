import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { revealCustomGameClue } from "@/lib/puzzle/custom";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    return NextResponse.json(await revealCustomGameClue(slug));
  } catch (error) {
    logRouteError("api/custom-games/[slug]/reveal:POST", error);
    return NextResponse.json({ error: "단서를 열지 못했습니다." }, { status: 500 });
  }
}
