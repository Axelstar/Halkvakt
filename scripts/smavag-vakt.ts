// SMÅVÄGSRÖSTENS VAKT (DECISIONS #849, kort #647; Bengt 12/11: "Ja, båda"). För varje timme förra UTC-dygnet ska tre saker hålla:
//   räknad  kedjan och del B räknade timmen: en rad i smavag_korning med minst 95 % av punkterna (smavag-regel.ts fullstandig, som
//           smavag_timme() i sql/105);
//   hinken  en räknad timme har taktens underlag och resorna i den privata hinken (kuvos-smavag-timme.yml);
//   flodet  timflödet gick grönt. Jämförelsen med smavag_regel() fäller det vid olika, och en saknad timfil fäller det sedan #849.
// Ett ofullständigt dygn ger ett ärende med etiketten smavag-vakt, tilldelat Bengt. Det kommenteras varje ofullständigt dygn och
// stängs av första kompletta dygnet. Ärendet säger bara komplett eller ofullständigt och vilken prövning som föll, utan antal och
// timmar (#768); timmarna skrivs till en fil som flödet lägger i hinken. Samma dygn prövas aldrig två gånger.
// Skälet: 12/11 hittades två tysta fel bara genom att läsa loggar. Timflödet var grönt i 26 av 30 timmar utan att räkna något, och
// uppladdningen föll med kod 1 utan felrad (#1551). Skuggans 14 dygn (#843) räknas bara på kompletta dygn.
//   node --experimental-strip-types scripts/smavag-vakt.ts --sjalvtest
//   node --experimental-strip-types scripts/smavag-vakt.ts <dygn> <hinken.txt> <ut.json> [--torr]
//       DATABASE_URL och GITHUB_TOKEN. hinken.txt: de av dygnets underlags- och resefiler som finns, ett namn per rad (flödet frågar
//       hinken med ingest/hinken.ts). --torr skriver bara vad vakten skulle göra med ärendet.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fullstandig } from "../ingest/smavag-regel.ts";

const REPO = "Axelstar/Halkvakt";
const ETIKETT = "smavag-vakt";
const AGARE = ["895845"];
export const PROVNINGAR = { raknad: "kedjan räknade timmen", hinken: "underlaget och resorna i hinken", flodet: "timflödet grönt" } as const;
type Provning = keyof typeof PROVNINGAR;
export type Utfall = { dygn: string; komplett: boolean; fel: Record<Provning, string[]> };

/** Dygnets 24 timmar som ISO-tider, 00:00 till 23:00 UTC. */
export function timmar(dygn: string): string[] {
  return Array.from({ length: 24 }, (_, h) => `${dygn}T${String(h).padStart(2, "0")}:00:00Z`);
}
/** Timmens stämpel i hinkens filnamn (kuvos-smavag-timme.yml): ÅÅÅÅMMDDTHH. */
export const stampel = (t: string) => t.slice(0, 13).replace(/-/gu, "");

/** Dygnets utfall. `korning`: smavag_korning, timme → punkter; `punkter`: alla småvägspunkter; `hinken`: filnamnen som finns;
 *  `korningar`: timflödets körningar med skapad-tid och slutsats (körningen för timmen T startar vid T + omkring 48 minuter). */
export function bedom(dygn: string, korning: Map<string, number>, punkter: number, hinken: Set<string>,
  korningar: { skapad: string; slutsats: string | null }[]): Utfall {
  const fel: Record<Provning, string[]> = { raknad: [], hinken: [], flodet: [] };
  for (const t of timmar(dygn)) {
    const p = korning.get(t), s = stampel(t);
    if (p === undefined || !fullstandig(p, punkter)) fel.raknad.push(s);
    else if (!hinken.has(`underlag_${s}.csv.gz`) || !hinken.has(`resor_${s}.csv.gz`)) fel.hinken.push(s);
  }
  for (const k of korningar) {
    if (k.skapad.slice(0, 10) !== dygn || k.slutsats === "success" || k.slutsats === "skipped" || k.slutsats === null) continue;
    const s = stampel(k.skapad);
    if (!fel.flodet.includes(s)) fel.flodet.push(s);
  }
  fel.flodet.sort();
  return { dygn, komplett: !fel.raknad.length && !fel.hinken.length && !fel.flodet.length, fel };
}

export const markor = (dygn: string) => `<!-- smavag-vakt ${dygn} -->`;
const foll = (u: Utfall) => (Object.keys(PROVNINGAR) as Provning[]).filter((p) => u.fel[p].length).map((p) => PROVNINGAR[p]).join(", ");
export type Atgard = { typ: "ny"; title: string; body: string } | { typ: "kommentar" | "stang"; number: number; body: string } | { typ: "inget"; skal: string };

/** Vad vakten gör med ärendet. `oppet`: det öppna ärendet med sin text och sina kommentarer, eller null. */
export function atgard(u: Utfall, oppet: { number: number; texter: string[] } | null): Atgard {
  const m = markor(u.dygn);
  if (oppet?.texter.some((t) => t.includes(m))) return { typ: "inget", skal: `dygnet ${u.dygn} är redan prövat` };
  if (u.komplett) {
    return oppet ? { typ: "stang", number: oppet.number, body: `${m}\nDygnet ${u.dygn} är komplett: varje timme räknad, i hinken och med grönt timflöde. Ärendet stängs.` }
      : { typ: "inget", skal: `dygnet ${u.dygn} är komplett` };
  }
  if (oppet) return { typ: "kommentar", number: oppet.number, body: `${m}\nDygnet ${u.dygn} är också ofullständigt. Prövningarna som föll: ${foll(u)}.` };
  return { typ: "ny", title: "Småvägsröstens kedja: ofullständigt dygn", body: `${m}\nDygnet ${u.dygn} (UTC) är ofullständigt. Prövningarna som föll: ` +
    `${foll(u)}.\n\nTimmarna står i den privata hinken (\`kuvos-smavag-2026-27/vakt_${u.dygn}.json\`). Vakten kommenterar varje ofullständigt ` +
    `dygn och stänger ärendet när ett dygn är komplett (DECISIONS #849). Skuggans 14 dygn räknas bara på kompletta dygn.` };
}

function sjalvtest(): number {
  const fel: string[] = [], k = (ok: boolean, namn: string) => { if (!ok) fel.push(namn); };
  const D = "2026-11-13", tt = timmar(D);
  k(tt.length === 24 && tt[0] === "2026-11-13T00:00:00Z" && tt[23] === "2026-11-13T23:00:00Z" && stampel(tt[5]) === "20261113T05", "timmarna och stämpeln");
  const helt = new Map(tt.map((t) => [t, 100])), filer = new Set(tt.flatMap((t) => [`underlag_${stampel(t)}.csv.gz`, `resor_${stampel(t)}.csv.gz`]));
  const gron = tt.map((t) => ({ skapad: t.replace(":00:00Z", ":48:10Z"), slutsats: "success" }));
  k(bedom(D, helt, 100, filer, gron).komplett, "ett helt dygn är komplett");
  const m1 = new Map(helt); m1.delete(tt[6]); m1.set(tt[7], 94);
  const u1 = bedom(D, m1, 100, filer, gron);
  k(!u1.komplett && u1.fel.raknad.join() === "20261113T06,20261113T07" && !u1.fel.hinken.length, "en saknad timme och en under 95 %");
  k(bedom(D, new Map(helt).set(tt[7], 95), 100, filer, gron).komplett, "95 % räcker");
  const f2 = new Set(filer); f2.delete("resor_20261113T09.csv.gz");
  k(bedom(D, helt, 100, f2, gron).fel.hinken.join() === "20261113T09", "en räknad timme utan resorna i hinken");
  const u3 = bedom(D, m1, 100, new Set(), gron);
  k(u3.fel.hinken.length === 22 && !u3.fel.hinken.includes("20261113T06"), "en timme som inte räknades kräver inget i hinken");
  const r4 = [...gron, { skapad: "2026-11-13T14:48:00Z", slutsats: "failure" }, { skapad: "2026-11-12T23:48:00Z", slutsats: "failure" },
    { skapad: "2026-11-13T15:48:00Z", slutsats: "skipped" }, { skapad: "2026-11-13T16:48:00Z", slutsats: null }];
  k(bedom(D, helt, 100, filer, r4).fel.flodet.join() === "20261113T14", "ett rött timflöde, inte dygnet före, inte överhoppat eller pågående");
  // Ärendet: nytt, kommentar, stängning, inget två gånger, inget när allt är bra.
  const ofull = bedom(D, m1, 100, filer, r4), komp = bedom(D, helt, 100, filer, gron);
  const a1 = atgard(ofull, null);
  k(a1.typ === "ny" && a1.body.startsWith(markor(D)) && a1.body.includes("kedjan räknade timmen, timflödet grönt") && !/\d+ (timmar|av)/u.test(a1.body),
    "nytt ärende: prövningarna som föll, utan antal");
  k(atgard(ofull, { number: 7, texter: ["<!-- smavag-vakt 2026-11-12 -->"] }).typ === "kommentar", "öppet ärende: kommentar");
  k(atgard(komp, { number: 7, texter: ["x"] }).typ === "stang", "komplett dygn stänger");
  k(atgard(komp, null).typ === "inget" && atgard(ofull, { number: 7, texter: [markor(D)] }).typ === "inget", "inget utan ärende, inget två gånger");
  console.log(`självtest smavag-vakt: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

async function kor(dygn: string, hinkfil: string, ut: string, torr: boolean): Promise<void> {
  const token = process.env.GITHUB_TOKEN, url = process.env.DATABASE_URL;
  if (!token || !url) throw new Error("GITHUB_TOKEN eller DATABASE_URL saknas");
  const gh = async (path: string, method = "GET", body?: unknown) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`${method} ${path.split("?")[0]} → ${r.status}`);
    return r.json();
  };
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  let korning: Map<string, number>, punkter: number;
  try {
    await pool.query("SET TimeZone = 'UTC'");
    const r = await pool.query(`SELECT to_char(tid AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS t, punkter FROM smavag_korning
      WHERE tid >= $1::date AND tid < $1::date + 1`, [dygn]);
    korning = new Map(r.rows.map((x: any) => [x.t, Number(x.punkter)]));
    punkter = Number((await pool.query("SELECT count(*) AS n FROM smavagspunkt")).rows[0].n);
  } finally { await pool.end(); }
  // Utan filter på tid och sida för sida (minnet: created=-filtret har missat körningar); dygnet för i går ryms på två sidor.
  const korningar: { skapad: string; slutsats: string | null }[] = [];
  for (let s = 1; s <= 2; s++) {
    const r = await gh(`/actions/workflows/kuvos-smavag-timme.yml/runs?per_page=100&page=${s}`);
    for (const x of r.workflow_runs ?? []) korningar.push({ skapad: String(x.created_at), slutsats: x.conclusion ?? null });
  }
  const hinken = new Set(readFileSync(hinkfil, "utf8").split(/\r?\n/u).filter(Boolean));
  const u = bedom(dygn, korning, punkter, hinken, korningar);
  writeFileSync(ut, JSON.stringify(u) + "\n");
  console.log(`dygnet ${dygn}: ${u.komplett ? "komplett" : "ofullständigt"}`);
  const oppna = ((await gh(`/issues?labels=${ETIKETT}&state=open&per_page=10`)) as any[]).filter((i) => String(i.body ?? "").includes("<!-- smavag-vakt"));
  let oppet: { number: number; texter: string[] } | null = null;
  if (oppna.length) {
    const i = oppna[0];
    oppet = { number: i.number, texter: [String(i.body ?? ""), ...((await gh(`/issues/${i.number}/comments?per_page=100`)) as any[]).map((c) => String(c.body ?? ""))] };
  }
  const a = atgard(u, oppet);
  if (a.typ === "inget") { console.log(`ärendet: inget (${a.skal})`); return; }
  console.log(`ärendet: ${a.typ}${torr ? " (torrt, inget skrivs)" : ""}`);
  if (torr) return;
  if (a.typ === "ny") {
    // Etiketten först: utan den hittar nästa körning inte ärendet och öppnar ett till. 422 = den finns redan.
    const r = await fetch(`https://api.github.com/repos/${REPO}/labels`, { method: "POST", body: JSON.stringify({ name: ETIKETT, color: "d93f0b",
      description: "Småvägsröstens vakt: ett ofullständigt dygn (DECISIONS #849)" }), headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!r.ok && r.status !== 422) throw new Error(`POST /labels → ${r.status}`);
    await gh("/issues", "POST", { title: a.title, body: a.body, labels: [ETIKETT], assignees: AGARE });
  }
  else {
    await gh(`/issues/${a.number}/comments`, "POST", { body: a.body });
    if (a.typ === "stang") await gh(`/issues/${a.number}`, "PATCH", { state: "closed" });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const a = process.argv.slice(2);
  if (a[0] === "--sjalvtest") process.exit(sjalvtest());
  if (a.length < 3 || !/^\d{4}-\d\d-\d\d$/u.test(a[0])) { console.error("<dygn> <hinken.txt> <ut.json> [--torr] | --sjalvtest"); process.exit(2); }
  kor(a[0], a[1], a[2], a[3] === "--torr").catch((e) => { console.error(`smavag-vakt: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); });
}
