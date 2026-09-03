// Trafikverksbevakningen (kort #31, Bengts issue #2): API-ändringar och avvecklingar
// ska fångas INNAN de bryter ingest. Watches the verified RSS feed "Nyheter om
// Trafikverkets data" (bransch.trafikverket.se) weekly; new items become a GitHub
// issue assigned to Bengt (the proven healthcheck alarm pattern — an issue notifies,
// a green log line does not). State = seen guids in ingest/trv-nyheter-state.json,
// committed by the workflow. The trafikinfo API's own announcements go via the
// "Öppet API Trafikverket" Google Group, which has no feed — that channel is covered
// by Bengt's own group membership (mail per announcement), not by this script.
//
// Modes:
//   (default)     diff mot state; nya poster => issue + uppdaterad state; exit 0
//   --seed        skriv state med ALLT nuvarande innehåll, larma inte (första körningen)
//   --testlarm    behandla senaste posten som ny => provar hela larmvägen på riktigt
// Vakter: feed som inte svarar, inte parsar, eller ger 0 poster => exit 1 (rött jobb).
// Fel-loggen bär svarskroppen (TRV-400-läxan).

import { readFileSync, writeFileSync, existsSync } from "node:fs";

async function main(): Promise<number> {

const FEED = "https://bransch.trafikverket.se/om-oss/aktuellt-for-dig-i-branschen3/Trafikverkets-RSS-floden/RSS-floden-pa-amnessidor/nyheter-om-trafikverkets-data/";
const STATE = "ingest/trv-nyheter-state.json";
const REPO = "Axelstar/Halkvakt";
const seed = process.argv.includes("--seed");
const testlarm = process.argv.includes("--testlarm");

const res = await fetch(FEED, { headers: { Accept: "application/rss+xml" } });
const body = await res.text();
if (!res.ok) { console.error(`Feed ${res.status}: ${body.slice(0, 300)}`); return 1; }

type Item = { guid: string; title: string; link: string; date: string };
const items: Item[] = [];
for (const m of body.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
  const f = (tag: string) => (m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").trim();
  const guid = f("guid") || f("link");
  if (guid) items.push({ guid, title: f("title"), link: f("link"), date: f("pubDate") });
}
// Underlagsvakt: an empty parse is a broken feed or changed format — never a quiet week.
if (!items.length) { console.error(`0 poster parsade ur feeden (${body.length} tecken) — formatändring eller trasig feed.`); return 1; }
console.log(`Feed OK: ${items.length} poster, senaste "${items[0].title}" (${items[0].date})`);

const seen: string[] = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")).seen : [];
let nya = items.filter((i) => !seen.includes(i.guid));
if (testlarm) { nya = [items[0]]; console.log("TESTLARM: behandlar senaste posten som ny."); }
if (seed) {
  writeFileSync(STATE, JSON.stringify({ seen: items.map((i) => i.guid), seeded_at: new Date().toISOString() }, null, 2));
  console.log(`State seedad med ${items.length} guid:ar — inga larm för befintliga poster.`);
  return 0;
}
if (!nya.length) { console.log("Inga nya poster sedan förra körningen."); return 0; }

console.log(`${nya.length} NYA poster:`);
for (const n of nya) console.log(`  - ${n.title} (${n.date}) ${n.link}`);

// Alarm path: create or extend a GitHub issue (assigned to Bengt => notification).
const token = process.env.GITHUB_TOKEN;
if (!token) { console.error("GITHUB_TOKEN saknas — kan inte larma."); return 1; }
async function gh(path: string, method = "GET", payload?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: payload ? JSON.stringify(payload) : undefined });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const rader = nya.map((n) => `- **${n.title}** (${n.date})\n  ${n.link}`).join("\n");
const text = `${testlarm ? "🧪 **TESTLARM — avsiktlig larmvägskontroll, ingen riktig nyhet.**\n\n" : ""}Trafikverksbevakningen (kort #31) hittade ${nya.length} ny${nya.length > 1 ? "a" : ""} post${nya.length > 1 ? "er" : ""} i "Nyheter om Trafikverkets data":\n\n${rader}\n\nBedöm: rör det våra källor (WeatherObservation, RoadCondition, Situation, Camera, TrafficSafetyCamera)? Stäng när läst.`;
const open = await gh(`/issues?labels=trv-nyhet&state=open`);
if (open.length) {
  await gh(`/issues/${open[0].number}/comments`, "POST", { body: text });
  console.log(`Larm: kommentar på öppen issue #${open[0].number}.`);
} else {
  const issue = await gh(`/issues`, "POST", {
    title: `📰 Trafikverket: ${nya.length} ny${nya.length > 1 ? "a" : ""} datanyhet${nya.length > 1 ? "er" : ""} att bedöma`,
    body: text, labels: ["trv-nyhet"], assignees: ["895845"] });
  console.log(`Larm: issue #${issue.number} skapad och assignad.`);
}
if (!testlarm) writeFileSync(STATE, JSON.stringify({ seen: items.map((i) => i.guid), updated_at: new Date().toISOString() }, null, 2));
  return 0;
}
process.exitCode = await main();
