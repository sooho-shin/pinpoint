import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getCustomGamePayload } from "@/lib/puzzle/custom";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    return NextResponse.json(await getCustomGamePayload(slug));
  } catch (error) {
    logRouteError("api/custom-games/[slug]:GET", error);
    return NextResponse.json({ error: "커스텀 게임을 불러오지 못했습니다." }, { status: 500 });
  }
}
