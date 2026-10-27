// Sidorna (Bengt 27/10, DECISIONS #731 och #733): stomdokumentens sidor och projektkartan publiceras som webbsidor ur main, i stället
// för som artefakter på claude.ai som någon måste republicera. Pages kräver adminrätt i det här repot, så sidorna byggs och publiceras
// i Bengts repo 895845/halkvakt-sidor (#733): dess flöde hämtar main härifrån en gång per dygn 05.30 UTC och kör --bygg. Flödet
// .github/workflows/sidorna.yml här kör genomsökningen 06.00 UTC, så att ärendet står i det här repot.
//   node --experimental-strip-types scripts/sidorna.ts --bygg <mapp>          webbplatsen: varje sida i ett HTML-skal med noindex, och en förstasida
//   node --experimental-strip-types scripts/sidorna.ts --genomsok <bas-url>   genomsökningen nedan; GH_TOKEN för ärendet, DYGN=true för punkt 3
//   node --experimental-strip-types scripts/sidorna.ts --sjalvtest
// Genomsökningen (Bengt 27/10: "kan man be github göra en genomsökning också så att allt är aktuellt"):
//  1. Varje publicerad sida är byte för byte lika det som byggdes ur commiten som förstasidan anger (Pages cache väntas ut, högst fem
//     minuter), och ingen ändring av en sida har legat på main längre än FORDROJNING_H timmar utan att komma med i ett bygge.
//  2. De skriptskrivna delarna är aktuella på main: projektkartan.ts --check och kortkartan.ts --check.
//  3. Bara i dygnets körning: dagens dokumentsynk finns på main (raden "Dokumentsynk <datum>" i STATUS.md) och ingen synk-PR står öppen.
//  4. Ingen fil på main länkar till sidornas gamla adresser, på claude.ai eller på Pages i det här repot, utom DECISIONS och STATUS,
//     som är historik.
// Hittar den fel öppnas ärendet "Genomsökningen av sidorna hittade fel", eller får en kommentar om det redan är öppet. Är allt grönt
// stängs ett öppet sådant ärende.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export type Sida = { fil: string; namn: string };
/** Repot sidorna byggs ur. Fast, eftersom --bygg körs i 895845/halkvakt-sidor, där GITHUB_REPOSITORY är det repot (#733). */
const KALLA = "Axelstar/Halkvakt";
const REPO = process.env.GITHUB_REPOSITORY || KALLA;
const RUBRIK = "Genomsökningen av sidorna hittade fel";
/** Sidornas adresser på claude.ai fram till 27/10. En länk dit pekar på en sida som inte längre uppdateras. */
export const GAMLA = ["RVrWtvUGPfc88aFUbcYREc", "FThC1PqVqEMqWxofrCv1GT", "6hHX4LeXQUrJSbaNthNY9i", "1xvv4hydYbfpF5eXFgLcxh",
  "EJYcQFCyKYd9BgGcYkCMyT", "Wsuxr3UTG7d7axekXireqg", "Bvo6pfdfhwEGjMxsR7xNc8"];
/** Pages i det här repot (#731), som aldrig gick att slå på utan adminrätt. Som mönster, så att raden själv inte träffas av punkt 4. */
export const GAMMAL_PAGES = "axelstar\\.github\\.io/Halkvakt/";
/** Punkt 1: hur länge en ändring av en sida får ligga på main innan den ska finnas i ett bygge. Dygnet och två timmars marginal. */
export const FORDROJNING_H = 26;

/** Källfilerna är fragment utan doctype (de skrevs för artefakttjänsten, som lade till skalet). Utan skal renderar en webbläsare dem
 *  i quirks-läge. noindex håller dem utanför sökmotorerna: innehållet finns redan i det publika repot, men adressen ska inte annonseras. */
export function skal(innehall: string): string {
  return `<!doctype html>\n<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` +
    `<meta name="robots" content="noindex,nofollow"><style>body{margin:0;padding:0}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>` +
    `</head><body>\n${innehall}\n</body></html>\n`;
}

/** Sidorna: stomdokumenten med en HTML-källa i kortkartans `sidor`, och projektkartan. */
export function sidlista(kortkartan: { sidor: Record<string, { fil: string; namn: string }> }): Sida[] {
  const s = Object.values(kortkartan.sidor).filter((x) => x.fil.endsWith(".html")).map((x) => ({ fil: x.fil, namn: x.namn }));
  return [...s, { fil: "docs/PROJEKTKARTAN.html", namn: "Halkvaktens projektkarta" }];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function forstasida(sidor: Sida[], sha: string): string {
  const rader = sidor.map((s) => `<li><a href="${basename(s.fil)}">${esc(s.namn)}</a></li>`).join("\n");
  return skal(`<title>Halkvaktens sidor</title>
<main data-sha="${esc(sha)}" style="max-width:640px;margin:40px auto;padding:0 16px;font:16px/1.6 Georgia,serif">
<h1 style="font:700 28px Arial,sans-serif">Halkvaktens sidor</h1>
<p>Stomdokumenten och projektkartan, byggda ur main i <a href="https://github.com/${KALLA}">${KALLA}</a> (${esc(sha.slice(0, 7))}).</p>
<ul>
${rader}
</ul>
</main>`);
}

/** Bygger webbplatsen i minnet: filnamn och innehåll. */
export function webbplats(las: (fil: string) => string, sha: string): Map<string, string> {
  const sidor = sidlista(JSON.parse(las("docs/kortkartan.json")));
  const m = new Map<string, string>(sidor.map((s) => [basename(s.fil), skal(las(s.fil))]));
  m.set("index.html", forstasida(sidor, sha));
  return m;
}

/** Punkt 3: dagens synk ska stå i STATUS.md. Raderna börjar "Dokumentsynk 2026-10-27" eller "Dokumentsynk: 2026-10-27". */
export const synkIdag = (status: string, datum: string) => new RegExp(`Dokumentsynk:? ${datum}`, "u").test(status);
export const idag = (nu: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(nu);

/** Punkt 1: commiten som förstasidan säger att sidorna byggdes ur. Hela sha:n i data-sha, annars den korta i texten (byggen före #733). */
export function byggsha(index: string): string | null {
  return index.match(/data-sha="([0-9a-f]{7,40})"/)?.[1] ?? index.match(/byggda ur main i <a [^>]*>[^<]*<\/a> \(([0-9a-f]{7})\)/)?.[1] ?? null;
}

/** Punkt 1: tiden (sekunder) för den äldsta ändringen som inte kommit med i bygget, om den legat på main längre än FORDROJNING_H. */
export function forsenad(tider: number[], nu: number): number | null {
  if (!tider.length) return null;
  const aldst = Math.min(...tider);
  return nu - aldst > FORDROJNING_H * 3600 ? aldst : null;
}
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

async function api(vag: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${vag}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${vag}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function genomsok(bas: string): Promise<string[]> {
  const fel: string[] = [];
  const las = (f: string) => readFileSync(f, "utf8");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const hamta = async (namn: string): Promise<{ ok: boolean; text: string }> => {
    try {
      const r = await fetch(`${bas}${namn}?t=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
      return r.ok ? { ok: true, text: await r.text() } : { ok: false, text: `HTTP ${r.status}` };
    } catch (e) { return { ok: false, text: e instanceof Error ? e.message : String(e) }; }
  };
  // 1. Varje sida lika bygget som förstasidan anger, och bygget inte äldre än FORDROJNING_H mot main.
  const index = await hamta("index.html");
  const kort = index.ok ? byggsha(index.text) : null;
  const byggd = kort ? (spawnSync("git", ["rev-parse", "--verify", "--quiet", `${kort}^{commit}`], { encoding: "utf8" }).stdout ?? "").trim() : "";
  if (!byggd) fel.push(kort ? `förstasidan på ${bas} säger att sidorna byggdes ur ${kort}, som inte finns här`
    : `förstasidan på ${bas} säger inte vilken commit sidorna byggdes ur (${index.ok ? "ingen sha på sidan" : index.text})`);
  else if (spawnSync("git", ["merge-base", "--is-ancestor", byggd, head]).status !== 0) fel.push(`sidorna på ${bas} är byggda ur ${byggd.slice(0, 7)}, som inte finns på main`);
  else {
    const vid = (f: string) => execFileSync("git", ["show", `${byggd}:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
    const kvar = new Map([...webbplats(vid, byggd)].filter(([namn]) => namn !== "index.html"));
    const senast = new Map<string, string>();
    for (let f = 0; f < 10 && kvar.size; f++) {
      if (f) await new Promise((r) => setTimeout(r, 30_000));
      for (const [namn, text] of [...kvar]) {
        const h = await hamta(namn);
        if (h.ok && sha256(h.text) === sha256(text)) kvar.delete(namn);
        else senast.set(namn, h.ok ? "olika" : h.text);
      }
    }
    for (const namn of kvar.keys()) fel.push(`${namn} på ${bas} är inte lika bygget ur ${byggd.slice(0, 7)} (${senast.get(namn)})`);
    // Ändringar efter bygget i sidornas källor och kortkartan, med tiden de kom till main (första föräldern).
    const kallor = [...sidlista(JSON.parse(las("docs/kortkartan.json"))).map((s) => s.fil), "docs/kortkartan.json"];
    const tider = execFileSync("git", ["log", "--first-parent", "--format=%ct", `${byggd}..${head}`, "--", ...kallor], { encoding: "utf8" })
      .split("\n").filter(Boolean).map(Number);
    const t = forsenad(tider, Date.now() / 1000);
    if (t !== null) fel.push(`sidorna på ${bas} saknar en ändring som legat på main sedan ${new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC; ` +
      `bygget ur ${byggd.slice(0, 7)} är för gammalt (det görs 05.30 UTC i 895845/halkvakt-sidor)`);
  }
  // 2. De skriptskrivna delarna.
  for (const s of ["projektkartan.ts", "kortkartan.ts"]) {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", `scripts/${s}`, "--check"], { encoding: "utf8" });
    if (r.status !== 0) fel.push(`${s} --check röd på main: ${`${r.stdout}${r.stderr}`.split("\n").filter((x) => x.includes("✗")).slice(0, 3).join(" / ")}`);
  }
  // 3. Dagens synk, bara i dygnets körning.
  if (process.env.DYGN === "true") {
    if (!synkIdag(las("STATUS.md"), idag(new Date()))) fel.push(`ingen dokumentsynk ${idag(new Date())} på main (raden saknas i STATUS.md)`);
    if (process.env.GH_TOKEN) {
      const oppna = ((await api("/pulls?state=open&base=main&per_page=100")) as { number: number; head: { ref: string } }[])
        .filter((p) => p.head.ref.startsWith("claude/dokumentsynk-"));
      for (const p of oppna) fel.push(`synkens PR #${p.number} står öppen; synk-ihops kommentar på PR:en säger varför`);
    }
  }
  // 4. Gamla adresser.
  const g = spawnSync("git", ["grep", "-l", "-E", `claude\\.ai/artifact/(${GAMLA.join("|")})|${GAMMAL_PAGES}`, "--", ".", ":!DECISIONS*.md", ":!STATUS*.md"], { encoding: "utf8" });
  const gamla = (g.stdout ?? "").split("\n").filter(Boolean);
  if (gamla.length) fel.push(`länkar till sidornas gamla adresser (claude.ai eller Pages i det här repot) finns kvar i ${gamla.join(", ")}`);
  return fel;
}

async function arende(fel: string[]): Promise<void> {
  const oppna = ((await api("/issues?state=open&per_page=100")) as { number: number; title: string; pull_request?: unknown }[])
    .filter((i) => !i.pull_request && i.title === RUBRIK);
  const korning = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : "";
  if (fel.length) {
    const text = `Genomsökningen ${idag(new Date())}${korning ? ` (${korning})` : ""}:\n\n${fel.map((f) => `- ${f}`).join("\n")}\n\nDECISIONS #731 och #733, scripts/sidorna.ts.`;
    if (oppna.length) await api(`/issues/${oppna[0].number}/comments`, { method: "POST", body: { body: text } });
    else await api("/issues", { method: "POST", body: { title: RUBRIK, body: text } });
  } else for (const i of oppna) {
    await api(`/issues/${i.number}/comments`, { method: "POST", body: { body: `Allt aktuellt igen vid genomsökningen ${idag(new Date())}${korning ? ` (${korning})` : ""}.` } });
    await api(`/issues/${i.number}`, { method: "PATCH", body: { state: "closed" } });
  }
}

function sjalvtest(): void {
  const k = { sidor: { MAT: { fil: "docs/MATNINGAR.html", namn: "Mätningar" }, BED: { fil: "docs/BEDOMNING.md", namn: "Bedömningen" } } };
  const filer: Record<string, string> = { "docs/kortkartan.json": JSON.stringify(k), "docs/MATNINGAR.html": "<title>M</title>\n<main>m</main>\n",
    "docs/PROJEKTKARTAN.html": "<title>P</title>\n" };
  const w = webbplats((f) => filer[f], "abcdef123");
  const ok1 = [...w.keys()].join() === "MATNINGAR.html,PROJEKTKARTAN.html,index.html";
  const m = w.get("MATNINGAR.html")!;
  const ok2 = m.startsWith("<!doctype html>") && m.includes('content="noindex,nofollow"') && m.includes("<main>m</main>") && m.endsWith("</html>\n");
  const ix = w.get("index.html")!;
  const ok3 = ix.includes('href="MATNINGAR.html"') && ix.includes("abcdef1") && !ix.includes("BEDOMNING") && ix.includes('href="https://github.com/Axelstar/Halkvakt"');
  const ok4 = synkIdag("- 27/10 03:30 UTC (Claude, morgonrutinen): Dokumentsynk 2026-10-27. Gårdagens", "2026-10-27")
    && synkIdag("Dokumentsynk: 2026-10-25", "2026-10-25") && !synkIdag("Dokumentsynk 2026-10-26.", "2026-10-27");
  const ok5 = idag(new Date("2026-10-27T23:30:00Z")) === "2026-10-28" && GAMLA.length === 7;
  // Förstasidan från det första bygget i 895845/halkvakt-sidor 27/10, före data-sha.
  const forsta = '<p>Stomdokumenten och projektkartan, byggda ur main i <a href="https://github.com/895845/halkvakt-sidor">895845/halkvakt-sidor</a> (ad33ab5).</p>';
  const ok6 = byggsha(ix) === "abcdef123" && byggsha(forsta) === "ad33ab5" && byggsha("<p>inget</p>") === null;
  const nu = 1_800_000_000, h = 3600;
  const ok7 = forsenad([], nu) === null && forsenad([nu - 25 * h, nu - 60], nu) === null && forsenad([nu - 60, nu - 27 * h], nu) === nu - 27 * h;
  const p = new RegExp(GAMMAL_PAGES);
  // Adressen delad i två, så att den här raden inte träffas av punkt 4.
  const ok8 = p.test("se https://axelstar.github.io/" + "Halkvakt/APPEN.html") && !p.test("https://axelstar.github.io/halkvakt-karta/data/vaglag.geojson")
    && !p.test("https://895845.github.io/halkvakt-sidor/APPEN.html");
  if (!(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8)) { console.error("✗ sidorna självtest", { ok1, ok2, ok3, ok4, ok5, ok6, ok7, ok8 }); process.exit(1); }
  console.log("✓ sidorna självtest: sidlistan, skalet med noindex, förstasidan med byggets sha, dagens synk i STATUS, datumet i svensk tid, " +
    "fördröjningen mot main och den gamla Pages-adressen");
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2);
  if (arg.includes("--sjalvtest")) return sjalvtest();
  const b = arg.indexOf("--bygg");
  if (b >= 0) {
    const mapp = arg[b + 1];
    if (!mapp) { console.error("✗ ange --bygg <mapp>"); process.exit(2); }
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    mkdirSync(mapp, { recursive: true });
    for (const [namn, text] of webbplats((f) => readFileSync(f, "utf8"), sha)) writeFileSync(join(mapp, namn), text);
    console.log(`✓ sidorna byggda i ${mapp} ur ${sha.slice(0, 7)}`);
    return;
  }
  const g = arg.indexOf("--genomsok");
  if (g >= 0) {
    const bas = arg[g + 1];
    if (!bas?.endsWith("/")) { console.error("✗ ange --genomsok <bas-url som slutar med />"); process.exit(2); }
    const fel = await genomsok(bas);
    for (const f of fel) console.error("✗ " + f);
    if (process.env.GH_TOKEN) await arende(fel);
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, fel.length ? fel.map((f) => `- ✗ ${f}`).join("\n") + "\n" : "✓ Allt aktuellt.\n", { flag: "a" });
    if (fel.length) process.exit(1);
    console.log(`✓ genomsökningen: sidorna på ${bas} lika bygget ur main och inte för gamla, de skriptskrivna delarna aktuella${process.env.DYGN === "true" ? ", dagens synk på main" : ""}, inga gamla adresser`);
    return;
  }
  console.error("✗ ange --bygg <mapp>, --genomsok <bas-url> eller --sjalvtest"); process.exit(2);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/sidorna.ts");
if (direkt) main().catch((e) => { console.error("✗ sidorna:", e instanceof Error ? e.message : e); process.exit(1); });
