// Fristvakten (Bengts order 20/10, DECISIONS #649): datum som larmar. Varje frist i docs/fristerna.json blir ett ärende med
// etiketten `frist`, tilldelat ägarna, `forvarning` dygn före datumet; på dagen och varje dygn efteråt en kommentar tills ärendet
// stängs. Stängt ärende = gjort. Behöver ingen databas, så den larmar också när databasen står still på morgonen.
//   node --experimental-strip-types scripts/fristvakten.ts             sköter ärendena (GITHUB_TOKEN)
//   node --experimental-strip-types scripts/fristvakten.ts --torr      skriver vad den skulle göra, skriver inget
//   node --experimental-strip-types scripts/fristvakten.ts --check     prövar docs/fristerna.json
//   node --experimental-strip-types scripts/fristvakten.ts --sjalvtest
import { readFileSync } from "node:fs";

export type Frist = { id: string; datum: string; vad: string; forvarning?: number; agare: string[]; kalla: string; klart_nar: string };
export type Lista = { _om?: string; konton: Record<string, string>; frister: Frist[] };
export type Arende = { number: number; state: "open" | "closed"; title: string; body: string; kommentarer: string[] };
export type Atgard =
  | { typ: "skapa"; id: string; title: string; body: string; assignees: string[] }
  | { typ: "kommentera"; id: string; number: number; body: string }
  | { typ: "rubrik"; id: string; number: number; title: string };

const REPO = "Axelstar/Halkvakt";
const DYGN = 86_400_000;
export const MARK = (id: string) => `<!-- frist:${id} -->`;

/** Dagens datum i svensk tid, ÅÅÅÅ-MM-DD. */
export function idag(nu: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(nu);
}
/** Dygn från a till b (positivt när b ligger efter a). */
export const dygnTill = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DYGN);
const kortDatum = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))} ${d.slice(0, 4)}`;
const lage = (kvar: number) => kvar > 0 ? `om ${kvar} ${kvar === 1 ? "dygn" : "dygn"}` : kvar === 0 ? "i dag" : `försenad ${-kvar} dygn`;
export const rubrik = (f: Frist) => `⏰ Frist ${kortDatum(f.datum)}: ${f.vad}`.slice(0, 250);

/** Fel i listan. Tomt = listan håller. */
export function granska(l: Lista): string[] {
  const fel: string[] = [];
  const sedda = new Set<string>();
  if (!l.konton || !Object.keys(l.konton).length) fel.push("konton saknas");
  for (const f of l.frister ?? []) {
    const namn = f.id ?? "(utan id)";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(f.id ?? "")) fel.push(`${namn}: id ska vara gemener och bindestreck`);
    if (sedda.has(f.id)) fel.push(`${namn}: id:t finns två gånger`);
    sedda.add(f.id);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(f.datum ?? "") || new Date(`${f.datum}T00:00:00Z`).toISOString().slice(0, 10) !== f.datum)
      fel.push(`${namn}: datum "${f.datum}" är inte ett riktigt datum ÅÅÅÅ-MM-DD`);
    if (!f.vad?.trim()) fel.push(`${namn}: vad saknas`);
    if (!f.kalla?.trim()) fel.push(`${namn}: källa saknas`);
    if (!f.klart_nar?.trim()) fel.push(`${namn}: klart_nar saknas`);
    if (!Array.isArray(f.agare) || !f.agare.length) fel.push(`${namn}: ägare saknas`);
    for (const a of f.agare ?? []) if (!l.konton?.[a]) fel.push(`${namn}: okänd ägare "${a}"`);
    if (f.forvarning !== undefined && !(Number.isInteger(f.forvarning) && f.forvarning >= 0 && f.forvarning <= 60))
      fel.push(`${namn}: forvarning ska vara ett heltal 0–60`);
  }
  return fel;
}

/** Vad som ska göras i dag. Ren funktion: listan, dagen och ärendena som de ser ut. */
export function atgarder(l: Lista, dag: string, arenden: Arende[]): Atgard[] {
  const ut: Atgard[] = [];
  for (const f of l.frister) {
    const kvar = dygnTill(dag, f.datum);
    if (kvar > (f.forvarning ?? 3)) continue;
    const a = arenden.find((x) => x.body.includes(MARK(f.id)));
    if (!a) {
      const agare = f.agare.join(", ");
      const body = [`**${lage(kvar)[0].toUpperCase()}${lage(kvar).slice(1)}** — frist ${kortDatum(f.datum)}.`, "",
        f.vad, "", `- **Ägare:** ${agare}`, `- **Källa:** ${f.kalla}`, `- **Klart när:** ${f.klart_nar}`, "",
        "Stäng ärendet när det är gjort; dokumentsynken bokför det. Fristvakten (DECISIONS #649) påminner här på dagen och varje",
        "dygn efteråt tills ärendet är stängt. Datumet ändras i `docs/fristerna.json`.", "", MARK(f.id)].join("\n");
      ut.push({ typ: "skapa", id: f.id, title: rubrik(f), body, assignees: [...new Set(f.agare.map((x) => l.konton[x]))] });
      continue;
    }
    if (a.state === "closed") continue;
    if (a.title !== rubrik(f)) ut.push({ typ: "rubrik", id: f.id, number: a.number, title: rubrik(f) });
    if (kvar <= 0) {
      const nyckel = `<!-- frist-dag:${dag} -->`;
      if (!a.kommentarer.some((k) => k.includes(nyckel))) {
        const text = kvar === 0 ? `📅 **I dag är fristen** (${kortDatum(f.datum)}). Klart när: ${f.klart_nar}.`
          : `⏰ **Försenad ${-kvar} dygn** — fristen var ${kortDatum(f.datum)}. Klart när: ${f.klart_nar}. Stäng ärendet när det är gjort, eller flytta datumet i \`docs/fristerna.json\`.`;
        ut.push({ typ: "kommentera", id: f.id, number: a.number, body: `${text}\n\n${nyckel}` });
      }
    }
  }
  return ut;
}

function sjalvtest(): void {
  const l: Lista = { konton: { Bengt: "b", Axel: "a" }, frister: [
    { id: "tidig", datum: "2026-11-10", vad: "T", agare: ["Bengt"], kalla: "k", klart_nar: "x" },
    { id: "snart", datum: "2026-10-23", vad: "S", agare: ["Bengt", "Axel"], kalla: "k", klart_nar: "x" },
    { id: "idag", datum: "2026-10-20", forvarning: 0, vad: "I", agare: ["Axel"], kalla: "k", klart_nar: "x" },
    { id: "sen", datum: "2026-10-18", vad: "L", agare: ["Bengt"], kalla: "k", klart_nar: "x" },
    { id: "stangd", datum: "2026-10-15", vad: "C", agare: ["Bengt"], kalla: "k", klart_nar: "x" },
  ] };
  const dag = "2026-10-20";
  const t = (f: Frist) => rubrik(f);
  const fel = (s: string) => { console.error(`✗ självtest: ${s}`); process.exit(1); };
  // Utan ärenden: tidig väntar (21 dygn > 3), snart och idag och sen skapas, stängd skapas också (den har inget ärende).
  const a0 = atgarder(l, dag, []);
  if (a0.some((x) => x.id === "tidig")) fel("en frist långt fram fick ett ärende");
  const snart = a0.find((x) => x.id === "snart");
  if (snart?.typ !== "skapa" || !snart.body.includes("Om 3 dygn") || snart.assignees.join() !== "b,a") fel("förvarningen 3 dygn, två ägare");
  if (!(a0.find((x) => x.id === "sen") as any)?.body.includes("Försenad 2 dygn")) fel("en försenad frist utan ärende");
  // Med ärenden: idag får dagens kommentar en gång, sen får försenad-kommentaren en gång per dygn, stängd tiger.
  const ar = (id: string, state: "open" | "closed", kommentarer: string[] = []): Arende =>
    ({ number: id.length, state, title: t(l.frister.find((f) => f.id === id)!), body: `x ${MARK(id)}`, kommentarer });
  const a1 = atgarder(l, dag, [ar("snart", "open"), ar("idag", "open"), ar("sen", "open"), ar("stangd", "closed")]);
  if (a1.some((x) => x.id === "snart")) fel("ett öppet ärende före dagen fick en kommentar");
  if (!a1.some((x) => x.id === "idag" && x.typ === "kommentera" && x.body.includes("I dag är fristen"))) fel("dagens kommentar saknas");
  if (!a1.some((x) => x.id === "sen" && x.typ === "kommentera" && x.body.includes("Försenad 2 dygn"))) fel("försenad-kommentaren saknas");
  if (a1.some((x) => x.id === "stangd")) fel("ett stängt ärende fick en åtgärd");
  const a2 = atgarder(l, dag, [ar("idag", "open", [`… <!-- frist-dag:${dag} -->`]), ar("sen", "open", [`… <!-- frist-dag:${dag} -->`])]);
  if (a2.some((x) => x.typ === "kommentera")) fel("samma dygn kommenterades två gånger");
  // Ett flyttat datum byter rubrik.
  const flyttad = { ...ar("sen", "open"), title: "⏰ Frist 1/1 2020: gammal" };
  if (!atgarder(l, dag, [flyttad]).some((x) => x.typ === "rubrik" && x.id === "sen")) fel("ett flyttat datum bytte inte rubrik");
  // Granskningen fäller dubbletter, falska datum och okända ägare.
  const g = granska({ konton: { Bengt: "b" }, frister: [
    { id: "x", datum: "2026-02-30", vad: "v", agare: ["Bengt"], kalla: "k", klart_nar: "y" },
    { id: "x", datum: "2026-10-01", vad: "v", agare: ["Okänd"], kalla: "k", klart_nar: "y" },
    { id: "Stor", datum: "2026-10-01", vad: "", agare: [], kalla: "", klart_nar: "", forvarning: 99 },
  ] });
  for (const m of ["riktigt datum", "två gånger", "okänd ägare", "gemener", "vad saknas", "ägare saknas", "källa saknas", "klart_nar saknas", "forvarning"])
    if (!g.some((x) => x.includes(m))) fel(`granskningen fällde inte "${m}"`);
  if (idag(new Date("2026-10-20T22:30:00Z")) !== "2026-10-21") fel("dagen räknas inte i svensk tid");
  console.log("✓ fristvakten självtest: förvarningen, dagen, försenad en gång per dygn, stängt tiger, flyttat datum byter rubrik, granskningen och svensk tid");
}

async function kor(torr: boolean): Promise<void> {
  const l: Lista = JSON.parse(readFileSync(new URL("../docs/fristerna.json", import.meta.url), "utf8"));
  const fel = granska(l);
  if (fel.length) { for (const f of fel) console.error(`✗ ${f}`); process.exit(1); }
  const token = process.env.GITHUB_TOKEN;
  if (!token && !torr) { console.error("GITHUB_TOKEN saknas — kör med --torr för att bara läsa."); process.exit(1); }
  const gh = async (path: string, method = "GET", payload?: unknown): Promise<any> => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/vnd.github+json" },
      body: payload ? JSON.stringify(payload) : undefined });
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  };
  const arenden: Arende[] = [];
  for (let sida = 1; ; sida++) {
    const del: any[] = await gh(`/issues?labels=frist&state=all&per_page=100&page=${sida}`);
    for (const i of del) {
      const kommentarer = i.state === "open" && i.comments
        ? (await gh(`/issues/${i.number}/comments?per_page=100`)).map((k: any) => String(k.body ?? "")) : [];
      arenden.push({ number: i.number, state: i.state, title: i.title, body: String(i.body ?? ""), kommentarer });
    }
    if (del.length < 100) break;
  }
  const dag = idag(new Date());
  const ut = atgarder(l, dag, arenden);
  console.log(`fristvakten ${dag}: ${l.frister.length} frister, ${arenden.length} ärenden med etiketten frist, ${ut.length} åtgärder${torr ? " (torrt — inget skrivs)" : ""}`);
  for (const f of l.frister) console.log(`  ${f.datum}  ${lage(dygnTill(dag, f.datum)).padEnd(16)} ${f.id}`);
  for (const a of ut) {
    if (a.typ === "skapa") {
      console.log(`→ skapa: ${a.title} (till ${a.assignees.join(", ")})`);
      if (!torr) { const i = await gh(`/issues`, "POST", { title: a.title, body: a.body, labels: ["frist"], assignees: a.assignees }); console.log(`  issue #${i.number}`); }
    } else if (a.typ === "kommentera") {
      console.log(`→ kommentar på #${a.number} (${a.id}): ${a.body.split("\n")[0].slice(0, 120)}`);
      if (!torr) await gh(`/issues/${a.number}/comments`, "POST", { body: a.body });
    } else {
      console.log(`→ ny rubrik på #${a.number} (${a.id}): ${a.title}`);
      if (!torr) await gh(`/issues/${a.number}`, "PATCH", { title: a.title });
    }
  }
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/fristvakten.ts");
if (direkt) {
  const arg = process.argv[2];
  if (arg === "--sjalvtest") sjalvtest();
  else if (arg === "--check") {
    const l: Lista = JSON.parse(readFileSync(new URL("../docs/fristerna.json", import.meta.url), "utf8"));
    const fel = granska(l);
    for (const f of fel) console.error(`✗ ${f}`);
    if (fel.length) process.exit(1);
    console.log(`✓ fristerna: ${l.frister.length} frister, alla med datum, ägare, källa och klart-när`);
  } else await kor(arg === "--torr");
}
