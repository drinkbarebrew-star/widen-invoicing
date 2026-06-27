import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try {
    const n = await nextInvoiceNumber();
    return NextResponse.json({ invoiceNo: n });
  } catch (e: any) {
    return NextResponse.json({ invoiceNo: null, error: e.message }, { status: 200 });
  }
}
