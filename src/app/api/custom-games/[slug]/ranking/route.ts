import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getCustomGameRanking, registerCustomGameRanking } from "@/lib/puzzle/custom";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    return NextResponse.json(await getCustomGameRanking(slug));
  } catch (error) {
    logRouteError("api/custom-games/[slug]/ranking:GET", error);
    return NextResponse.json({ error: "커스텀 랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const result = await registerCustomGameRanking(slug, String(body.nickname ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/custom-games/[slug]/ranking:POST", error);
    return NextResponse.json({ error: "랭킹 등록을 처리하지 못했습니다." }, { status: 500 });
  }
}
