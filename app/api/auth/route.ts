import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Default keeps the app working out of the box with the agreed password.
// Override in production via the APP_PASSWORD env var.
const PASSWORD = process.env.APP_PASSWORD || "$WidenChicago$";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  // Cookie holds a constant gate token, never the password itself.
  res.cookies.set("ai_invoicing_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ai_invoicing_auth", "", { path: "/", maxAge: 0 });
  return res;
}
