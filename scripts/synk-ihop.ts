// Synk-ihop (Bengt 27/10, DECISIONS #731): morgonens dokumentsynk-PR slås ihop utan att vänta på Bengts ord. Flödet
// .github/workflows/synk-ihop.yml kör skriptet när ci eller md-vakt blivit klart på en gren claude/dokumentsynk-*. En PR slås ihop
// när allt detta håller:
//  1. Den är öppen, inte ett utkast, från repots egen gren claude/dokumentsynk-* mot main, och rubriken börjar med Dokumentsynk.
//  2. Grenen rör bara dokumenten: samma lista som `stomvakten.ts --tillatna`, läst ur main och inte ur grenen.
//  3. ci och md-vakt är gröna på exakt huvudet (de flöden grenens filer startar; en PR utan körning är oprövad, inte grön).
//  4. Sammanslagningen med dagens main går utan krock, och dokumentkontrollerna är gröna på det ihopslagna trädet. Är bara de
//     skriptskrivna sidorna inaktuella (main flyttade efter synken) skrivs de om med projektkartan.ts och kortkartan.ts, som i
//     synkens steg 5, och prövas igen.
// Då pushas just det provade trädet till main. Pushen är en snabbspolning och faller om main hunnit flytta; då görs punkt 4 om,
// högst tre gånger. GitHub märker PR:en som ihopslagen när huvudet finns på main. Håller något inte står PR:en kvar med en kommentar,
// och nästa morgons synk bär dess innehåll som förut.
//   node --experimental-strip-types scripts/synk-ihop.ts                 i flödet (GH_TOKEN, GITHUB_REPOSITORY; PR=<nr>, TORR=true)
//   node --experimental-strip-types scripts/synk-ihop.ts --prova <ref>   punkt 2 och 4 mot en lokal gren, utan GitHub och utan push
//   node --experimental-strip-types scripts/synk-ihop.ts --sjalvtest
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { tillatna } from "./stomvakten.ts";

export type Korning = { name: string; event: string; status: string; conclusion: string | null; created_at: string };
export type Lage = { lage: "gron" | "vantar" | "rod"; skal: string };
export type Pr = { number: number; title: string; draft: boolean; head: { ref: string; sha: string; label: string; repo: { full_name: string } | null };
  base: { ref: string } };

const REPO = process.env.GITHUB_REPOSITORY || "Axelstar/Halkvakt";
const GREN = "claude/dokumentsynk-";
/** Kontrollerna vars fel är inaktuella skriptskrivna sidor, som skrivs om i stället för att fälla. */
const SKRIVNA = new Set(["kortkartan.ts", "projektkartan.ts"]);
export const MARK = (sha: string, slag: string) => `<!-- synk-ihop:${sha}:${slag} -->`;
const BUF = 64 * 1024 * 1024;

/** Flödena som grenens filer startar: ci hoppar över rena .md-ändringar och md-vakt kör bara på dem (ci.yml, md-vakt.yml). */
export function kravda(filer: string[]): string[] {
  const k: string[] = [];
  if (filer.some((f) => !f.endsWith(".md"))) k.push("ci");
  if (filer.some((f) => f.endsWith(".md"))) k.push("md-vakt");
  return k;
}

/** Huvudets körningar: den senaste per flöde räknas. Rött går före väntande, eftersom ett fel inte blir grönt av att vänta. */
export function bedom(korningar: Korning[], krav: string[]): Lage {
  const senast = new Map<string, Korning>();
  for (const k of korningar.filter((k) => k.event === "pull_request")) {
    const f = senast.get(k.name);
    if (!f || k.created_at > f.created_at) senast.set(k.name, k);
  }
  const rott: string[] = [], vantar: string[] = [];
  for (const n of krav) if (!senast.has(n)) vantar.push(`${n} har inte körts på huvudet`);
  for (const [n, k] of senast) {
    if (k.status !== "completed") vantar.push(`${n} pågår`);
    else if (krav.includes(n) ? k.conclusion !== "success" : !["success", "skipped", "neutral"].includes(k.conclusion ?? "")) rott.push(`${n} ${k.conclusion}`);
  }
  if (rott.length) return { lage: "rod", skal: rott.join(", ") };
  if (vantar.length) return { lage: "vantar", skal: vantar.join(", ") };
  return { lage: "gron", skal: `${krav.join(" och ")} gröna på huvudet` };
}

/** Synkens PR:er, nyast först: den nyaste bär de äldres innehåll, och en äldre vars huvud då finns på main hoppas över. */
export function valj(prar: Pr[], repo: string, nr = 0): Pr[] {
  return prar.filter((p) => !p.draft && p.base.ref === "main" && p.head.ref.startsWith(GREN) && p.head.repo?.full_name === repo
    && p.title.startsWith("Dokumentsynk") && (!nr || p.number === nr)).sort((a, b) => b.number - a.number);
}

const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8", maxBuffer: BUF }).trim();
const gar = (...a: string[]) => spawnSync("git", a, { encoding: "utf8", maxBuffer: BUF }).status === 0;
function kor(skript: string, ...a: string[]): { ok: boolean; ut: string } {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", `scripts/${skript}`, ...a], { encoding: "utf8", maxBuffer: BUF });
  return { ok: r.status === 0, ut: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

/** Dokumentkontrollerna som ci och md-vakt kör, på trädet som står i arbetskopian. */
function kontrollera(bas: string): { skript: string; ut: string }[] {
  const lista: string[][] = [["beslutsnumren.ts"], ["kortkartan.ts", "--check"], ["projektkartan.ts", "--check"], ["kartsynk.ts", "--check"],
    ["fristvakten.ts", "--check"], ["stomvakten.ts", "--bas", bas]];
  return lista.map(([s, ...a]) => ({ skript: s, r: kor(s, ...a) })).filter((x) => !x.r.ok).map((x) => ({ skript: x.skript, ut: x.r.ut }));
}

/** Punkt 2 och 4: grenen mot origin/main, sammanslagningen och kontrollerna. HEAD står efteråt på det provade trädet. */
export function provaTrad(ref: string, meddelande: string): Lage {
  const bas = git("rev-parse", "origin/main");
  const sidor = JSON.parse(git("show", "origin/main:docs/kortkartan.json")).sidor;
  const filer = git("diff", "--name-only", `${bas}...${ref}`).split("\n").filter(Boolean);
  if (!filer.length) return { lage: "rod", skal: "grenen ändrar ingenting mot main" };
  const utanfor = tillatna(filer, sidor);
  if (utanfor.length) return { lage: "rod", skal: `grenen rör mer än dokumenten: ${utanfor.join(", ")}` };
  git("checkout", "-q", "--detach", bas);
  if (!gar("merge", "--no-ff", "--no-edit", "-m", meddelande, ref)) {
    const krock = git("diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean);
    gar("merge", "--abort");
    return { lage: "rod", skal: `sammanslagningen krockar med main i ${krock.join(", ") || "okända filer"}` };
  }
  let brister = kontrollera(bas), omskrivet = false;
  if (brister.length && brister.every((b) => SKRIVNA.has(b.skript))) {
    for (const s of ["projektkartan.ts", "kortkartan.ts"]) { const r = kor(s); if (!r.ok) return { lage: "rod", skal: `${s} gick inte att köra: ${r.ut.slice(-300)}` }; }
    git("add", "-A");
    if (!gar("diff", "--cached", "--quiet")) { git("commit", "-q", "--amend", "--no-edit"); omskrivet = true; }
    brister = kontrollera(bas);
  }
  if (brister.length) return { lage: "rod", skal: brister.map((b) => `${b.skript} röd: ${b.ut.split("\n").filter((r) => r.includes("✗")).slice(0, 3).join(" / ") || b.ut.slice(-200)}`).join("; ") };
  const efter = tillatna(git("diff", "--name-only", bas, "HEAD").split("\n").filter(Boolean), sidor);
  if (efter.length) return { lage: "rod", skal: `det ihopslagna trädet rör mer än dokumenten: ${efter.join(", ")}` };
  return { lage: "gron", skal: `${filer.length} filer, kontrollerna gröna på det ihopslagna trädet${omskrivet ? ", sidorna omskrivna efter main" : ""}` };
}

async function api(vag: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${vag}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${vag}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

/** En kommentar per huvud och slag, så att varje omkörning inte skriver samma sak igen. */
async function kommentera(pr: Pr, slag: string, text: string): Promise<void> {
  const mark = MARK(pr.head.sha, slag);
  const finns: { body: string }[] = await api(`/issues/${pr.number}/comments?per_page=100`);
  if (finns.some((c) => c.body.includes(mark))) return;
  await api(`/issues/${pr.number}/comments`, { method: "POST", body: { body: `${text}\n\n${mark}` } });
}

const korningen = () => process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : "";

async function en(pr: Pr, torr: boolean): Promise<Lage> {
  git("fetch", "-q", "origin", "main", `+refs/pull/${pr.number}/head:refs/remotes/pr/${pr.number}`);
  if (git("rev-parse", `refs/remotes/pr/${pr.number}`) !== pr.head.sha) return { lage: "vantar", skal: "huvudet flyttade medan flödet körde" };
  if (gar("merge-base", "--is-ancestor", pr.head.sha, "origin/main")) return { lage: "gron", skal: "huvudet finns redan på main" };
  const filer = git("diff", "--name-only", `origin/main...${pr.head.sha}`).split("\n").filter(Boolean);
  const korningar: Korning[] = (await api(`/actions/runs?head_sha=${pr.head.sha}&per_page=100`)).workflow_runs;
  const lage = bedom(korningar, kravda(filer));
  const nej = async (l: Lage) => {
    await kommentera(pr, "nej", `Synk-ihop slår inte ihop den här PR:en automatiskt: ${l.skal}. Den står kvar, och nästa morgons ` +
      `dokumentsynk bär innehållet (DECISIONS #731).${korningen() ? ` Körningen: ${korningen()}` : ""}`);
    return l;
  };
  if (lage.lage === "vantar") return lage;
  if (lage.lage === "rod") return nej(lage);
  const meddelande = `Merge pull request #${pr.number} from ${pr.head.label.replace(":", "/")}\n\n${pr.title}`;
  for (let forsok = 1; forsok <= 3; forsok++) {
    if (forsok > 1) git("fetch", "-q", "origin", "main");
    const l = provaTrad(pr.head.sha, meddelande);
    if (l.lage !== "gron") return nej(l);
    if (torr) return { lage: "gron", skal: `${lage.skal}; ${l.skal}; torrkörning, inget pushat` };
    if (gar("push", "-q", "origin", "HEAD:main")) {
      const sha = git("rev-parse", "HEAD");
      await kommentera(pr, "ihop", `Ihopslagen automatiskt av synk-ihop som ${sha.slice(0, 7)}: ${lage.skal}, ${l.skal} (DECISIONS #731).`);
      return { lage: "gron", skal: `ihopslagen som ${sha.slice(0, 7)}; ${lage.skal}; ${l.skal}` };
    }
  }
  return nej({ lage: "rod", skal: "main flyttade under sammanslagningen tre gånger i rad" });
}

function rapport(rad: string): void {
  console.log(rad);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, rad + "\n\n");
}

function sjalvtest(): void {
  const k = (name: string, status: string, conclusion: string | null, t = "2026-10-28T03:50:00Z", event = "pull_request"): Korning =>
    ({ name, event, status, conclusion, created_at: t });
  const ok1 = kravda(["STATUS.md"]).join() === "md-vakt" && kravda(["docs/KUVOSEN.html"]).join() === "ci"
    && kravda(["STATUS.md", "docs/takten.json"]).join() === "ci,md-vakt";
  const krav = ["ci", "md-vakt"];
  const ok2 = bedom([k("ci", "completed", "success"), k("md-vakt", "completed", "success")], krav).lage === "gron"
    && bedom([k("md-vakt", "completed", "success")], krav).lage === "vantar"
    && bedom([k("ci", "in_progress", null), k("md-vakt", "completed", "success")], krav).lage === "vantar"
    && bedom([k("ci", "completed", "failure"), k("md-vakt", "in_progress", null)], krav).lage === "rod"
    && bedom([], ["md-vakt"]).lage === "vantar";
  // En omkörning ersätter en fallen körning; ett annat flöde som hoppades över fäller inte; en körning från en push räknas inte.
  const ok3 = bedom([k("ci", "completed", "failure", "2026-10-28T03:50:00Z"), k("ci", "completed", "success", "2026-10-28T04:10:00Z"),
    k("md-vakt", "completed", "success"), k("livemotorn", "completed", "skipped")], krav).lage === "gron"
    && bedom([k("ci", "completed", "success"), k("md-vakt", "completed", "success"), k("android", "completed", "failure")], krav).lage === "rod"
    && bedom([k("ci", "completed", "success", undefined, "push"), k("md-vakt", "completed", "success")], krav).lage === "vantar";
  const pr = (number: number, ref: string, o: Partial<Pr> = {}): Pr => ({ number, title: "Dokumentsynk: 2026-10-28", draft: false,
    head: { ref, sha: "a".repeat(40), label: `Axelstar:${ref}`, repo: { full_name: "Axelstar/Halkvakt" } }, base: { ref: "main" }, ...o });
  const v = valj([pr(5, "claude/dokumentsynk-2026-10-27"), pr(7, "claude/dokumentsynk-2026-10-28"), pr(8, "claude/annat"),
    pr(9, "claude/dokumentsynk-x", { draft: true }), pr(10, "claude/dokumentsynk-y", { title: "Något annat" }),
    pr(11, "claude/dokumentsynk-z", { head: { ref: "claude/dokumentsynk-z", sha: "b", label: "x:y", repo: { full_name: "x/Halkvakt" } } })],
    "Axelstar/Halkvakt");
  const ok4 = v.map((p) => p.number).join() === "7,5" && valj([pr(5, "claude/dokumentsynk-a"), pr(7, "claude/dokumentsynk-b")], "Axelstar/Halkvakt", 5).length === 1;
  const ok5 = MARK("abc", "nej") === "<!-- synk-ihop:abc:nej -->";
  if (!(ok1 && ok2 && ok3 && ok4 && ok5)) { console.error("✗ synk-ihop självtest", { ok1, ok2, ok3, ok4, ok5 }); process.exit(1); }
  console.log("✓ synk-ihop självtest: flödena som grenens filer startar, huvudets läge (grönt, väntande, rött, omkörning, push räknas inte) " +
    "och valet av synkens PR:er, nyast först");
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2);
  if (arg.includes("--sjalvtest")) return sjalvtest();
  const i = arg.indexOf("--prova");
  if (i >= 0) {
    const ref = arg[i + 1];
    if (!ref) { console.error("✗ ange --prova <ref>"); process.exit(2); }
    git("fetch", "-q", "origin", "main");
    const l = provaTrad(git("rev-parse", ref), `Prov av ${ref}`);
    console.log(`${l.lage === "gron" ? "✓" : "✗"} ${ref}: ${l.skal}`);
    process.exit(l.lage === "gron" ? 0 : 1);
  }
  if (!process.env.GH_TOKEN) { console.error("✗ GH_TOKEN saknas"); process.exit(2); }
  const torr = process.env.TORR === "true";
  const prar = valj(await api("/pulls?state=open&base=main&per_page=100"), REPO, Number(process.env.PR) || 0);
  if (!prar.length) { rapport("Ingen öppen synk-PR att slå ihop."); return; }
  let rott = false;
  for (const pr of prar) {
    const l = await en(pr, torr);
    rapport(`#${pr.number} ${pr.head.ref} (${pr.head.sha.slice(0, 7)}): ${{ gron: "klar", vantar: "väntar", rod: "slås inte ihop" }[l.lage]}: ${l.skal}`);
    if (l.lage === "rod") rott = true;
  }
  if (rott) process.exit(1);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/synk-ihop.ts");
if (direkt) main().catch((e) => { console.error("✗ synk-ihop:", e instanceof Error ? e.message : e); process.exit(1); });
