// Domlarmet (Bengts order 20/10, DECISIONS #649): en dom som fälls i en körning blir ett ärende. 19/10 skrev grind V-B
// "DOM: V-B FALLER" i måndagskörningen, och ingen bokförde den — dokumentsynken läser beslut och commits, inte utskrifter.
// Grindflödena skriver sin utskrift till en fil; det här skriptet läser raderna `DOMRAD:` (scripts/domrad.ts) och gör ett
// ärende med etiketten `dom`, tilldelat Bengt, för varje KLARAR, FALLER eller LÄS som inte redan har ett. En gång per grind
// och utfall: ändras utfallet kommer ett nytt ärende. Stäng ärendet när domen är bokförd.
//   node --experimental-strip-types scripts/domlarm.ts <utskrift.txt>          (GITHUB_TOKEN)
//   node --experimental-strip-types scripts/domlarm.ts --torr <utskrift.txt>
//   node --experimental-strip-types scripts/domlarm.ts --sjalvtest
import { existsSync, readFileSync } from "node:fs";
import { DOMRAD_RE, type Utfall } from "./domrad.ts";

export type Dom = { grind: string; utfall: Utfall; text: string };
const REPO = "Axelstar/Halkvakt";
export const LARMAR: Utfall[] = ["KLARAR", "FALLER", "LÄS"];
/** Domar som var bokförda innan domlarmet fanns. Ingen av dem blir ett ärende; nya domar bokförs genom att ärendet stängs. */
export const BOKFORDA: Record<string, string> = {
  "Grind A:KLARAR": "DECISIONS #321", "Vägpunktsgrinden:FALLER": "DECISIONS #399", "V-A:FALLER": "DECISIONS #69, #104",
  "V-B:FALLER": "DECISIONS #648", "K-A:KLARAR": "DECISIONS #491", "R-A:LÄS": "DECISIONS #491", "T-A:LÄS": "DECISIONS #491, #492",
  "W-A B2:FALLER": "DECISIONS #491",
};
export const nyckel = (d: Dom) => `${d.grind}:${d.utfall}`;
export const MARK = (d: Dom) => `<!-- dom:${nyckel(d)} -->`;

export function las(text: string): Dom[] {
  const ut: Dom[] = [];
  for (const rad of text.split(/\r?\n/u)) {
    const m = DOMRAD_RE.exec(rad.trim());
    if (m) ut.push({ grind: m[1], utfall: m[2] as Utfall, text: m[3] });
  }
  return ut;
}

/** De domar som ska bli ärenden: larmande utfall, inte bokförda, utan ärende sedan tidigare, en gång var. */
export function attLarma(domar: Dom[], arendetexter: string[]): Dom[] {
  const sedda = new Set<string>();
  return domar.filter((d) => {
    const k = nyckel(d);
    if (!LARMAR.includes(d.utfall) || BOKFORDA[k] || sedda.has(k) || arendetexter.some((t) => t.includes(MARK(d)))) return false;
    sedda.add(k);
    return true;
  });
}

const ORD: Record<Utfall, string> = { KLARAR: "klarar", FALLER: "faller", "LÄS": "har ett utfall att läsa", OAVGJORT: "oavgjord", "SPÄRRAD": "spärrad" };
export const rubrik = (d: Dom) => `⚖️ ${d.grind} ${ORD[d.utfall]}: ${d.text}`.slice(0, 250);

function sjalvtest(): void {
  const fel = (s: string) => { console.error(`✗ självtest: ${s}`); process.exit(1); };
  const t = ["brus", "DOMRAD: V-C · FALLER · falsklarm 81 %", "  DOMRAD: R-B · LÄS · giltigt fönster  ", "DOMRAD: NT · SPÄRRAD · till 1/3",
    "DOMRAD: V-C · FALLER · samma igen", "DOMRAD: V-B · FALLER · bokförd", "DOMRAD: X · KANSKE · okänt ord", "DOMRAD: K-C · KLARAR · ny"].join("\n");
  const d = las(t);
  if (d.length !== 6) fel(`läste ${d.length} domrader, väntade 6 (okänt utfall ska inte läsas)`);
  if (d[1].grind !== "R-B" || d[1].utfall !== "LÄS") fel("en indragen rad lästes fel");
  const l = attLarma(d, []);
  if (l.map(nyckel).join() !== "V-C:FALLER,R-B:LÄS,K-C:KLARAR") fel(`fel urval: ${l.map(nyckel).join()} (spärrad tiger, bokförd tiger, en gång per nyckel)`);
  if (attLarma(d, [`x ${MARK({ grind: "V-C", utfall: "FALLER", text: "" })}`]).some((x) => x.grind === "V-C")) fel("ett befintligt ärende larmade igen");
  if (!attLarma([{ grind: "V-C", utfall: "KLARAR", text: "" }], [`x ${MARK({ grind: "V-C", utfall: "FALLER", text: "" })}`]).length) fel("ett ändrat utfall larmade inte");
  console.log("✓ domlarmet självtest: raderna läses, okända utfall och spärrade tiger, bokförda tiger, en gång per grind och utfall, ändrat utfall larmar");
}

async function kor(fil: string, torr: boolean): Promise<void> {
  if (!fil || !existsSync(fil)) { console.log(`domlarmet: ingen utskrift (${fil || "ingen fil angiven"}) — inget att läsa.`); return; }
  const domar = las(readFileSync(fil, "utf8"));
  console.log(`domlarmet: ${domar.length} domrader${domar.length ? ": " + domar.map((d) => `${d.grind} ${d.utfall}`).join(" · ") : ""}`);
  if (!domar.some((d) => LARMAR.includes(d.utfall))) return;
  const token = process.env.GITHUB_TOKEN;
  if (!token && !torr) { console.error("GITHUB_TOKEN saknas — kan inte larma."); process.exit(1); }
  const gh = async (path: string, method = "GET", payload?: unknown): Promise<any> => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/vnd.github+json" },
      body: payload ? JSON.stringify(payload) : undefined });
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  };
  const texter: string[] = [];
  for (let sida = 1; ; sida++) {
    const del: any[] = await gh(`/issues?labels=dom&state=all&per_page=100&page=${sida}`);
    texter.push(...del.map((i) => String(i.body ?? "")));
    if (del.length < 100) break;
  }
  const korning = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : "(lokal körning)";
  for (const d of attLarma(domar, texter)) {
    const body = [`Grinden **${d.grind}** skrev i körningen ${korning}:`, "", "```", `DOMRAD: ${d.grind} · ${d.utfall} · ${d.text}`, "```", "",
      d.utfall === "LÄS" ? "Spärren har släppt: läs utskriften och fäll domslutet, och bokför det i DECISIONS." : "Bokför domen i DECISIONS på Bengts ord.",
      "Stäng ärendet när det är bokfört. Domlarmet (DECISIONS #649) larmar en gång per grind och utfall; ändras utfallet kommer ett nytt ärende.",
      "", MARK(d)].join("\n");
    console.log(`→ ärende: ${rubrik(d)}${torr ? " (torrt — skrivs inte)" : ""}`);
    if (!torr) { const i = await gh(`/issues`, "POST", { title: rubrik(d), body, labels: ["dom"], assignees: ["895845"] }); console.log(`  issue #${i.number}`); }
  }
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/domlarm.ts");
if (direkt) {
  const a = process.argv.slice(2);
  if (a[0] === "--sjalvtest") sjalvtest();
  else if (a[0] === "--torr") await kor(a[1], true);
  else await kor(a[0], false);
}
