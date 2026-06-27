"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { branding } from "@/lib/branding";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-black/5">
        <div className="text-center mb-6">
          <div className="font-serif font-bold text-3xl tracking-wide">{branding.name}</div>
          <div
            className="text-sm font-bold tracking-[0.3em] mt-1"
            style={{ color: branding.accent }}
          >
            {branding.sub}
          </div>
          <div className="text-xs text-black/50 mt-3">{branding.appName}</div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-black/15 focus:outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as any]: branding.accent }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ background: branding.accent }}
          >
            {loading ? "Checking\u2026" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
