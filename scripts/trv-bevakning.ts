// Källbevakningen (kort #31, Bengts issue #2 — Visualping-ersättaren): API-ändringar,
// avvecklingar och källändringar ska fångas INNAN de bryter ingest. Watches all sources
// from the issue, each with the sturdiest access path that exists (verified 3/9):
//   LIST sources (new-item diff by guid):
//     trv-rss          bransch.trafikverket.se RSS "Nyheter om Trafikverkets data"
//     trv-portal-news  data.trafikverket.se/news — the SPA's own CMS GraphQL (no auth),
//                      two-level crawl news-0 -> categories -> items (~120 poster; this
//                      is where "väglagskameror 25/8" and "TrainAnnouncement 2/9" lived)
//     trv-drift        driftinformationens poster via samma CMS GraphQL (tre föräldranoder)
//     smhi-opendata    opendata.smhi.se/sitemap.xml (Docusaurus — skalet är tomt, sitemap ärlig)
//   HASH sources (normalized text, siffror strippade — levande värden får inte larma):
//     met-api          api.met.no
//     halkvarning      www.halkvarning.se
//     klimator         www.klimator.se (JS-tung — vakten ser bara serverskalet; sägs i larmet)
//
// BREDDNINGEN 12/9 (Bengts order, DECISIONS #148). Beroendekartan (#147) mätte att av NIO
// produktionsberoenden var ETT bevisat bevakat. Listan ovan valdes när issue #2 skrevs i
// augusti; sedan dess har radar, moln, Finland, Norge, Danmark och polisen tillkommit och
// listan följde inte med. Sex källor till, var och en uppmätt innan den kopplades in:
//     smhi-uppdateringar  www.smhi.se/rss/uppdateringar-oppna-data-fran-smhi — RSS, 7 poster.
//                      DET HÄR ÄR SMHI:S RIKTIGA KANAL. smhi-opendata ovan bevakar
//                      DOKUMENTATIONSsajten; våra tre SMHI-värdar (varningar, radar, metobs)
//                      annonseras här, på www.smhi.se, och ingen av feedens sju poster har
//                      någonsin synts i den sitemapen.
//     fi-digitraffic   www.digitraffic.fi/en/news/ (hash, 20 857 tecken, stabil). API-changes-
//                      sidan är JS-renderad och ger bara 1 694 tecken skal — nyhetssidan är
//                      den sturdiest access path som finns.
//     no-vegvesen      vegvesen.no …/hva-er-datex/informasjon-og-nyheter/ (hash, 1 364 tecken).
//                      Det var HÄR v3.1 annonserades — samma publikation vår ingest hämtar.
//     dk-dmi           www.dmi.dk/frie-data (hash, 3 980 tecken). Adressen kommer ur DMI:s
//                      eget API-rotsvar. Gamla opendatadocs.dmi.govcloud.dk svarar 404 på
//                      VARJE sökväg och dmiapi.govcloud.dk 503 — dokumentationen har flyttat.
//     polisen-regler   polisen.se …/regler-for-oppna-data/ (hash, 5 318 tecken). Villkoren,
//                      inklusive user-agent-kravet som ger 403 om det bryts.
//     polisen-api      polisen.se …/api-over-polisens-handelser/ (hash, 4 327 tecken). Fälten.
// Alla sex hämtade två gånger före inkoppling: samtliga stabila (identisk hash).
//
// NAMNET LJUGER numera — filen heter trv-bevakning men vakten är inte trafikverksspecifik.
// Omdöpning rör workflow, statefil och kortreferenser; eget beslut, inte en sidoeffekt här.
//
// BEDÖMNINGEN 12/9 (Bengts order, DECISIONS #149). Larmet sa förut "Bedöm: rör det våra
// källor/ingest?" — hela bedömningen låg på läsaren. Nu slår varje larm upp sin källa i
// beroendekartan (publish/beroenden.ts), matchar texten mot radernas nyckelord och skriver
// VAD SOM BRISTER. Rubriken bär domen: 🔴 RÖR OSS · 🟡 VET INTE · ⚪ RÖR OSS INTE.
// Bedömningen FÄLLER ALDRIG ett larm — samma issue, samma mottagare, en rad text ovanför.
// Hash-källornas text sparas i state, så att nästa ändring kan DIFFAS och bedömas på
// innehåll i stället för att bara konstatera att något rört sig.
// New/changed => ETT issue per källa (label trv-nyhet, assignad Bengt) — bevisad larmväg.
// Trasig källa => rött jobb med svarskropp (TRV-400-läxan). Google-gruppen "Öppet API
// Trafikverket" är DÖD sedan 2014 (Bengts koll 3/9: 14 trådar, senaste 2014-03-17) —
// dagens API-utskick publiceras på portalens nyhetssida, som trv-portal-news täcker.
//
// Modes: (default) diff+larma · --seed skriv om state utan larm · --testlarm behandla
// senaste RSS-posten som ny (provar issue-vägen). Exit: naturlig (aldrig process.exit —
// libuv-assert på Windows under undici-teardown gav exit 127).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { KARTAN } from "../publish/beroenden.ts";
import { bedom, nyText } from "../publish/nyhetsbedomning.ts";

const STATE = "ingest/trv-nyheter-state.json";
const REPO = "Axelstar/Halkvakt";
const GQL = "https://data.trafikverket.se/hc/graphql";
const seed = process.argv.includes("--seed");
const testlarm = process.argv.includes("--testlarm");

// `text` är det som ska BEDÖMAS — nya postens rubriker, eller de nya meningarna på en
// hash-sida. `lines` är det som ska LÄSAS. De skiljer sig: lines bär även hashar och
// textlängder, som inte ska matchas mot nyckelord.
type Change = { source: string; title: string; lines: string[]; text?: string };

// Polisens villkor för öppna data KRÄVER en user-agent som namnger appen; saknas den kan
// svaret bli 403 eller blockeras helt (läst 12/9). Samma hövlighet mot alla källor.
const UA = "Halkvakt/0.3 (axelstar.github.io/halkvakt-karta)";
async function fetchText(url: string, accept = "text/html"): Promise<string> {
  const r = await fetch(url, { headers: { Accept: accept, "User-Agent": UA } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${url} -> ${r.status}: ${body.slice(0, 300)}`);
  return body;
}
async function gql(query: string, variables?: unknown): Promise<any> {
  const r = await fetch(GQL, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await r.text();
  if (!r.ok) throw new Error(`graphql -> ${r.status}: ${body.slice(0, 300)}`);
  const j = JSON.parse(body);
  if (j.errors) throw new Error(`graphql errors: ${JSON.stringify(j.errors).slice(0, 300)}`);
  return j.data;
}
const norm = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// ── List sources ──────────────────────────────────────────────────────────────
// En RSS-feed är en RSS-feed: samma parser för Trafikverket och SMHI. Guid faller tillbaka
// på link — SMHI:s feed bär guid, men en feed utan guid får inte bli en tyst nolla.
async function rss(url: string): Promise<{ guid: string; label: string }[]> {
  const body = await fetchText(url, "application/rss+xml");
  const out: { guid: string; label: string }[] = [];
  for (const m of body.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const f = (tag: string) => (m[1].match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1] ?? "").trim();
    const guid = f("guid") || f("link");
    if (guid) out.push({ guid, label: `${f("title")} (${f("pubDate")}) ${f("link")}` });
  }
  return out;
}
const trvRss = () => rss("https://bransch.trafikverket.se/om-oss/aktuellt-for-dig-i-branschen3/Trafikverkets-RSS-floden/RSS-floden-pa-amnessidor/nyheter-om-trafikverkets-data/");
// SMHI:s EGEN uppdateringskanal för öppna data — inte dokumentationssajten. Verifierad 12/9:
// 7 poster, äldsta 18 jan 2024, senaste 28 maj 2026. De tre senaste rör prognoser och analyser
// (PMP3, Mesan) — INTE metobs, radar eller varningar, alltså inte oss. Men vi hade inte vetat.
const smhiUppdateringar = () => rss("https://www.smhi.se/rss/uppdateringar-oppna-data-fran-smhi");
const PAGES_Q = `query GetPagesByParentIds($parentIds: [String!]!) { cms { pagesByParentIds(parentIds: $parentIds, getOptions: { sortByDescendings: ["navigationPriority"] }) { id slug title } } }`;
async function trvPortalNews(): Promise<{ guid: string; label: string }[]> {
  const level1 = (await gql(PAGES_Q, { parentIds: ["news-0"] })).cms.pagesByParentIds as any[];
  const level2 = level1.length ? (await gql(PAGES_Q, { parentIds: level1.map((p) => p.id) })).cms.pagesByParentIds as any[] : [];
  return [...level1, ...level2].map((p) => ({ guid: String(p.id), label: `${p.title} — https://data.trafikverket.se/news/${p.slug ?? p.id}` }));
}
// ── Fler list-källor ─────────────────────────────────────────────────────────
async function trvDrift(): Promise<{ guid: string; label: string }[]> {
  // Driftinformationens poster ligger som barn under tre CMS-noder (verifierat 3/9) —
  // GetPageContent på sidan själv gav 21 tecken, en tyst ALDRIG som provkörningen fångade.
  const ids = ["c005038d-a10d-445e-8a11-dd35f836fb0e", "1077d479-b0a3-4e64-892d-d2f74e0322f5", "5e6f8482-23d9-430b-9462-afefe74c4f69"];
  const rows = (await gql(PAGES_Q, { parentIds: ids })).cms.pagesByParentIds as any[];
  return rows.map((p) => ({ guid: String(p.id), label: `${p.title} — https://data.trafikverket.se/driftinformation` }));
}
async function smhiSitemap(): Promise<{ guid: string; label: string }[]> {
  // Docusaurus-sajt: skalet är tomt (0 tecken text) men sitemap.xml listar alla sidor.
  const body = await fetchText("https://opendata.smhi.se/sitemap.xml", "application/xml");
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => ({ guid: m[1], label: m[1] }));
}

async function main(): Promise<number> {
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
  const sources: Record<string, { seen?: string[]; hash?: string; textLen?: number; text?: string }> = state.sources ?? {};
  if (Array.isArray(state.seen)) sources["trv-rss"] = { seen: state.seen }; // migrera v1-state
  const changes: Change[] = [];
  let fel = 0;

  // List sources
  const listSources: [string, () => Promise<{ guid: string; label: string }[]>][] = [
    ["trv-rss", trvRss], ["trv-portal-news", trvPortalNews],
    ["trv-drift", trvDrift], ["smhi-opendata", smhiSitemap],
    ["smhi-uppdateringar", smhiUppdateringar]];
  for (const [name, fn] of listSources) {
    try {
      const items = await fn();
      if (!items.length) throw new Error("0 poster parsade — formatändring eller trasig källa");
      console.log(`${name}: ${items.length} poster, senaste "${items[0].label.slice(0, 70)}"`);
      const seen = sources[name]?.seen ?? [];
      let nya = seed ? [] : items.filter((i) => !seen.includes(i.guid));
      if (testlarm && name === "trv-rss") nya = [items[0]];
      if (nya.length && seen.length) changes.push({ source: name, title: `${nya.length} ny${nya.length > 1 ? "a" : ""} post${nya.length > 1 ? "er" : ""}`, lines: nya.map((n) => n.label), text: nya.map((n) => n.label).join(" ") });
      else if (nya.length) console.log(`${name}: första körningen (${nya.length} poster) — seedar utan larm.`);
      if (!testlarm) sources[name] = { seen: items.map((i) => i.guid) };
    } catch (e) { console.error(`${name}: ${String((e as Error).message)}`); fel++; }
  }
  // Hash sources
  // Hash-källor: siffror strippas före hash — levande mätvärden (halkvarning visar
  // väder live) gav olika hash sekunder emellan i provkörningen. Struktur/text kvar.
  const stable = (s: string) => s.replace(/\d+/g, "#");
  const hashSources: [string, () => Promise<string>][] = [
    ["met-api", async () => stable(norm(await fetchText("https://api.met.no/")))],
    ["halkvarning", async () => stable(norm(await fetchText("https://www.halkvarning.se/")))],
    ["klimator", async () => stable(norm(await fetchText("https://www.klimator.se/")))],
    // Breddningen 12/9: fyra produktionsberoenden som saknade signal helt (#147, #148).
    ["fi-digitraffic", async () => stable(norm(await fetchText("https://www.digitraffic.fi/en/news/")))],
    ["no-vegvesen", async () => stable(norm(await fetchText("https://www.vegvesen.no/fag/teknologi/apne-data/et-utvalg-apne-data/hva-er-datex/informasjon-og-nyheter/")))],
    ["dk-dmi", async () => stable(norm(await fetchText("https://www.dmi.dk/frie-data")))],
    ["polisen-regler", async () => stable(norm(await fetchText("https://polisen.se/om-polisen/om-webbplatsen/oppna-data/regler-for-oppna-data/")))],
    ["polisen-api", async () => stable(norm(await fetchText("https://polisen.se/om-polisen/om-webbplatsen/oppna-data/api-over-polisens-handelser/")))]];
  for (const [name, fn] of hashSources) {
    try {
      const text = await fn();
      // Stabilitetskontroll: hämta två gånger i samma körning. Skiljer de sig åt varierar
      // sidan per request (rotation/AB-test) — då är en hashjämförelse bara brus. Fångat
      // skarpt 3/9: halkvarning larmade mot lokalt seedad hash trots sifferstrippning.
      const text2 = await fn();
      if (sha(text) !== sha(text2)) {
        console.log(`${name}: INSTABIL (två hämtningar skiljer sig, ${text.length}/${text2.length} tecken) — hoppar jämförelse.`);
        continue;
      }
      const h = sha(text);
      const spaVarning = text.length < 200 ? " (OBS: nästan ingen text — JS-renderad sida, vakten ser bara skalet)" : "";
      console.log(`${name}: ${text.length} tecken, hash ${h}${spaVarning}`);
      const prev = sources[name]?.hash;
      if (!seed && prev && prev !== h) {
        // Texten sparas i state just för det här ögonblicket: utan den föregående texten kan
        // en hash-vakt bara säga ATT något ändrats, aldrig VAD — och då blir varje larm ett
        // "öppna källan och bedöm", vilket är precis det bedömningen skulle ta bort.
        const nya = nyText(sources[name]?.text ?? "", text);
        const rader = [`Textlängd ${sources[name]?.textLen} → ${text.length} tecken, hash ${prev} → ${h}.${spaVarning}`];
        if (nya.length) { rader.push(`Nytt på sidan (${nya.length} stycken, de ${Math.min(6, nya.length)} första):`); rader.push(...nya.slice(0, 6).map((m) => `  "${m.slice(0, 220)}"`)); }
        else rader.push(sources[name]?.text ? `Ingen ny mening kunde pekas ut — ändringen sitter i något kortare än en mening (meny, siffra, layout).` : `Ingen tidigare text sparad (första ändringen efter #149) — nästa gång kan diffen visas.`);
        changes.push({ source: name, title: "innehållet ändrat", lines: rader, text: nya.join(" ") });
      }
      sources[name] = { hash: h, textLen: text.length, text };
    } catch (e) { console.error(`${name}: ${String((e as Error).message)}`); fel++; }
  }

  if (seed) { console.log("State seedad för alla källor — inga larm."); }
  for (const c of changes) {
    console.log(`ÄNDRING ${c.source}: ${c.title}`); for (const l of c.lines) console.log(`  - ${l}`);
    // MASKINELL BEDÖMNING (#149). Den fäller aldrig något — larmet går ut precis som förut,
    // till samma mottagare. Den svarar bara på frågan som förut låg på läsaren.
    const dom = bedom(c.source, c.text ?? "", KARTAN);
    console.log(`  BEDÖMNING: ${dom.grad}`); for (const r of dom.rader) console.log(`    ${r.replace(/\*\*/g, "")}`);
    const token = process.env.GITHUB_TOKEN;
    if (!token) { console.error("GITHUB_TOKEN saknas — kan inte larma."); return 1; }
    const gh = async (path: string, method = "GET", payload?: unknown): Promise<any> => {
      const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        body: payload ? JSON.stringify(payload) : undefined });
      if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return r.json();
    };
    const IKON: Record<string, string> = { "RÖR OSS": "🔴", "VET INTE": "🟡", "RÖR OSS INTE": "⚪" };
    const body = `${testlarm ? "🧪 **TESTLARM — avsiktlig larmvägskontroll.**\n\n" : ""}`
      + `Källbevakningen (kort #31): **${c.source}** — ${c.title}:\n\n`
      + `${c.lines.map((l) => `- ${l}`).join("\n")}\n\n---\n\n`
      + `${dom.rader.join("\n")}\n\n`
      + `*Bedömningen är maskinell (#149): den matchar ORD mot beroendekartan, den förstår ingenting.*\n`
      + `*Den fäller aldrig ett larm — läs posten och säg ok. Är bedömningen fel, rätta nyckelorden i \`publish/beroenden.ts\`.*`;
    const title = `${IKON[dom.grad] ?? "📰"} Källbevakningen: ${c.source} — ${c.title} [${dom.grad}]`;
    const open = (await gh(`/issues?labels=trv-nyhet&state=open&per_page=50`)).find((i: any) => i.title.includes(c.source));
    if (open) { await gh(`/issues/${open.number}/comments`, "POST", { body }); console.log(`Larm: kommentar på issue #${open.number}.`); }
    else { const issue = await gh(`/issues`, "POST", { title, body, labels: ["trv-nyhet"], assignees: ["895845"] }); console.log(`Larm: issue #${issue.number} skapad.`); }
  }
  if (!changes.length && !seed) console.log("Inga ändringar i någon källa.");
  if (!testlarm) writeFileSync(STATE, JSON.stringify({ sources, updated_at: new Date().toISOString() }, null, 2));
  // Trasiga källor = rött jobb — en källvakt som tappat en källa är ingen vakt.
  return fel ? 1 : 0;
}
process.exitCode = await main();
