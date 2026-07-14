import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "buddy-script-web",
    timestamp: new Date().toISOString(),
  });
}
