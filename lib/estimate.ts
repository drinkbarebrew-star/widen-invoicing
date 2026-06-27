import { branding } from "./branding";

export interface LineItem {
  desc: string;
  amount: number;
}

export interface EstimateData {
  customerName: string;
  addressLines: string[];
  invoiceNo: number | string;
  date: string; // m/d/yy
  diagnosis: string;
  scope: string[];
  lineItems: LineItem[];
  taxAmount: number;
}

export function money(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function subtotalOf(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100;
}

export function totalOf(items: LineItem[], tax: number): number {
  return Math.round((subtotalOf(items) + (Number(tax) || 0)) * 100) / 100;
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Returns a complete, standalone HTML document that renders the estimate on the
// locked letterhead. Identical CSS to the reference PDF. Used both for the
// on-screen preview (via iframe) and the print-to-PDF output.
export function renderEstimateHTML(d: EstimateData): string {
  const accent = branding.accent;
  const sub = subtotalOf(d.lineItems);
  const total = totalOf(d.lineItems, d.taxAmount);

  const customerBlock =
    esc(d.customerName) + "<br>" + d.addressLines.map(esc).join("<br>");
  const scopeBlock = d.scope.map(esc).join("<br>");
  const rows = d.lineItems
    .map(
      (i) =>
        `<div class="row"><div class="desc">${esc(i.desc)}</div>` +
        `<div class="amt">$${money(Number(i.amount) || 0)}</div></div>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page { size: Letter; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { background:#fff; }
body { font-family: Arial, Helvetica, sans-serif; color:#1a1a1a; -webkit-font-smoothing:antialiased; }
.page { width:8.5in; min-height:11in; padding:0.85in 0.8in; margin:0 auto; position:relative; background:#fff; }
.letterhead { text-align:center; margin-top:0.35in; }
.brand { font-family: Georgia,'Times New Roman',serif; font-weight:bold; letter-spacing:1px; }
.brand .widen { font-size:41px; color:#1a1a1a; }
.brand .sub { font-size:19px; color:${accent}; letter-spacing:5px; font-weight:bold; margin-left:8px; }
.contact { font-size:12px; color:#333; margin-top:6px; }
.contact .site { color:${accent}; }
.contact span { margin:0 10px; }
.rule { border:none; border-top:2px solid ${accent}; margin-top:10px; }
h1.title { text-align:center; font-size:26px; font-weight:bold; margin:36px 0 30px; letter-spacing:0.5px; }
.cols { width:100%; display:table; }
.col-l { display:table-cell; width:55%; vertical-align:top; }
.col-r { display:table-cell; width:45%; vertical-align:top; text-align:right; }
.sec-head { color:${accent}; font-size:18px; font-weight:bold; margin-bottom:8px; }
.info { font-size:13.5px; line-height:1.5; }
h2 { color:${accent}; font-size:18px; font-weight:bold; margin:26px 0 8px; }
p.body { font-size:13.5px; line-height:1.55; }
.pricing { margin-top:8px; }
.row { display:table; width:100%; padding:11px 4px 11px 18px; border-bottom:1px solid #e0e0e0; }
.row .desc { display:table-cell; font-size:13.5px; }
.row .amt { display:table-cell; text-align:right; font-size:13.5px; }
.totals { margin-top:18px; }
.trow { display:table; width:100%; padding:3px 4px; }
.trow .lbl { display:table-cell; text-align:right; font-size:13.5px; padding-right:70px; }
.trow .val { display:table-cell; text-align:right; font-size:13.5px; width:130px; }
.total-box { margin-top:22px; border:2px solid ${accent}; padding:16px 18px; display:table; width:100%; }
.total-box .lbl { display:table-cell; font-size:22px; font-weight:bold; }
.total-box .val { display:table-cell; text-align:right; font-size:22px; font-weight:bold; }
</style></head><body><div class="page">
  <div class="letterhead">
    <div class="brand"><span class="widen">${esc(branding.name)}</span><span class="sub">${esc(branding.sub)}</span></div>
    <div class="contact">
      <span class="site">${esc(branding.website)}</span>
      <span>${esc(branding.address)}</span>
      <span>${esc(branding.phone)}</span>
    </div>
    <hr class="rule">
  </div>
  <h1 class="title">${esc(branding.docTitle)}</h1>
  <div class="cols">
    <div class="col-l">
      <div class="sec-head">Customer</div>
      <div class="info">${customerBlock}</div>
    </div>
    <div class="col-r">
      <div class="sec-head">Estimate Details</div>
      <div class="info">Invoice No. ${esc(String(d.invoiceNo))}<br>Date: ${esc(d.date)}</div>
    </div>
  </div>
  <h2>Diagnosis</h2>
  <p class="body">${esc(d.diagnosis)}</p>
  <h2>Scope of Work</h2>
  <p class="body">${scopeBlock}</p>
  <h2>Project Pricing</h2>
  <div class="pricing">${rows}</div>
  <div class="totals">
    <div class="trow"><div class="lbl">Subtotal</div><div class="val">$${money(sub)}</div></div>
    <div class="trow"><div class="lbl">Tax</div><div class="val">$${money(Number(d.taxAmount) || 0)}</div></div>
  </div>
  <div class="total-box">
    <div class="lbl">TOTAL PRICE</div>
    <div class="val">$${money(total)}</div>
  </div>
</div></body></html>`;
}
