import { NextRequest, NextResponse } from "next/server";
import { logEstimate } from "@/lib/notion";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const p = await req.json();
    const result = await logEstimate(p);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
