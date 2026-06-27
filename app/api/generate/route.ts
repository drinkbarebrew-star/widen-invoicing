import { NextRequest, NextResponse } from "next/server";
import { branding } from "@/lib/branding";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = (trade: string) => `You are an estimator for a ${trade} service company. \
Given a dispatcher's freeform notes about a job, produce a clean, professional estimate.

Return ONLY valid JSON (no markdown, no backticks, no preamble) with this exact shape:
{
  "diagnosis": "2-4 sentence professional description of the problem/condition, written for a customer-facing estimate.",
  "scope": ["Short action sentence.", "Another action sentence."],
  "lineItems": [ { "desc": "Line item name (e.g. 'Chimney Deep Clean - 22 ft')", "amount": 0 } ]
}

Rules:
- Use realistic, itemized line items with individual prices the dispatcher implied. If the dispatcher gives a lump sum, break it into sensible line items that sum to it.
- amount is a number only (no $ or commas).
- Keep diagnosis and scope grounded in what the dispatcher said; do not invent unrelated work.
- Do NOT include subtotal, tax, or total — those are computed by the app.
- 3-6 scope lines max. Be concise and trade-appropriate.`;

export async function POST(req: NextRequest) {
  try {
    const { notes } = await req.json();
    if (!notes || !String(notes).trim()) {
      return NextResponse.json({ error: "No job notes provided." }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: SYSTEM(branding.trade),
        messages: [{ role: "user", content: String(notes) }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `Claude API error (${res.status}): ${t}` }, { status: 502 });
    }

    const data: any = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    const clean = text.replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse AI response as JSON.");
      parsed = JSON.parse(m[0]);
    }

    // sanitize
    const lineItems = Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .map((i: any) => ({ desc: String(i.desc || "").trim(), amount: Number(i.amount) || 0 }))
          .filter((i: any) => i.desc)
      : [];
    const scope = Array.isArray(parsed.scope) ? parsed.scope.map((s: any) => String(s).trim()).filter(Boolean) : [];

    return NextResponse.json({
      diagnosis: String(parsed.diagnosis || "").trim(),
      scope,
      lineItems,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Generation failed." }, { status: 500 });
  }
}
