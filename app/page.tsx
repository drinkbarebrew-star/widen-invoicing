"use client";

import { useEffect, useRef, useState } from "react";
import { branding } from "@/lib/branding";
import {
  type EstimateData,
  type LineItem,
  subtotalOf,
  totalOf,
  money,
} from "@/lib/estimate";
import EstimatePreview, { type PreviewHandle } from "@/components/EstimatePreview";

function todayMDY() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const previewRef = useRef<PreviewHandle>(null);

  // form state
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState(""); // multiline
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [dateStr, setDateStr] = useState(todayMDY());
  const [diagnosis, setDiagnosis] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(
    parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TAX_RATE || "0") || 8.25
  );
  const [taxMode, setTaxMode] = useState<"rate" | "flat">("rate");
  const [flatTax, setFlatTax] = useState<number>(0);

  const [logState, setLogState] = useState<{ ok?: boolean; url?: string; error?: string } | null>(null);
  const [logging, setLogging] = useState(false);

  // fetch next invoice number on load
  useEffect(() => {
    fetch("/api/invoice-number")
      .then((r) => r.json())
      .then((d) => {
        if (d.invoiceNo) setInvoiceNo(String(d.invoiceNo));
      })
      .catch(() => {});
  }, []);

  const subtotal = subtotalOf(lineItems);
  const taxAmount =
    taxMode === "flat"
      ? Number(flatTax) || 0
      : Math.round(subtotal * (Number(taxRate) || 0)) / 100;
  const total = totalOf(lineItems, taxAmount);

  const estimateData: EstimateData = {
    customerName: customerName || "Customer",
    addressLines: address.split("\n").map((l) => l.trim()).filter(Boolean),
    invoiceNo: invoiceNo || "—",
    date: dateStr,
    diagnosis,
    scope,
    lineItems,
    taxAmount,
  };

  async function generate() {
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed.");
      setDiagnosis(d.diagnosis || "");
      setScope(d.scope || []);
      setLineItems(d.lineItems || []);
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function updateItem(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setLineItems((prev) => [...prev, { desc: "", amount: 0 }]);
  }
  function removeItem(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateScope(i: number, val: string) {
    setScope((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  }
  function addScope() {
    setScope((prev) => [...prev, ""]);
  }
  function removeScope(i: number) {
    setScope((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function logToNotion() {
    setLogging(true);
    setLogState(null);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: estimateData.customerName,
          address: estimateData.addressLines.join(", "),
          invoiceNo: invoiceNo,
          date: todayISO(),
          subtotal,
          tax: taxAmount,
          total,
          lineDescs: lineItems.map((i) => i.desc),
          status: "Quoted",
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Log failed.");
      setLogState({ ok: true, url: d.url });
    } catch (e: any) {
      setLogState({ ok: false, error: e.message });
    } finally {
      setLogging(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  const accent = branding.accent;
  const label = "block text-xs font-semibold text-black/60 mb-1";
  const input =
    "w-full px-3 py-2 rounded-lg border border-black/15 focus:outline-none focus:ring-2 bg-white text-sm";

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b border-black/10 bg-white">
        <div className="flex items-baseline gap-2">
          <span className="font-serif font-bold text-2xl tracking-wide">{branding.name}</span>
          <span className="text-xs font-bold tracking-[0.25em]" style={{ color: accent }}>
            {branding.sub}
          </span>
          <span className="text-xs text-black/40 ml-3">{branding.appName}</span>
        </div>
        <button onClick={logout} className="text-xs text-black/50 hover:text-black underline">
          Sign out
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-[1400px] mx-auto">
        {/* LEFT: controls */}
        <div className="space-y-5">
          {/* AI generator */}
          <section className="bg-white rounded-xl p-5 border border-black/10">
            <h2 className="font-semibold mb-2">1 · Describe the job</h2>
            <p className="text-xs text-black/50 mb-3">
              Type what the tech found and the prices, in plain English. Claude turns it into a
              diagnosis, scope, and itemized pricing you can edit.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Deep clean two flues, 22ft and 18ft. Two fireboxes need restoration incl rust. Flash seal the rooftop. 418, 522, 898, 199."
              className={input}
            />
            <button
              onClick={generate}
              disabled={generating || !notes.trim()}
              className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: accent }}
            >
              {generating ? "Generating…" : "Generate with AI"}
            </button>
            {genError && <p className="text-sm text-red-600 mt-2">{genError}</p>}
          </section>

          {/* Customer + meta */}
          <section className="bg-white rounded-xl p-5 border border-black/10">
            <h2 className="font-semibold mb-3">2 · Customer & details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label}>Customer name</label>
                <input className={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={label}>Address (one line per row)</label>
                <textarea className={input} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={label}>Invoice No.</label>
                <input className={input} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>
              <div>
                <label className={label}>Date</label>
                <input className={input} value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Diagnosis + scope */}
          <section className="bg-white rounded-xl p-5 border border-black/10">
            <h2 className="font-semibold mb-3">3 · Diagnosis & scope</h2>
            <label className={label}>Diagnosis</label>
            <textarea className={input} rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            <div className="flex items-center justify-between mt-4 mb-1">
              <label className={label + " mb-0"}>Scope of work</label>
              <button onClick={addScope} className="text-xs underline" style={{ color: accent }}>
                + line
              </button>
            </div>
            <div className="space-y-2">
              {scope.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={input} value={s} onChange={(e) => updateScope(i, e.target.value)} />
                  <button onClick={() => removeScope(i)} className="text-black/30 hover:text-red-600 px-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Line items */}
          <section className="bg-white rounded-xl p-5 border border-black/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">4 · Pricing</h2>
              <button onClick={addItem} className="text-xs underline" style={{ color: accent }}>
                + item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={input + " flex-1"}
                    placeholder="Description"
                    value={it.desc}
                    onChange={(e) => updateItem(i, { desc: e.target.value })}
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-sm">$</span>
                    <input
                      className={input + " pl-6 text-right"}
                      type="number"
                      step="0.01"
                      value={it.amount}
                      onChange={(e) => updateItem(i, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <button onClick={() => removeItem(i)} className="text-black/30 hover:text-red-600 px-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Tax */}
            <div className="mt-4 pt-4 border-t border-black/10">
              <div className="flex items-center gap-3 mb-2">
                <label className={label + " mb-0"}>Tax</label>
                <select
                  value={taxMode}
                  onChange={(e) => setTaxMode(e.target.value as any)}
                  className="text-xs border border-black/15 rounded px-2 py-1"
                >
                  <option value="rate">Rate %</option>
                  <option value="flat">Flat $</option>
                </select>
                {taxMode === "rate" ? (
                  <input
                    className="w-20 px-2 py-1 text-sm border border-black/15 rounded text-right"
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <input
                    className="w-24 px-2 py-1 text-sm border border-black/15 rounded text-right"
                    type="number"
                    step="0.01"
                    value={flatTax}
                    onChange={(e) => setFlatTax(parseFloat(e.target.value) || 0)}
                  />
                )}
              </div>
              <div className="text-sm space-y-1 text-right">
                <div className="text-black/60">Subtotal: ${money(subtotal)}</div>
                <div className="text-black/60">Tax: ${money(taxAmount)}</div>
                <div className="font-bold text-base">Total: ${money(total)}</div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="bg-white rounded-xl p-5 border border-black/10 flex flex-wrap gap-3">
            <button
              onClick={() => previewRef.current?.print()}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ background: "#1f1108" }}
            >
              Download PDF
            </button>
            <button
              onClick={logToNotion}
              disabled={logging || !lineItems.length}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: accent }}
            >
              {logging ? "Logging…" : "Log to Notion"}
            </button>
            {logState?.ok && (
              <a href={logState.url} target="_blank" className="text-sm self-center underline" style={{ color: accent }}>
                ✓ Logged — open in Notion
              </a>
            )}
            {logState?.error && <span className="text-sm text-red-600 self-center">{logState.error}</span>}
          </section>
        </div>

        {/* RIGHT: live preview */}
        <div className="lg:sticky lg:top-6 self-start">
          <h2 className="font-semibold mb-2 text-sm text-black/60">Live preview</h2>
          <EstimatePreview ref={previewRef} data={estimateData} />
        </div>
      </div>
    </div>
  );
}
