import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getCustomGameAdmin, updateCustomGameAdmin } from "@/lib/puzzle/custom";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    return NextResponse.json(await getCustomGameAdmin(token));
  } catch (error) {
    logRouteError("api/custom-games/admin/[token]:GET", error);
    return NextResponse.json({ error: "관리 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const action = String(body.action ?? "");
    if (action !== "hide" && action !== "delete") {
      return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
    }
    const result = await updateCustomGameAdmin(token, action);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    logRouteError("api/custom-games/admin/[token]:POST", error);
    return NextResponse.json({ error: "관리 작업을 처리하지 못했습니다." }, { status: 500 });
  }
}
