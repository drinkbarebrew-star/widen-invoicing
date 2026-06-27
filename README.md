# AI Invoicing App

A password-protected web app that turns a dispatcher's plain-English job notes into a
clean, branded estimate PDF — and logs every estimate to a Notion database. Built on
Next.js 15, deployable to Vercel in minutes. Fully whitelabel via environment variables.

Currently themed as **WIDEN Chimney & Vent**, but every brand element, the Notion target,
and the password are configurable — point it at any trade and any database.

---

## What it does

1. **Describe the job** — the dispatcher types what the tech found and the prices.
2. **AI drafts it** — Claude writes a customer-ready diagnosis, scope of work, and an
   itemized price list. Everything is editable.
3. **Math is exact** — subtotal, tax (rate % or flat $), and total are computed by the app,
   never by the AI.
4. **PDF out** — a live preview renders on the locked letterhead; "Download PDF" prints a
   pixel-perfect estimate.
5. **Logged to Notion** — one click writes a row (customer, address, subtotal, tax, total,
   invoice #, status = Quoted) to your CRM/Invoices database.
6. **Sequential invoice numbers** — pulled automatically from Notion, so numbers never
   collide across users or devices.

---

## Deploy to Vercel (5 minutes)

1. Push this folder to a GitHub repo (or drag-drop into Vercel).
2. In Vercel: **New Project → Import** the repo. Framework auto-detects as Next.js.
3. Add the environment variables below (**Settings → Environment Variables**).
4. **Deploy.** Visit the URL, enter the password, done.

### Required environment variables

| Variable | What it is |
| --- | --- |
| `APP_PASSWORD` | The gate password. Default `$WidenChicago$`. Wrap in single quotes in any `.env` file. |
| `ANTHROPIC_API_KEY` | Your Claude API key from console.anthropic.com. |
| `ANTHROPIC_MODEL` | Model id. Default `claude-sonnet-4-6`. |
| `NOTION_API_KEY` | Internal integration token from notion.so/my-integrations. |
| `NOTION_DATABASE_ID` | The database to log into (see below). |
| `INVOICE_START` | First invoice number if none exist yet. Default `737802`. |

All branding + Notion property-name variables are optional and listed in `.env.example`.

---

## Connect Notion

1. Create an integration: **notion.so/my-integrations → New integration** (internal).
   Copy its token into `NOTION_API_KEY`.
2. Open your CRM/Invoices database in Notion → **••• menu → Connections → Connect**
   your integration.
3. Get the database ID: open the database as a full page; the ID is the 32-char hash in
   the URL (`notion.so/<workspace>/<DATABASE_ID>?v=...`). Put it in `NOTION_DATABASE_ID`.

### Database columns the app writes to

Defaults match the WIDEN Chimney CRM. Override any name via `NOTION_PROP_*` in `.env.example`.

| Purpose | Default column | Type |
| --- | --- | --- |
| Customer | `Name` | Title |
| Address | `Address` | Text |
| Subtotal / Tax / Total | `Subtotal` / `Tax` / `Total` | Number |
| Status | `Status` | Select (writes "Quoted") |
| Date | `Date` | Date |
| Notes | `Notes` | Text (holds the invoice # + line items) |
| Invoice # *(optional)* | `Invoice No.` | Number |
| Service tags *(optional)* | `Service Type` | Multi-select |

**Recommended:** add a Number column named **`Invoice No.`** and set `NOTION_PROP_INVOICE`
to it. Then invoice numbers become a real sortable column and the auto-sequencer reads
from it directly. Without it, the app still works — it reads/writes the number inside Notes.

---

## Whitelabel it

Everything visible is driven by `NEXT_PUBLIC_*` env vars — no code changes needed:

```
NEXT_PUBLIC_APP_NAME=AI Invoicing
NEXT_PUBLIC_BRAND_NAME=WIDEN
NEXT_PUBLIC_BRAND_SUB=CHIMNEY & VENT
NEXT_PUBLIC_BRAND_WEBSITE=WidenChicago.com
NEXT_PUBLIC_BRAND_ADDRESS=1500 Old Deerfield Rd, Highland Park, IL
NEXT_PUBLIC_BRAND_PHONE=224 343 1991
NEXT_PUBLIC_DOC_TITLE=CHIMNEY REPAIR ESTIMATE
NEXT_PUBLIC_BRAND_ACCENT=#b35a33
NEXT_PUBLIC_BRAND_TRADE=chimney and venting
```

Change these and the letterhead, login screen, document title, accent color, and the AI's
trade context all re-skin instantly. Sell it to any contractor by handing them their own
Vercel project with their own env values.

---

## Run locally

```bash
npm install
cp .env.example .env.local      # fill in the keys
npm run dev                     # http://localhost:3000
```

---

## How the PDF is produced

The estimate renders into an isolated iframe using the exact locked letterhead CSS, then
prints via the browser's native **Print → Save as PDF**. This is zero-dependency and
pixel-perfect on every platform. (If you ever want server-generated PDF *files* instead of
print-to-PDF, add `puppeteer-core` + `@sparticuz/chromium` and render `renderEstimateHTML()`
in a route — the HTML is already a complete standalone document.)

---

## Architecture

```
app/
  page.tsx                 generator UI (describe → edit → preview → PDF → log)
  login/page.tsx           password gate
  api/
    auth/route.ts          password check → http-only cookie
    generate/route.ts      Claude → {diagnosis, scope[], lineItems[]}
    invoice-number/route.ts next sequential number from Notion
    log/route.ts           write estimate row to Notion
lib/
  branding.ts              whitelabel config (env-driven)
  estimate.ts              types + locked letterhead HTML renderer + math
  notion.ts                Notion REST: numbering + logging
components/
  EstimatePreview.tsx      iframe preview + print-to-PDF
middleware.ts              gates every route behind the auth cookie
```

Math lives only in `lib/estimate.ts` (`subtotalOf` / `totalOf`) — the AI never does
arithmetic. The letterhead lives only in `renderEstimateHTML()` — one source of truth for
both the on-screen preview and the printed PDF, so they can never drift.
