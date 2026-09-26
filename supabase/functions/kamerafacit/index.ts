// ═══ Kamerafacit V2 och V3 (Bengts ja 26/9, DECISIONS #380; docs/UTREDNING-FARTKAMEROR-2026-09-26.md §7) ═══
// Anropas av pg_cron varje timme på minut 17 (inte :00/:30, där kort #244:s resursgräns slår). Urvalet är rent och prövat
// (urval.ts, test/kamerafacit.test.ts); här bor bara hämtningen och uppladdningen.
//
// V2 — bilden vid väglagskameran närmast varje AKTUELL frysrisk i hela landet (live.json: väderpunkter och broar), inte bara längs
//      skuggrutterna. Dagsljus ⇒ en i timmen; mörker ⇒ en per kamera och natt. Tak V2_TAK per dygn.
// V3 — tystnadsstickprovet: två bilder i timmen vid kalla stationer (yta ≤ 3 °C, #75:s vakt, färsk) som INTE är en fara, i dagsljus.
//
// Bilderna läses först i mars (blindningen, DECISIONS #335) och ligger i facit-hinken under v2/ och v3/. ?torrt=1 visar urvalet
// utan att hämta eller spara något — dbknappens kamerafacitprov.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { type Kamera, type Punkt, STATION_M, V2_TAK, dagsljus, haversineM, kamerorVidFaror, taV2, valjStickprov, vag } from "./urval.ts";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const LIVE = "https://axelstar.github.io/halkvakt-karta/data/app/v1/live.json";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

async function kameror(): Promise<Kamera[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="Camera" schemaversion="1" limit="1500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  if (!r.ok) throw new Error(`TRV ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const rows = (await r.json())?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
  return rows.flatMap((c: any) => {
    const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
    return m && c.PhotoUrl ? [{ id: String(c.Id), lon: +m[1], lat: +m[2], url: c.PhotoUrl }] : [];
  });
}

async function spara(k: Kamera, sokvag: string): Promise<string> {
  const bild = await fetch(k.url).catch(() => null);
  if (!bild?.ok) return `bildhämtning ${bild ? bild.status : "kastade"}`;
  const up = await fetch(`${SB}/storage/v1/object/facit/${sokvag}`, {
    method: "POST", headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "image/jpeg" }, body: await bild.arrayBuffer() });
  if (up.ok) return "sparad";
  if (up.status === 409) return "fanns redan";
  return `uppladdning ${up.status}: ${(await up.text().catch(() => "")).slice(0, 120)}`;
}

Deno.serve(async (req) => {
  const nyckel = Deno.env.get("INGEST_KEY");
  if (!nyckel || req.headers.get("x-halkvakt-key") !== nyckel) return new Response("forbidden", { status: 403 });
  const torrt = new URL(req.url).searchParams.get("torrt") === "1";
  const nu = new Date();
  const timme = Math.floor(nu.getTime() / 3_600_000);
  try {
    const [kams, live] = await Promise.all([kameror(), fetch(LIVE).then((r) => r.json())]);
    if (!kams.length) throw new Error("TRV gav noll väglagskameror");

    // V2 — frysriskerna i snapshoten, samma id som motorns (wx:, bro:).
    const faror: Punkt[] = [
      ...(live.weather ?? []).map((w: any) => ({ id: `wx:${w.id}`, lon: +w.lon, lat: +w.lat })),
      ...(live.bridges ?? []).map((b: any) => ({ id: `bro:${b.id}`, lon: +b.lon, lat: +b.lat })),
    ];
    const vidFaror = kamerorVidFaror(faror, kams);
    const [{ n: v2IDag }] = await sql`SELECT count(*)::int AS n FROM storage.objects
      WHERE bucket_id = 'facit' AND name LIKE 'v2/%' AND created_at >= date_trunc('day', now())`;
    const nattbilder = new Set((await sql`SELECT DISTINCT split_part(split_part(name, '/', 3), '-h', 1) AS k FROM storage.objects
      WHERE bucket_id = 'facit' AND name LIKE 'v2/%' AND created_at > now() - interval '12 hours'`).map((r: any) => r.k));
    const v2 = vidFaror.filter((k) => taV2(dagsljus(k, nu), nattbilder.has(k.id))).slice(0, Math.max(0, V2_TAK - v2IDag));

    // V3 — kalla stationer UTAN fara, med en kamera vid stationen. #75:s vakt och färskhet som grindarna.
    const farligt = new Set(faror.map((f) => f.id));
    const kalla = await sql`SELECT station_id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM weather_latest
      WHERE surface_temp_c <= 3 AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
        AND sample_time > now() - interval '3 hours'`;
    const kandidater: Kamera[] = [];
    for (const s of kalla as any[]) {
      if (farligt.has(`wx:${s.station_id}`)) continue;
      const k = kams.find((c) => haversineM(+s.lon, +s.lat, c.lon, c.lat) <= STATION_M);
      if (k && !kandidater.some((x) => x.id === k.id) && !v2.some((x) => x.id === k.id)) kandidater.push(k);
    }
    const v3 = valjStickprov(kandidater, timme, nu);

    const utfall: Record<string, number> = {};
    const rakna = (s: string) => { utfall[s] = (utfall[s] ?? 0) + 1; };
    if (!torrt) {
      for (const k of v2) rakna(`v2 ${await spara(k, vag("v2", nu, k.id))}`);
      for (const k of v3) rakna(`v3 ${await spara(k, vag("v3", nu, k.id))}`);
    }
    return new Response(JSON.stringify({ ok: true, torrt, faror: faror.length, kameror_vid_faror: vidFaror.length, v2_i_dag: v2IDag,
      v2: v2.map((k) => k.id), kalla_stationer: kalla.length, v3_kandidater: kandidater.length, v3: v3.map((k) => k.id), utfall }),
      { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, fel: String(e).slice(0, 300) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
