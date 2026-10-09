// ═══ Arkivdumpen i hinken (kort #312, DECISIONS #495; Bengt 9/10: "gör b") ═══
// Veckokopian (arkivbackup.yml) laddades upp som GitHub-release. Med ett publikt repo blir releaserna publika, och kopian
// bär hela public-schemat — också testarnas svar och missar. Nu går den till den privata hinken `arkiv` i Supabase.
// Funktionen rör aldrig själva filerna: den ger SIGNERADE adresser, så att jobbet i Actions laddar upp och hämtar delarna
// direkt mot Storage utan att någon nyckel lämnar Supabase, och den gallrar de kopior som är äldre än de fyra senaste.
//   POST ?lage=ladda_upp  {namn, delar}  → { urls: [...] }   en adress per del, giltig i två timmar
//   POST ?lage=hamta      {namn}         → { delar: [{fil, bytes, url}] }   för provet efter uppladdningen och för återläsning
//   POST ?lage=gallra     {}             → { raderade: [...] }   behåller de fyra senaste kopiorna
// Kuvösens filer som inte får ligga i en publik release (kort #311, DECISIONS #499) — Trafikverkets leverans — ligger i samma hink
// under kuvos/<release>/<fil>, en fil per tillgång (alla under 50 MB):
//   POST ?lage=kuvos_ladda_upp  {filer: ["kuvos-trv-2024-25/Halkvakt_2411.csv.gz", …]}  → { urls: [...] }
//   POST ?lage=kuvos_hamta      {filer: [...]}                                          → { filer: [{fil, url}] }
// Skyddet är INGEST_KEY i x-halkvakt-key, som pg_cron:s jobb redan bär; funktionen deployas med --no-verify-jwt.
import { BEHALL, MAPP, NAMN, attGallra, delnamn, dumpAv, kuvosnamn } from "./delar.ts";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" };
const HINK = "arkiv";

async function storage(sokvag: string, metod: string, kropp?: unknown): Promise<any> {
  const r = await fetch(`${SB}/storage/v1${sokvag}`, { method: metod, headers: H, body: kropp === undefined ? undefined : JSON.stringify(kropp) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${metod} ${sokvag.split("?")[0]} ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

async function lista(): Promise<{ name: string; metadata?: { size?: number } }[]> {
  const ut: { name: string; metadata?: { size?: number } }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const sida = await storage(`/object/list/${HINK}`, "POST", { prefix: MAPP, limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    ut.push(...sida);
    if (sida.length < 1000) return ut;
  }
}

const svar = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  if (req.method !== "POST") return svar({ fel: "bara POST" }, 405);
  const lage = new URL(req.url).searchParams.get("lage");
  try {
    const kropp = await req.json().catch(() => ({}));
    if (lage === "ladda_upp") {
      const { namn, delar } = kropp as { namn: string; delar: number };
      if (!NAMN.test(String(namn))) return svar({ fel: `ogiltigt dumpnamn: ${namn}` }, 400);
      const urls: string[] = [];
      for (let i = 0; i < Number(delar); i++) {
        const s = await storage(`/object/upload/sign/${HINK}/${delnamn(namn, i)}`, "POST", {});
        urls.push(`${SB}/storage/v1${s.url}`);
      }
      return svar({ urls });
    }
    if (lage === "hamta") {
      const { namn } = kropp as { namn: string };
      if (!NAMN.test(String(namn))) return svar({ fel: `ogiltigt dumpnamn: ${namn}` }, 400);
      const filer = (await lista()).filter((f) => dumpAv(f.name) === namn);
      const delar = [];
      for (const f of filer) {
        const s = await storage(`/object/sign/${HINK}/${MAPP}/${f.name}`, "POST", { expiresIn: 7200 });
        delar.push({ fil: f.name, bytes: f.metadata?.size ?? null, url: `${SB}/storage/v1${s.signedURL}` });
      }
      return svar({ delar });
    }
    if (lage === "gallra") {
      const filer = (await lista()).map((f) => f.name);
      const bort = attGallra(filer, BEHALL);
      if (bort.length) await storage(`/object/${HINK}`, "DELETE", { prefixes: bort });
      const borta = new Set(bort);
      const kvar = new Set(filer.filter((f) => !borta.has(`${MAPP}/${f}`)).map(dumpAv).filter((d) => d !== null)).size;
      return svar({ raderade: bort, kopior_kvar: kvar });
    }
    if (lage === "kuvos_ladda_upp" || lage === "kuvos_hamta") {
      const filer = (kropp as { filer?: unknown }).filer;
      if (!Array.isArray(filer) || !filer.length || filer.length > 20) return svar({ fel: "filer: 1–20 namn" }, 400);
      const sokvagar = filer.map((f) => kuvosnamn(String(f)));   // kastar vid ett namn utanför mönstret, innan något signeras
      if (lage === "kuvos_ladda_upp") {
        const urls: string[] = [];
        for (const s of sokvagar) urls.push(`${SB}/storage/v1${(await storage(`/object/upload/sign/${HINK}/${s}`, "POST", {})).url}`);
        return svar({ urls });
      }
      const ut = [];
      for (let i = 0; i < sokvagar.length; i++)
        ut.push({ fil: filer[i], url: `${SB}/storage/v1${(await storage(`/object/sign/${HINK}/${sokvagar[i]}`, "POST", { expiresIn: 7200 })).signedURL}` });
      return svar({ filer: ut });
    }
    return svar({ fel: `okänt läge: ${lage}` }, 400);
  } catch (e) {
    return svar({ fel: String(e).slice(0, 400) }, 500);
  }
});
