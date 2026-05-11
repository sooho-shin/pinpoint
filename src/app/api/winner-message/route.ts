import { NextResponse, type NextRequest } from "next/server";
import { writeWinnerMessage } from "@/lib/puzzle/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await writeWinnerMessage(String(body.message ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "메시지를 등록하지 못했습니다." }, { status: 500 });
  }
}
