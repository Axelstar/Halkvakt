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
// New/changed => ETT issue per källa (label trv-nyhet, assignad Bengt) — bevisad larmväg.
// Trasig källa => rött jobb med svarskropp (TRV-400-läxan). Google-gruppen "Öppet API
// Trafikverket" saknar feed — den täcks av Bengts medlemskap (mejl), inte av detta skript.
//
// Modes: (default) diff+larma · --seed skriv om state utan larm · --testlarm behandla
// senaste RSS-posten som ny (provar issue-vägen). Exit: naturlig (aldrig process.exit —
// libuv-assert på Windows under undici-teardown gav exit 127).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const STATE = "ingest/trv-nyheter-state.json";
const REPO = "Axelstar/Halkvakt";
const GQL = "https://data.trafikverket.se/hc/graphql";
const seed = process.argv.includes("--seed");
const testlarm = process.argv.includes("--testlarm");

type Change = { source: string; title: string; lines: string[] };

async function fetchText(url: string, accept = "text/html"): Promise<string> {
  const r = await fetch(url, { headers: { Accept: accept } });
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
async function trvRss(): Promise<{ guid: string; label: string }[]> {
  const body = await fetchText("https://bransch.trafikverket.se/om-oss/aktuellt-for-dig-i-branschen3/Trafikverkets-RSS-floden/RSS-floden-pa-amnessidor/nyheter-om-trafikverkets-data/", "application/rss+xml");
  const out: { guid: string; label: string }[] = [];
  for (const m of body.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const f = (tag: string) => (m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").trim();
    const guid = f("guid") || f("link");
    if (guid) out.push({ guid, label: `${f("title")} (${f("pubDate")}) ${f("link")}` });
  }
  return out;
}
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
  const sources: Record<string, { seen?: string[]; hash?: string; textLen?: number }> = state.sources ?? {};
  if (Array.isArray(state.seen)) sources["trv-rss"] = { seen: state.seen }; // migrera v1-state
  const changes: Change[] = [];
  let fel = 0;

  // List sources
  const listSources: [string, () => Promise<{ guid: string; label: string }[]>][] = [
    ["trv-rss", trvRss], ["trv-portal-news", trvPortalNews],
    ["trv-drift", trvDrift], ["smhi-opendata", smhiSitemap]];
  for (const [name, fn] of listSources) {
    try {
      const items = await fn();
      if (!items.length) throw new Error("0 poster parsade — formatändring eller trasig källa");
      console.log(`${name}: ${items.length} poster, senaste "${items[0].label.slice(0, 70)}"`);
      const seen = sources[name]?.seen ?? [];
      let nya = seed ? [] : items.filter((i) => !seen.includes(i.guid));
      if (testlarm && name === "trv-rss") nya = [items[0]];
      if (nya.length && seen.length) changes.push({ source: name, title: `${nya.length} ny${nya.length > 1 ? "a" : ""} post${nya.length > 1 ? "er" : ""}`, lines: nya.map((n) => n.label) });
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
    ["klimator", async () => stable(norm(await fetchText("https://www.klimator.se/")))]];
  for (const [name, fn] of hashSources) {
    try {
      const text = await fn();
      const h = sha(text);
      const spaVarning = text.length < 200 ? " (OBS: nästan ingen text — JS-renderad sida, vakten ser bara skalet)" : "";
      console.log(`${name}: ${text.length} tecken, hash ${h}${spaVarning}`);
      const prev = sources[name]?.hash;
      if (!seed && prev && prev !== h)
        changes.push({ source: name, title: "innehållet ändrat", lines: [`Textlängd ${sources[name]?.textLen} → ${text.length} tecken, hash ${prev} → ${h}.${spaVarning}`, `Öppna källan och bedöm: ${name}`] });
      sources[name] = { hash: h, textLen: text.length };
    } catch (e) { console.error(`${name}: ${String((e as Error).message)}`); fel++; }
  }

  if (seed) { console.log("State seedad för alla källor — inga larm."); }
  for (const c of changes) {
    console.log(`ÄNDRING ${c.source}: ${c.title}`); for (const l of c.lines) console.log(`  - ${l}`);
    const token = process.env.GITHUB_TOKEN;
    if (!token) { console.error("GITHUB_TOKEN saknas — kan inte larma."); return 1; }
    const gh = async (path: string, method = "GET", payload?: unknown): Promise<any> => {
      const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        body: payload ? JSON.stringify(payload) : undefined });
      if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return r.json();
    };
    const body = `${testlarm ? "🧪 **TESTLARM — avsiktlig larmvägskontroll.**\n\n" : ""}Källbevakningen (kort #31): **${c.source}** — ${c.title}:\n\n${c.lines.map((l) => `- ${l}`).join("\n")}\n\nBedöm: rör det våra källor/ingest? Stäng när läst.`;
    const title = `📰 Källbevakningen: ${c.source} — ${c.title}`;
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
