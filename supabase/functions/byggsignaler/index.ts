// ═══ Byggsignalerna (kort #288, DECISIONS #447) ═══
// Anropas av pg_cron varje timme på minut 23 (inte :00/:30, där kort #244:s resursgräns slår). Läser det Bengt och Axel gör
// utanför repot — App Store Connect (byggen, granskning, installationer per bygge, testarna i grupperna) och förarsvaren per
// appversion — och skriver tabellen byggsignaler (sql/041; första gången något syns är beviset) och ett ärende i repot som
// kartsynken läser (scripts/kartsynk.ts) med den lokala GitHub-inloggningen, så att ingen databasnyckel behövs på datorn.
//
// Utan Axels nyckel (ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY i Supabase secrets) skrivs asc/status = {ok:false, fel}:
// tyst frånvaro vore ett tyst aldrig (#447 punkt 3). ?torrt=1 visar raderna utan att skriva något.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { type Lagrad, type Rad, ISSUE_TITEL, anvandning, appStoreRader, ascToken, byggRader, facitRader, gruppRad, issueKropp, tillstandsRader } from "./signaler.ts";

const BUNDLE = "se.halkvakt.app";
const REPO = "Axelstar/Halkvakt";
const ASC = "https://api.appstoreconnect.apple.com";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

async function asc(): Promise<Rad[]> {
  const iss = Deno.env.get("ASC_ISSUER_ID"), kid = Deno.env.get("ASC_KEY_ID"), pem = Deno.env.get("ASC_PRIVATE_KEY");
  const saknas = [!iss && "ASC_ISSUER_ID", !kid && "ASC_KEY_ID", !pem && "ASC_PRIVATE_KEY"].filter(Boolean);
  if (saknas.length) return [{ kalla: "asc", nyckel: "status", varde: { ok: false, fel: `nyckeln saknas i Supabase secrets: ${saknas.join(", ")}` } }];
  try {
    const token = await ascToken(iss!, kid!, pem!, new Date());
    const get = async (p: string) => {
      const r = await fetch(ASC + p, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`App Store Connect ${r.status} ${p.split("?")[0]}: ${(await r.text()).slice(0, 300)}`);
      return r.json();
    };
    const app = (await get(`/v1/apps?filter[bundleId]=${BUNDLE}&fields[apps]=bundleId`)).data?.[0];
    if (!app) throw new Error(`appen ${BUNDLE} syns inte för nyckeln`);
    const rader = byggRader(await get(`/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=10` +
      "&include=preReleaseVersion,buildBetaDetail&fields[builds]=version,uploadedDate,processingState,expired,preReleaseVersion,buildBetaDetail" +
      "&fields[preReleaseVersions]=version&fields[buildBetaDetails]=internalBuildState,externalBuildState"));
    for (const b of rader.slice(0, 5)) {
      if (b.varde.behandling !== "VALID") continue;
      const a = anvandning(b.varde.nr as number, await get(`/v1/builds/${b.varde.id}/metrics/betaBuildUsages`));
      if (a) rader.push(a);
    }
    rader.push(...appStoreRader(await get(`/v1/apps/${app.id}/appStoreVersions?fields[appStoreVersions]=versionString,appVersionState,appStoreState,createdDate&limit=5`)));
    for (const g of (await get(`/v1/apps/${app.id}/betaGroups?fields[betaGroups]=name,isInternalGroup,publicLinkEnabled&limit=20`)).data ?? []) {
      let antal = 0;
      let sida: string | null = `/v1/betaGroups/${g.id}/relationships/betaTesters?limit=200`;
      for (let i = 0; sida && i < 5; i++) {
        const s = await get(sida);
        antal += (s.data ?? []).length;
        sida = s.links?.next ? new URL(s.links.next).pathname + new URL(s.links.next).search : null;
      }
      rader.push(gruppRad(g, antal));
    }
    return [...rader, ...tillstandsRader(rader), { kalla: "asc", nyckel: "status", varde: { ok: true } }];
  } catch (e) {
    return [{ kalla: "asc", nyckel: "status", varde: { ok: false, fel: String(e).slice(0, 300) } }];
  }
}

async function facit(): Promise<Rad[]> {
  const rader = await sql`SELECT app, version, count(*)::int AS antal, min(received_at) AS forsta, max(received_at) AS senaste
    FROM driver_facit WHERE NOT prov GROUP BY app, version`;
  return facitRader(rader.map((r: any) => ({ app: r.app, version: r.version, antal: r.antal,
    forsta: new Date(r.forsta).toISOString(), senaste: new Date(r.senaste).toISOString() })));
}

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, headers: {
    Authorization: `Bearer ${Deno.env.get("PUBLISH_TOKEN")!}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${method} ${path}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

Deno.serve(async (req) => {
  const nyckel = Deno.env.get("INGEST_KEY");
  if (!nyckel || req.headers.get("x-halkvakt-key") !== nyckel) return new Response("forbidden", { status: 403 });
  const torrt = new URL(req.url).searchParams.get("torrt") === "1";
  try {
    const nya = [...await asc(), ...await facit()];
    const status = nya.find((r) => r.kalla === "asc" && r.nyckel === "status")!.varde;
    if (torrt) return new Response(JSON.stringify({ ok: true, torrt, asc: status, rader: nya }), { headers: { "Content-Type": "application/json" } });

    for (const r of nya) await sql`INSERT INTO byggsignaler (kalla, nyckel, varde) VALUES (${r.kalla}, ${r.nyckel}, ${sql.json(r.varde)})
      ON CONFLICT (kalla, nyckel) DO UPDATE SET varde = EXCLUDED.varde, senast_sedd = now()`;
    const alla = (await sql`SELECT kalla, nyckel, varde, forst_sedd, senast_sedd FROM byggsignaler WHERE kalla <> 'github' ORDER BY kalla, nyckel`)
      .map((r: any) => ({ kalla: r.kalla, nyckel: r.nyckel, varde: r.varde,
        forst_sedd: new Date(r.forst_sedd).toISOString(), senast_sedd: new Date(r.senast_sedd).toISOString() })) as Lagrad[];

    // Ärendet: numret sparas i tabellen (github/issue) i stället för att sökas fram, så att en sökning som missar aldrig
    // kan skapa ett nytt ärende varje timme.
    const kropp = issueKropp(alla, new Date());
    const [lagrad] = await sql`SELECT varde FROM byggsignaler WHERE kalla = 'github' AND nyckel = 'issue'`;
    let nr = lagrad?.varde?.nr as number | undefined;
    if (nr) await gh(`/issues/${nr}`, "PATCH", { body: kropp, state: "open" });
    else {
      nr = (await gh("/issues", "POST", { title: ISSUE_TITEL, body: kropp })).number as number;
      await sql`INSERT INTO byggsignaler (kalla, nyckel, varde) VALUES ('github', 'issue', ${sql.json({ nr })})`;
    }
    return new Response(JSON.stringify({ ok: true, asc: status, nya: nya.length, alla: alla.length, issue: nr }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, fel: String(e).slice(0, 300) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
