import { NextResponse } from "next/server";
import { encryptData } from "@/lib/crypto";

// ─── URL CONFIG ──────────────────────────────────────────────────────────────
// Primary: your own Vercel deployment (set NEXT_PUBLIC_SITE_URL in env)
// Fallback: sansekai public API (used if primary fails)
export const PRIMARY_API =
  process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") + "/api"
    : null;

export const FALLBACK_API = "https://api.sansekai.my.id/api";

// ─── FETCH WITH FALLBACK ─────────────────────────────────────────────────────
// Tries PRIMARY first. If it fails (network error / non-ok status), falls back
// to FALLBACK_API automatically. Returns the raw Response.
export async function fetchWithFallback(path: string): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (PRIMARY_API && PRIMARY_API !== FALLBACK_API) {
    const primaryUrl = `${PRIMARY_API}${normalizedPath}`;
    try {
      const res = await fetch(primaryUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        console.log(`[API] PRIMARY ok: ${primaryUrl}`);
        return res;
      }
      console.warn(`[API] PRIMARY failed (${res.status}): ${primaryUrl} → trying fallback`);
    } catch (err) {
      console.warn(`[API] PRIMARY error: ${primaryUrl} →`, (err as Error).message, "→ trying fallback");
    }
  }

  // Fallback to sansekai
  const fallbackUrl = `${FALLBACK_API}${normalizedPath}`;
  console.log(`[API] FALLBACK: ${fallbackUrl}`);
  return fetch(fallbackUrl, { cache: "no-store" });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(`Empty response from upstream: ${response.url}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Raw Text (truncated):", text.substring(0, 200));
    throw new Error("Invalid JSON response from upstream");
  }
}

export function encryptedResponse(data: any, status = 200) {
  const encrypted = encryptData(data);
  return NextResponse.json({ success: true, data: encrypted }, { status });
}
