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

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const REPO = "Axelstar/halkvakt-karta";
const token = Deno.env.get("PUBLISH_TOKEN")!;

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
 *  trädanropet (länssidorna, #458): 22 sidor utan 22 extra blob-anrop. */
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

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
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
    const { staticDoc, liveDoc, border, notes } = await buildSnapshot(
      (text, params) => sql.unsafe(text, (params ?? []) as any[]) as unknown as Promise<Record<string, any>[]>,
      BRIDGES);
    const sStatic = JSON.stringify(staticDoc), sLive = JSON.stringify(liveDoc);
    const manifest = await manifestFor(liveDoc.generated_at, { static: sStatic, live: sLive });
    const files: Record<string, string> = {
      "data/app/v1/static.json": sStatic,
      "data/app/v1/live.json": sLive,
      "data/app/v1/manifest.json": JSON.stringify(manifest),
    };
    // Kartlagren var 30:e minut (#77). Minuten läses vid start; pg_cron fyrar :00,:10,…
    const karta = new URL(req.url).searchParams.get("karta") === "1" || new Date().getUTCMinutes() % 30 < 10;
    let kartaStats: unknown = null;
    const inline: Record<string, string> = {};
    if (karta) {
      const m = await buildMapData(
        (text, params) => sql.unsafe(text, (params ?? []) as any[]) as unknown as Promise<Record<string, any>[]>,
        { trvKey: Deno.env.get("TRAFIKVERKET_API_KEY"), appVader: liveDoc.weather });
      for (const [name, json] of Object.entries(m.files)) files[`data/${name}`] = json;
      notes.push(...m.notes);
      kartaStats = m.stats;
      // Länssidorna (#458) i sajtens rot, och Axels sitemap med de adresser som saknas. Fail-soft: går sitemapen inte att
      // läsa skrivs sidorna ändå, och noten säger varför.
      if (m.sidor) {
        Object.assign(inline, m.sidor);
        try {
          const sm = await gh("/contents/sitemap.xml");
          const xml = new TextDecoder().decode(Uint8Array.from(atob(String(sm.content).replace(/\n/g, "")), (c) => c.charCodeAt(0)));
          const ny = sitemapMed(xml, lanAdresser());
          if (ny) inline["sitemap.xml"] = ny;
        } catch (e) { notes.push(`sitemap: ej läsbar (${String((e as Error).message).slice(0, 120)}) — länssidorna skrivs ändå`); }
      }
    }
    const sha = await publicera(files, inline);
    return new Response(JSON.stringify({ ok: true, sha, generated_at: liveDoc.generated_at,
      segments: liveDoc.segments.length, weather: liveDoc.weather.length,
      deviations: liveDoc.deviations.length, wildlife: liveDoc.wildlife.length,
      bridges: liveDoc.bridges.length, smhi: liveDoc.smhi.length,
      cameras: staticDoc.cameras.length, border, notes,
      live_gz_bytes: manifest.files.live.gz_bytes,
      karta: kartaStats, lanssidor: Object.keys(inline).length, ms: Date.now() - t0 }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
