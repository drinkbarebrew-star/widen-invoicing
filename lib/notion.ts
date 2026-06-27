// Minimal Notion REST helpers (no SDK). Property names are env-configurable so
// the app whitelabels onto any database schema.

const NOTION_VERSION = "2022-06-28";

function env(k: string, fallback = ""): string {
  return process.env[k] || fallback;
}

function headers() {
  return {
    Authorization: `Bearer ${env("NOTION_API_KEY")}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

const DB = () => env("NOTION_DATABASE_ID");
const P = {
  name: () => env("NOTION_PROP_NAME", "Name"),
  address: () => env("NOTION_PROP_ADDRESS", "Address"),
  subtotal: () => env("NOTION_PROP_SUBTOTAL", "Subtotal"),
  tax: () => env("NOTION_PROP_TAX", "Tax"),
  total: () => env("NOTION_PROP_TOTAL", "Total"),
  status: () => env("NOTION_PROP_STATUS", "Status"),
  date: () => env("NOTION_PROP_DATE", "Date"),
  notes: () => env("NOTION_PROP_NOTES", "Notes"),
  invoice: () => env("NOTION_PROP_INVOICE"), // optional
  service: () => env("NOTION_PROP_SERVICE"), // optional
};

// --- Next invoice number ---------------------------------------------------
// Strategy: if an Invoice-No number column is configured, take max+1 from it.
// Otherwise parse "Invoice No. NNNNNN" out of the Notes text column. Fall back
// to INVOICE_START.
export async function nextInvoiceNumber(): Promise<number> {
  const start = parseInt(env("INVOICE_START", "1000"), 10) || 1000;
  if (!DB() || !env("NOTION_API_KEY")) return start;

  let max = 0;
  let cursor: string | undefined = undefined;
  const invoiceProp = P.invoice();

  try {
    do {
      const res: Response = await fetch(
        `https://api.notion.com/v1/databases/${DB()}/query`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
        }
      );
      if (!res.ok) break;
      const data: any = await res.json();
      for (const pg of data.results || []) {
        const props = pg.properties || {};
        if (invoiceProp && props[invoiceProp]?.number != null) {
          max = Math.max(max, props[invoiceProp].number);
        } else {
          const notes = (props[P.notes()]?.rich_text || [])
            .map((t: any) => t.plain_text)
            .join(" ");
          const m = notes.match(/Invoice No\.?\s*(\d{4,})/i);
          if (m) max = Math.max(max, parseInt(m[1], 10));
        }
      }
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
  } catch {
    return start;
  }
  return max > 0 ? max + 1 : start;
}

// --- Log an estimate -------------------------------------------------------
export interface LogPayload {
  customerName: string;
  address: string;
  invoiceNo: number | string;
  date: string; // ISO yyyy-mm-dd
  subtotal: number;
  tax: number;
  total: number;
  lineDescs: string[];
  serviceTags?: string[];
  status?: string;
}

export async function logEstimate(p: LogPayload): Promise<{ url: string; id: string }> {
  if (!DB() || !env("NOTION_API_KEY")) {
    throw new Error("Notion is not configured (NOTION_API_KEY / NOTION_DATABASE_ID).");
  }

  const notesText =
    `Invoice No. ${p.invoiceNo} — ` +
    p.lineDescs.join("; ") +
    `. Generated via ${process.env.NEXT_PUBLIC_APP_NAME || "AI Invoicing"}. Status: ${p.status || "Quoted"}.`;

  const properties: any = {
    [P.name()]: { title: [{ text: { content: p.customerName } }] },
    [P.address()]: { rich_text: [{ text: { content: p.address } }] },
    [P.subtotal()]: { number: p.subtotal },
    [P.tax()]: { number: p.tax },
    [P.total()]: { number: p.total },
    [P.status()]: { select: { name: p.status || "Quoted" } },
    [P.date()]: { date: { start: p.date } },
    [P.notes()]: { rich_text: [{ text: { content: notesText } }] },
  };

  if (P.invoice()) {
    properties[P.invoice()] = { number: Number(p.invoiceNo) };
  }
  if (P.service() && p.serviceTags && p.serviceTags.length) {
    properties[P.service()] = { multi_select: p.serviceTags.map((n) => ({ name: n })) };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ parent: { database_id: DB() }, properties }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Notion log failed (${res.status}): ${t}`);
  }
  const data: any = await res.json();
  return { url: data.url, id: data.id };
}
