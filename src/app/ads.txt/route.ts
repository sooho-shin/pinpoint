import { NextResponse } from "next/server";

export function GET() {
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  if (!adsenseClient) {
    return new NextResponse("AdSense publisher ID is not configured.\n", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  const publisherId = adsenseClient.replace(/^ca-/, "");

  return new NextResponse(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
