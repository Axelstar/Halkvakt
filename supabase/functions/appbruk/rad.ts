// appbruk: vad som sparas (DECISIONS #746). Ren — inga Deno-anrop — så att test/appbruk.test.ts kan köra den i Node.
export const KANALER = ["appstore", "testflight", "debug"];

/** Raden som sparas, eller null när kroppen inte har rätt form. */
export function rad(d: unknown, idag: string): { dag: string; kanal: string; ver: string; r: Record<string, number> } | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  if (typeof o.dag !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.dag) || o.dag >= idag) return null;   // bara avslutade dygn
  const minst = new Date(Date.parse(idag + "T00:00:00Z") - 30 * 864e5).toISOString().slice(0, 10);
  if (o.dag < minst) return null;
  if (typeof o.kanal !== "string" || !KANALER.includes(o.kanal)) return null;
  const ver = typeof o.ver === "string" && /^[0-9.]{1,12}$/.test(o.ver) ? o.ver : "";
  if (!o.r || typeof o.r !== "object" || Array.isArray(o.r)) return null;
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(o.r as Record<string, unknown>).slice(0, 40)) {
    if (/^[a-z_]{2,24}$/.test(k) && Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 999) r[k] = v as number;
  }
  return Object.keys(r).length ? { dag: o.dag, kanal: o.kanal, ver, r } : null;
}

