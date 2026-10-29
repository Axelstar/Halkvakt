// PUBLICERA — bygger appens snapshot och lägger den på CDN, helt utan GitHub Actions.
//
// Bakgrund (#72, 8/9 2026): Actions-minuterna tog slut 5/9 och publish-map dog med dem.
// Appen serverade 66 timmar gammal data; åldersspärren räddade oss från att ljuga, men
// vakten hade inget att säga. Den här funktionen är sista steget i kedjan
// Trafikverket → databas → CDN → app, och den kostar noll Actions-minuter.
//
// Kort #74: det här är den ENDA skrivaren av data/app/v1/. Frågorna och formatet bor i
// publish/snapshot-core.ts; den här filen är bara Deno-kopplingen (postgres.js, Git Data
// API, auth). index.ts är GENERERAD av scripts/bundle-publicera.ts ur kärnorna + broarna
// (data/bridges.geojson) + den här filen — ändra aldrig i index.ts, ändra här och bunta.
// Kort #77: kartsajtens lager (publish/map-core.ts) publiceras HÄRIFRÅN också, i samma
// commit, var 30:e minut (körningarna :00 och :30; `?karta=1` tvingar) — publish-map.yml
// hade kvar sin egen cron och hade ensam ätit oktoberpotten på tre veckor. Kadensen är
// DECISIONS #22:s löfte (≤ 35 min) och issue #4:s halvtimmesserie, oförändrad.
// CI kör --check. Efter varje ändring: bunta + `supabase functions deploy publicera`,
// och beviset är en färsk commit i kartrepot med ALLA TRE filerna, inte deploy-kvittot.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { nyckelGiltig } from "../_shared/nyckel.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const REPO = "Axelstar/halkvakt-karta";
const token = Deno.env.get("PUBLISH_TOKEN")!;
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
/** pg_cron:s takt för halkvakt-publicera i minuter (sql/074, DECISIONS #741 punkt 3). GitHub och kartan väljs på minuten med den som
 *  fönster, så att de skrivs var tionde och var 30:e minut som förut; kontraktsgrinden vaktar att sql/074 bär samma tal. */
const PUBLICERA_TAKT_MIN = 2;

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** En commit med alla filerna via Git Data API — inget git, inga Actions-minuter. `inline` går som innehåll direkt i
 *  trädanropet (länssidorna, #458): alla sidor och deras data utan ett blob-anrop per fil. */
async function publicera(files: Record<string, string>, inline: Record<string, string> = {}) {
  const branch = await gh("/branches/main");
  const baseCommit = branch.commit.sha, baseTree = branch.commit.commit.tree.sha;
  const entries: Record<string, string>[] = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await gh("/git/blobs", "POST", { content: btoa(unescape(encodeURIComponent(content))), encoding: "base64" });
    entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  for (const [path, content] of Object.entries(inline)) entries.push({ path, mode: "100644", type: "blob", content });
  const tree = await gh("/git/trees", "POST", { base_tree: baseTree, tree: entries });
  if (tree.sha === baseTree) return null;              // inget nytt att säga
  const commit = await gh("/git/commits", "POST", {
    message: `data: ${new Date().toISOString()} (Supabase)`, tree: tree.sha, parents: [baseCommit] });
  await gh("/git/refs/heads/main", "PATCH", { sha: commit.sha });
  return commit.sha.slice(0, 7);
}

/** Appens tre filer i den publika hinken `app` (DECISIONS #741 punkt 2, sql/073): static och live först och manifestet sist, så att
 *  manifestet aldrig pekar på en fil som inte är skriven. `v1/…` i hinken ger manifestets `app/v1/…` under storage/v1/object/public/.
 *  no-cache: appen prövar filen mot manifestets sha256, och en fil som legat kvar i en cache från förra körningen fäller provet. */
async function skrivHinken(files: Record<string, string>) {
  const skriv = async (namn: string) => {
    const r = await fetch(`${SB}/storage/v1/object/app/v1/${namn}`, { method: "POST", body: files[`data/app/v1/${namn}`],
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache" } });
    if (!r.ok) throw new Error(`hinken ${namn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  };
  await Promise.all([skriv("static.json"), skriv("live.json")]);
  await skriv("manifest.json");
}

Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const t0 = Date.now();
  try {
    // GRANNLÄNDERNA (kort #238; Bengts princip 22/9: återkommande körningar i Supabase, inte i Actions): ?land=fi|no|dk
    // bygger ett lands skuggsnapshot, ?land=grannar alla tre i EN commit. Samma skrivare som Sverige, noll Actions-minuter.
    const land = new URL(req.url).searchParams.get("land");
    if (land) {
      const lander = land === "grannar" ? [...GRANNAR] : [land as Granne];
      if (!lander.every((l) => (GRANNAR as readonly string[]).includes(l)))
        return new Response(JSON.stringify({ ok: false, error: `okänt land: ${land}` }), { status: 400 });
      const q: Q = (text, params) => sql.unsafe(text, (params ?? []) as any[]) as unknown as Promise<Record<string, any>[]>;
      const files: Record<string, string> = {};
      const ut: Record<string, unknown> = {};
      for (const l of lander) {
        const { staticDoc, liveDoc } = await buildGrannSnapshot(q, l);
        const sStatic = JSON.stringify(staticDoc), sLive = JSON.stringify(liveDoc);
        const manifest = await manifestFor(liveDoc.generated_at, { static: sStatic, live: sLive }, `app/${l}/v1`);
        files[`data/app/${l}/v1/static.json`] = sStatic;
        files[`data/app/${l}/v1/live.json`] = sLive;
        files[`data/app/${l}/v1/manifest.json`] = JSON.stringify(manifest);
        ut[l] = { generated_at: liveDoc.generated_at, weather: liveDoc.weather.length, deviations: liveDoc.deviations.length };
      }
      const sha = await publicera(files);
      return new Response(JSON.stringify({ ok: true, land, sha, ...ut, ms: Date.now() - t0 }), { headers: { "Content-Type": "application/json" } });
    }
    // Tiden per del (DECISIONS #741 punkt 1): bygget av lägesfilen, kartan och GitHub var för sig, så att det syns om en körning med
    // bara hinken ryms varannan minut. Svarets `ms` är summan som förut.
    const tider: Record<string, number> = {};
    let tDel = Date.now();
    const { staticDoc, liveDoc, border, notes, delar } = await buildSnapshot(
      (text, params) => sql.unsafe(text, (params ?? []) as any[]) as unknown as Promise<Record<string, any>[]>,
      BRIDGES);
    const sStatic = JSON.stringify(staticDoc), sLive = JSON.stringify(liveDoc);
    const manifest = await manifestFor(liveDoc.generated_at, { static: sStatic, live: sLive });
    tider.bygget = Date.now() - tDel;
    const files: Record<string, string> = {
      "data/app/v1/static.json": sStatic,
      "data/app/v1/live.json": sLive,
      "data/app/v1/manifest.json": JSON.stringify(manifest),
    };
    // Hinken före GitHub (#741 punkt 2), så att filerna ligger där så fort de är byggda. Ett fel stoppar inte GitHub, som kartan och de
    // installerade apparna läser; det står i svaret med Storage-svarets kropp.
    tDel = Date.now();
    let hinken = "ok";
    try { await skrivHinken(files); } catch (e) { hinken = String((e as Error).message ?? e); }
    tider.hinken = Date.now() - tDel;
    // Kartlagren var 30:e minut (#77) och GitHub var tionde (#741 punkt 3), ur minuten när körningen startade; pg_cron fyrar varannan
    // minut (:00, :02 …). Hinken ovan skrivs varje körning. `?karta=1` tvingar båda.
    const minut = new Date(t0).getUTCMinutes();
    const karta = new URL(req.url).searchParams.get("karta") === "1" || minut % 30 < PUBLICERA_TAKT_MIN;
    const github = karta || minut % 10 < PUBLICERA_TAKT_MIN;
    let kartaStats: unknown = null;
    const inline: Record<string, string> = {};
    if (karta) {
      tDel = Date.now();
      const m = await buildMapData(
        (text, params) => sql.unsafe(text, (params ?? []) as any[]) as unknown as Promise<Record<string, any>[]>,
        { trvKey: Deno.env.get("TRAFIKVERKET_API_KEY"), appVader: liveDoc.weather, appKandidat: liveDoc.kandidat });
      for (const [name, json] of Object.entries(m.files)) files[`data/${name}`] = json;
      notes.push(...m.notes);
      kartaStats = m.stats;
      // Läns- och vägsidorna (#458) i sajtens rot, och Axels sitemap med de adresser som saknas. Fail-soft: går sitemapen inte att
      // läsa skrivs sidorna ändå, och noten säger varför.
      if (m.sidor) {
        Object.assign(inline, m.sidor);
        try {
          const sm = await gh("/contents/sitemap.xml");
          const xml = new TextDecoder().decode(Uint8Array.from(atob(String(sm.content).replace(/\n/g, "")), (c) => c.charCodeAt(0)));
          const ny = sitemapMed(xml, sidAdresser());
          if (ny) inline["sitemap.xml"] = ny;
        } catch (e) { notes.push(`sitemap: ej läsbar (${String((e as Error).message).slice(0, 120)}) — länssidorna skrivs ändå`); }
      }
      tider.kartan = Date.now() - tDel;
    }
    let sha: string | null = null;
    if (github) {
      tDel = Date.now();
      sha = await publicera(files, inline);
      tider.github = Date.now() - tDel;
    }
    return new Response(JSON.stringify({ ok: true, sha, generated_at: liveDoc.generated_at,
      segments: liveDoc.segments.length, kandidat: liveDoc.kandidat?.length ?? null, weather: liveDoc.weather.length,
      deviations: liveDoc.deviations.length, wildlife: liveDoc.wildlife.length,
      bridges: liveDoc.bridges.length, smhi: liveDoc.smhi.length,
      cameras: staticDoc.cameras.length, border, notes,
      live_gz_bytes: manifest.files.live.gz_bytes,
      karta: kartaStats, lanssidor: Object.keys(inline).length, github, hinken, tider, bygget_delar: delar, ms: Date.now() - t0 }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
