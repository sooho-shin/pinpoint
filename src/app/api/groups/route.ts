import { NextResponse, type NextRequest } from "next/server";
import { createRankingGroup } from "@/lib/puzzle/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createRankingGroup({ name: String(body?.name ?? "") });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "그룹을 만들지 못했습니다." }, { status: 500 });
  }
}
