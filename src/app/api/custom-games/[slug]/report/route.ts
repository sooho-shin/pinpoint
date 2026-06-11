import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { reportCustomGame } from "@/lib/puzzle/custom";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const result = await reportCustomGame(slug, String(body.reason ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/custom-games/[slug]/report:POST", error);
    return NextResponse.json({ error: "신고를 처리하지 못했습니다." }, { status: 500 });
  }
}
