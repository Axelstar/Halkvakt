// Kartsynken (Bengts ja 3/10, DECISIONS #447, kort #288): projektkartan bokför det Bengt och Axel gör, utan att någon säger till.
// Två vägar:
//  1. Maskinvägen — byggsignalerna (edge function byggsignaler, speglade i ett ärende i repot) bockar byggsteg som bär en
//     regel. En regel flyttar bara framåt (saknas → pågår → klar), aldrig bakåt, och beviset bär signalens egen tidpunkt.
//  2. Bokföringsvägen — varje commit på main sedan förra synken som inte rörde kartan listas, och sessionen som kör synken
//     bokför den på sin del (eller konstaterar att den inte rör någon). Maskinernas commits räknas inte.
//   node --experimental-strip-types scripts/kartsynk.ts              signalerna och reglerna; listar öppna PR:er och obokförda commits
//   node --experimental-strip-types scripts/kartsynk.ts --bokford    efter bokföringen: synken flyttas till origin/main
//   node --experimental-strip-types scripts/kartsynk.ts --tillatna   rör grenen bara kartan och det kartan skriver? (#447 p. 2)
//   node --experimental-strip-types scripts/kartsynk.ts --check      okända regler, kvar-rader som saknas i delens lista
//   node --experimental-strip-types scripts/kartsynk.ts --sjalvtest
// Efter en ändring skrivs kartan och lägesraderna om (projektkartan.ts). Rutinen står i CLAUDE.md under PROJEKTKARTAN.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { type Del, type Karta, type Pr, type Steg, stockholm } from "./projektkartan.ts";
import { type Lagrad, ISSUE_MARK, lasKropp } from "../supabase/functions/byggsignaler/signaler.ts";

const FIL = "docs/projektkartan.json";
const REPO = "Axelstar/Halkvakt";
/** Commits som inte är arbete att bokföra: dagens halkläge, källvakten. */
const MASKINER = new Set(["Marknadsmotorn", "trv-bevakning"]);
const RANG: Record<Steg["status"], number> = { ej: -1, saknas: 0, pagar: 1, klar: 2 };
const REGLER = ["ios-uppladdad", "ios-installerad", "ios-extern", "appstore", "inlamnad", "testare", "facit"] as const;
/** App Store-tillstånd från och med inlämningen (Apples appStoreVersions.appVersionState). */
const INLAMNAD = ["WAITING_FOR_REVIEW", "IN_REVIEW", "PENDING_DEVELOPER_RELEASE", "ACCEPTED", "PENDING_APPLE_RELEASE",
  "PROCESSING_FOR_DISTRIBUTION", "READY_FOR_DISTRIBUTION", "READY_FOR_SALE"];

type Utfall = { status: "pagar" | "klar"; bevis: string } | null;

/** 0.3.10 > 0.3.9: talen jämförs ett och ett. */
export function versionCmp(a: string, b: string): number {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** Vad signalerna säger om ett steg med regeln r. null = inget bevis än (eller en regel som inte läses). */
export function utfall(r: string, sig: Lagrad[]): Utfall {
  const [namn, ...arg] = r.split(":");
  const asc = (re: RegExp) => sig.filter((s) => s.kalla === "asc" && re.test(s.nyckel));
  const nr = (s: Lagrad) => Number(s.nyckel.split(":")[1]);
  const minst = <T extends Lagrad>(xs: T[], f: (s: T) => number) => xs.sort((a, b) => f(a) - f(b))[0];
  if (namn === "ios-uppladdad") {
    const b = minst(asc(/^bygge:\d+$/).filter((s) => nr(s) >= +arg[0] && s.varde.behandling === "VALID"), nr);
    return b ? { status: "klar", bevis: `(${nr(b)}) uppladdad ${stockholm(String(b.varde.uppladdad ?? b.forst_sedd))} (App Store Connect)` } : null;
  }
  if (namn === "ios-installerad") {
    const b = minst(asc(/^bygge:\d+:installerad$/).filter((s) => nr(s) >= +arg[0]), nr);
    if (!b) return null;
    const v = b.varde as { installer: number; sessioner: number };
    const tal = `${v.installer} installationer, ${v.sessioner} sessioner`;
    return v.sessioner > 0
      ? { status: "klar", bevis: `(${nr(b)}) installerad och öppnad på telefon: ${tal} (TestFlight, sedd första gången ${stockholm(b.forst_sedd)})` }
      : { status: "pagar", bevis: `(${nr(b)}) installerad men inte öppnad: ${tal} (TestFlight)` };
  }
  if (namn === "ios-extern") {
    const ute = minst(asc(/^bygge:\d+:extern:IN_BETA_TESTING$/).filter((s) => nr(s) >= +arg[0]), nr);
    if (ute) return { status: "klar", bevis: `(${nr(ute)}) i extern testning sedan ${stockholm(ute.forst_sedd)} (TestFlight)` };
    const granskas = minst(asc(/^bygge:\d+:extern:(WAITING_FOR_BETA_REVIEW|IN_BETA_REVIEW|BETA_APPROVED)$/).filter((s) => nr(s) >= +arg[0]), nr);
    return granskas ? { status: "pagar", bevis: `(${nr(granskas)}) hos Beta App Review sedan ${stockholm(granskas.forst_sedd)} (TestFlight)` } : null;
  }
  if (namn === "appstore") {
    const ver = asc(/^appstore:[\d.]+:[A-Z_]+$/).map((s) => ({ s, v: s.nyckel.split(":")[1], t: s.nyckel.split(":")[2] }))
      .filter((x) => versionCmp(x.v, arg[0]) >= 0).sort((a, b) => versionCmp(a.v, b.v));
    const slappt = ver.find((x) => x.t === "READY_FOR_DISTRIBUTION" || x.t === "READY_FOR_SALE");
    if (slappt) return { status: "klar", bevis: `${slappt.v} släppt i App Store ${stockholm(slappt.s.forst_sedd)} (App Store Connect)` };
    const godkand = ver.find((x) => ["PENDING_DEVELOPER_RELEASE", "ACCEPTED", "PENDING_APPLE_RELEASE", "PROCESSING_FOR_DISTRIBUTION"].includes(x.t));
    return godkand ? { status: "pagar", bevis: `${godkand.v} godkänd av Apple ${stockholm(godkand.s.forst_sedd)}, väntar på Release (App Store Connect)` } : null;
  }
  if (namn === "inlamnad") {
    // Väg C (6/10, tillägg till #447): klar när en version ≥ den angivna nått Waiting for Review eller ett senare tillstånd.
    const v = asc(/^appstore:[\d.]+:[A-Z_]+$/).map((s) => ({ s, v: s.nyckel.split(":")[1], t: s.nyckel.split(":")[2] }))
      .filter((x) => versionCmp(x.v, arg[0]) >= 0 && INLAMNAD.includes(x.t)).sort((a, b) => a.s.forst_sedd.localeCompare(b.s.forst_sedd))[0];
    return v ? { status: "klar", bevis: `${v.v} inlämnad till App Review: ${v.t} sedd ${stockholm(v.s.forst_sedd)} (App Store Connect)` } : null;
  }
  if (namn === "testare") {
    const g = sig.find((s) => s.kalla === "asc" && s.nyckel === `grupp:${arg[0]}`);
    const antal = Number(g?.varde.antal ?? 0);
    return g && antal >= +arg[1] ? { status: "klar", bevis: `${antal} testare i ${arg[0]} (TestFlight, läst ${stockholm(g.senast_sedd)})` } : null;
  }
  if (namn === "facit") {
    const svar = sig.filter((s) => s.kalla === "facit" && (arg[0] === "alla" || s.nyckel.startsWith(`${arg[0]}:`)))
      .filter((s) => versionCmp(s.nyckel.split(":")[1], arg[1]) >= 0 && Number(s.varde.antal) > 0)
      .sort((a, b) => String(a.varde.forsta).localeCompare(String(b.varde.forsta)));
    if (!svar.length) return null;
    const antal = svar.reduce((n, s) => n + Number(s.varde.antal), 0);
    return { status: "klar", bevis: `${antal} förarsvar i ${svar.map((s) => s.nyckel.replace(":", " ")).join(", ")}, första ${stockholm(String(svar[0].varde.forsta))} (driver_facit)` };
  }
  return null;
}

/** Regeln läses: känt namn och rätt antal argument. */
export function giltigRegel(r: string): boolean {
  const [namn, ...arg] = r.split(":");
  const antal: Record<string, number> = { "ios-uppladdad": 1, "ios-installerad": 1, "ios-extern": 1, appstore: 1, inlamnad: 1, testare: 2, facit: 2 };
  return (REGLER as readonly string[]).includes(namn) && arg.length === antal[namn] && arg.every(Boolean);
}

/** Tillämpar reglerna på kartan (ändrar den). Returnerar en rad per ändring. Bara framåt; en del vars steg alla är klara och
 *  vars lista är tom blir grön. */
export function tillampa(k: Karta, sig: Lagrad[], nu: Date): string[] {
  const logg: string[] = [];
  for (const d of k.delar) {
    let andrad = false;
    for (const s of d.steg ?? []) {
      if (!s.regel || s.status === "ej") continue;
      const u = utfall(s.regel, sig);
      if (!u || RANG[u.status] <= RANG[s.status]) continue;
      s.status = u.status; s.bevis = u.bevis; andrad = true;
      logg.push(`${d.namn} · ${s.namn}: ${u.status === "klar" ? "klart" : "pågår"} — ${u.bevis}`);
      if (u.status === "klar" && s.kvar?.length && d.saknas) {
        d.saknas = d.saknas.filter((x) => !s.kvar!.includes(x));
        if (!d.saknas.length) delete d.saknas;
      }
    }
    if (!andrad) continue;
    const aktiva = (d.steg ?? []).filter((s) => s.status !== "ej");
    if (aktiva.every((s) => s.status === "klar") && d.lage !== "gron" && d.lage !== "gra" && !d.saknas?.length) {
      d.lage = "gron"; d.bevis = `Alla byggsteg klara; bokfört av kartsynken ${stockholm(nu.toISOString())}.`;
      delete d.nyckel; delete d.saknas;
      logg.push(`${d.namn}: grön`);
    } else if (d.lage === "rod" && aktiva.some((s) => s.status !== "saknas")) {
      d.lage = "orange";
      logg.push(`${d.namn}: delvis`);
    }
  }
  return logg;
}

/** Källornas läge för kartans synkrad. Stabila texter, så att en oförändrad källa inte ger en ny commit. */
export function kallor(sig: Lagrad[], skriven: Date, nu: Date): Record<string, string> {
  const st = sig.find((s) => s.kalla === "asc" && s.nyckel === "status")?.varde as { ok?: boolean; fel?: string } | undefined;
  const asc = !st ? "inte läst än" : st.ok ? "läses varje timme"
    : String(st.fel).startsWith("nyckeln saknas") ? "läses inte, Axels nyckel saknas (kort #288)" : "läses inte, fel från App Store Connect (se ärendet)";
  const timmar = (nu.getTime() - skriven.getTime()) / 3_600_000;
  return { "App Store Connect": asc, "Förarsvaren": "läses varje timme",
    "Byggsignalerna": timmar <= 3 ? "skrivs varje timme" : `inte skrivna sedan ${stockholm(skriven.toISOString())}` };
}

/** Python-formen som datafilen skrivs i (json.dumps med ensure_ascii=False): ", " och ": " mellan delarna. */
export function py(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(py).join(", ")}]`;
  if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${py(x)}`).join(", ")}}`;
  return JSON.stringify(v);
}

/** Skriver tillbaka de delar som ändrats och synkraden, rad för rad, så att diffen bara bär det som ändrats. */
export function skrivTillbaka(text: string, fore: Karta, efter: Karta): string {
  const rader = text.split("\n");
  for (let i = 0; i < efter.delar.length; i++) {
    const f = py(fore.delar[i]), e = py(efter.delar[i]);
    if (f === e) continue;
    const n = rader.findIndex((r) => r.trim().replace(/,$/, "") === f);
    if (n < 0) throw new Error(`${efter.delar[i].id}: raden har inte väntad form — skriv inte över för hand`);
    rader[n] = rader[n].replace(f, () => e);
  }
  if (efter.synk) {
    const rad = `  "synk": ${py(efter.synk)},`;
    const n = rader.findIndex((r) => r.startsWith('  "synk": '));
    if (n >= 0) rader[n] = rad;
    else rader.splice(rader.findIndex((r) => r.startsWith('  "url": ')) + 1, 0, rad);
  }
  const ny = rader.join("\n");
  if (kanon(JSON.parse(ny)) !== kanon(efter)) throw new Error("tillbakaskrivningen ger inte samma karta");
  return ny;
}

/** JSON med nycklarna i bokstavsordning: samma innehåll ger samma text oavsett ordning. */
const kanon = (v: unknown): string => Array.isArray(v) ? `[${v.map(kanon).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${kanon((v as any)[k])}`).join(",")}}` : JSON.stringify(v);

/** Tar bort det kartskripten skriver (LÄGESRADER och ÖPPNA KORT), så att resten av en sida kan jämföras. */
export function utanGenererat(s: string): string {
  return s.replace(/<!-- LÄGESRADER §[^>]*-->[\s\S]*?<!-- \/LÄGESRADER -->/gu, "").replace(/<!-- ÖPPNA KORT:[^>]*-->[\s\S]*?<!-- \/ÖPPNA KORT -->/gu, "");
}

type Commit = { sha: string; forfattare: string; tid: string; rubrik: string; filer: string[] };

/** Commits att bokföra: inte maskinernas, inte kartsynkens egna, inte de som själva rörde kartan. */
export function attBokfora(commits: Commit[]): Commit[] {
  return commits.filter((c) => !MASKINER.has(c.forfattare) && !c.rubrik.startsWith("Kartsynk") && !c.filer.includes(FIL));
}

const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" });

export function commitsSedan(till: string): Commit[] {
  return git("log", "--format=%x01%H%x09%an%x09%aI%x09%s", "--name-only", `${till}..origin/main`).split("\x01").filter((x) => x.trim())
    .map((b) => {
      const [huvud, ...filer] = b.split("\n");
      const [sha, forfattare, tid, rubrik] = huvud.split("\t");
      return { sha, forfattare, tid, rubrik, filer: filer.filter(Boolean) };
    });
}

/** Kör ett kommando och lämnar stdout (stderr fångas i felet); ersätts i självtestet, så att provet inte kräver gh eller git. */
export type Kor = (cmd: string, args: string[], input?: string) => string;
const kor: Kor = (cmd, args, input) => execFileSync(cmd, args, { input, encoding: "utf8", stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });

/** Det molnets GH_TOKEN och GITHUB_TOKEN bär: GitHub-proxyn byter in den riktiga nyckeln för gh, inte för ett skript som läser
 *  variabeln (code.claude.com/docs/en/cloud-environments). Den förra koden skickade den och fick 401 (8/10, DECISIONS #487). */
const PLATSHALLARE = "proxy-injected";

/** Nyckeln för fetch när gh inte når fram, och varifrån den kom (källan skrivs ut, nyckeln aldrig). */
export function githubToken(env: Record<string, string | undefined> = process.env, k: Kor = kor): { nyckel: string; kalla: string } {
  for (const namn of ["GH_TOKEN", "GITHUB_TOKEN"]) {
    const v = env[namn];
    if (v && v !== PLATSHALLARE) return { nyckel: v, kalla: namn };
  }
  const t = k("git", ["credential", "fill"], "protocol=https\nhost=github.com\n\n").split("\n").find((r) => r.startsWith("password="))?.slice(9);
  if (!t) throw new Error("ingen GitHub-inloggning (gh, GH_TOKEN, GITHUB_TOKEN eller git credential)");
  return { nyckel: t, kalla: "git credential" };
}

/** GET mot GitHubs REST-API. Först `gh api`, som har sin egen inloggning och i molnet är den väg proxyn släpper igenom; saknas gh
 *  eller fallerar den (Bengts Windows har ingen gh) tar fetch över med githubToken(). Felet bär båda vägarnas skäl. */
export async function github(sokvag: string, env: Record<string, string | undefined> = process.env, k: Kor = kor,
  hamta: typeof fetch = fetch): Promise<any> {
  let ghSkal: string;
  try { return JSON.parse(k("gh", ["api", `repos/${REPO}/${sokvag}`])); } catch (e: any) {
    ghSkal = e?.code === "ENOENT" ? "gh saknas" : String(e?.stderr || e?.message || e).trim().split("\n")[0].slice(0, 120);
  }
  const { nyckel, kalla } = githubToken(env, k);
  const r = await hamta(`https://api.github.com/repos/${REPO}/${sokvag}`,
    { headers: { Authorization: `Bearer ${nyckel}`, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub ${r.status} med nyckel ur ${kalla} (gh api: ${ghSkal}): ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}

/** En rad per öppen PR. Main är inte hela sanningen: 3–4/10 låg fyra PR:er med bevis och kod utan att någon lyfte dem (6/10). */
export function prRad(p: { number: number; title: string; user?: { login?: string }; head?: { ref?: string }; created_at: string }, nu: Date): string {
  const dygn = Math.floor((nu.getTime() - new Date(p.created_at).getTime()) / 86400000);
  return `  #${p.number} ${p.title.slice(0, 90)} · ${p.head?.ref ?? "?"} · ${p.user?.login ?? "?"} · öppnad ${stockholm(p.created_at)}${dygn >= 1 ? ` ⚠ ${dygn} dygn utan ord` : ""}`;
}

async function oppnaPr(): Promise<any[]> {
  return await github("pulls?state=open&per_page=50") as any[];
}

/** Det kartan sparar om en öppen PR, för listan Väntar på Bengt (#484 (c)). */
export function prInfo(p: { number: number; title: string; user?: { login?: string }; head?: { ref?: string }; created_at: string }): Pr {
  return { nr: p.number, titel: p.title.slice(0, 120), gren: p.head?.ref ?? "?", av: p.user?.login ?? "?", oppnad: p.created_at };
}

async function lasSignaler(): Promise<{ sig: Lagrad[]; skriven: Date; nr: number }> {
  const issue = (await github("issues?state=open&per_page=100") as any[]).find((i) => (i.body ?? "").startsWith(ISSUE_MARK));
  if (!issue) throw new Error("ärendet med byggsignalerna finns inte än (byggsignaler har inte kört)");
  return { sig: lasKropp(issue.body), skriven: new Date(issue.updated_at), nr: issue.number };
}

function skriv(text: string, fore: Karta, efter: Karta) {
  writeFileSync(FIL + ".tmp", skrivTillbaka(text, fore, efter));
  renameSync(FIL + ".tmp", FIL);
  execFileSync(process.execPath, ["--experimental-strip-types", "scripts/projektkartan.ts"], { stdio: "inherit" });
}

async function sjalvtest(): Promise<void> {
  const t = "2026-10-03T12:05:00.000Z";
  const s = (kalla: string, nyckel: string, varde: Record<string, unknown>): Lagrad => ({ kalla, nyckel, varde, forst_sedd: t, senast_sedd: t });
  const sig = [
    s("asc", "status", { ok: true }),
    s("asc", "bygge:21", { nr: 21, behandling: "VALID", uppladdad: "2026-10-02T11:56:00Z" }),
    s("asc", "bygge:22", { nr: 22, behandling: "VALID", uppladdad: "2026-10-03T08:10:00Z" }),
    s("asc", "bygge:22:installerad", { installer: 2, sessioner: 5, forsta: "2025-10-05T00:00:00Z" }),
    s("asc", "bygge:21:extern:IN_BETA_TESTING", {}),
    s("asc", "appstore:0.3.9:PENDING_DEVELOPER_RELEASE", {}),
    s("asc", "grupp:Kompisarna", { antal: 12 }),
    s("facit", "ios:0.3.9", { antal: 4, forsta: "2026-09-28T07:00:00Z" }),
    s("facit", "android:0.3.10", { antal: 1, forsta: "2026-10-03T07:00:00Z" }),
  ];
  const fall: [string, string | null][] = [
    ["ios-uppladdad:22", "klar"], ["ios-uppladdad:23", null], ["ios-installerad:22", "klar"], ["ios-installerad:23", null],
    ["ios-extern:21", "klar"], ["ios-extern:22", null], ["appstore:0.3.9", "pagar"], ["appstore:0.3.10", null],
    ["testare:Kompisarna:12", "klar"], ["testare:Kompisarna:13", null], ["facit:ios:0.3.10", null], ["facit:alla:0.3.10", "klar"],
    ["inlamnad:0.3.9", "klar"], ["inlamnad:0.3.10", null],
    ["okand:1", null],
  ];
  const fel: string[] = [];
  for (const [r, vant] of fall) if ((utfall(r, sig)?.status ?? null) !== vant) fel.push(`${r}: väntade ${vant}, fick ${utfall(r, sig)?.status ?? null}`);
  if (utfall("ios-uppladdad:22", sig)?.bevis !== "(22) uppladdad 3/10 10:10 (App Store Connect)") fel.push(`bevisraden: ${utfall("ios-uppladdad:22", sig)?.bevis}`);
  // 5/10: Apples datapunkt gäller hela året (start 2025-10-05), så tidpunkten är när signalen först såg installationen (kort #288).
  if (utfall("ios-installerad:22", sig)?.bevis !== "(22) installerad och öppnad på telefon: 2 installationer, 5 sessioner (TestFlight, sedd första gången 3/10 14:05)")
    fel.push(`installationens tidpunkt: ${utfall("ios-installerad:22", sig)?.bevis}`);
  if (versionCmp("0.3.10", "0.3.9") <= 0 || versionCmp("0.3.9", "0.3.9") !== 0) fel.push("versionCmp");
  if (!giltigRegel("testare:Kompisarna:12") || giltigRegel("testare:12") || giltigRegel("okand:1")) fel.push("giltigRegel");

  // Framåt men aldrig bakåt; kvar-raden stryks; en del vars steg alla är klara och vars lista är tom blir grön.
  const del = (lage: Del["lage"], steg: Steg[], saknas?: string[]): Del => ({ id: "x", namn: "X", block: "b", lage, steg, saknas, beror: [], kort: [], beskrivs: [] });
  const k = { url: "https://u", projektmal: { text: "", kalla: "" }, block: [], mal: [], delar: [
    del("orange", [{ namn: "Bygge", status: "klar", bevis: "b" }, { namn: "Telefon", status: "pagar", regel: "ios-installerad:22", kvar: ["sedd"] }], ["sedd"]),
    del("orange", [{ namn: "Släppt", status: "klar", bevis: "handbokfört", regel: "appstore:0.3.9" }], ["annat"]),
    del("rod", [{ namn: "Utskick", status: "saknas", regel: "ios-extern:22" }, { namn: "Godkänt", status: "saknas", regel: "appstore:0.3.9" }], ["allt"]),
  ] } as unknown as Karta;
  const logg = tillampa(k, sig, new Date(t));
  if (k.delar[0].lage !== "gron" || k.delar[0].saknas) fel.push(`delen blev inte grön: ${JSON.stringify(k.delar[0])}`);
  if (k.delar[1].steg![0].status !== "klar" || k.delar[1].steg![0].bevis !== "handbokfört") fel.push("ett klart steg flyttades bakåt");
  if (k.delar[2].lage !== "orange" || k.delar[2].steg![1].status !== "pagar") fel.push(`röd del med pågående steg: ${JSON.stringify(k.delar[2])}`);
  if (logg.length !== 4) fel.push(`loggen: ${JSON.stringify(logg)}`);

  // Formen: tillbakaskrivningen rör bara den ändrade raden.
  const fore = { url: "https://u", delar: [{ id: "a", n: "å" }, { id: "b", n: 1 }] } as unknown as Karta;
  const text = `{\n  "url": "https://u",\n  "delar": [\n    ${py(fore.delar[0])},\n    ${py(fore.delar[1])}\n  ]\n}\n`;
  const efter = JSON.parse(JSON.stringify(fore)); efter.delar[1].n = 2; efter.synk = { till: "abc", tid: t, kallor: {} };
  const ny = skrivTillbaka(text, fore, efter);
  if (!ny.includes('    {"id": "a", "n": "å"},\n    {"id": "b", "n": 2}\n') || !ny.includes('  "url": "https://u",\n  "synk": {"till": "abc"')) fel.push(`tillbakaskrivningen:\n${ny}`);

  if (utanGenererat("a<!-- LÄGESRADER §2: x -->\nq\n<!-- /LÄGESRADER -->b<!-- ÖPPNA KORT: y -->z<!-- /ÖPPNA KORT -->c") !== "abc") fel.push("utanGenererat");
  if (kanon(prInfo({ number: 5, title: "x".repeat(130), head: { ref: "g" }, created_at: t })) !== kanon({ nr: 5, titel: "x".repeat(120), gren: "g", av: "?", oppnad: t }))
    fel.push("prInfo");
  const c = (forfattare: string, rubrik: string, filer: string[]): Commit => ({ sha: "s", forfattare, tid: t, rubrik, filer });
  if (attBokfora([c("Axelstar", "x", ["ios/a.swift"]), c("Marknadsmotorn", "x", ["a"]), c("895845", "Kartsynk: 3/10", ["a"]), c("895845", "y", [FIL])]).length !== 1) fel.push("attBokfora");
  const pr = prRad({ number: 743, title: "Kartsynk: Axels Mac-körning", user: { login: "Axelstar" }, head: { ref: "kartsynk/2026-10-04-mac" }, created_at: "2026-10-04T09:14:51Z" }, new Date("2026-10-06T06:00:00Z"));
  if (pr !== "  #743 Kartsynk: Axels Mac-körning · kartsynk/2026-10-04-mac · Axelstar · öppnad 4/10 11:14 ⚠ 1 dygn utan ord") fel.push(`prRad: ${pr}`);

  // Vägen till GitHub (8/10): gh api först; utan gh fetch med en nyckel, GH_TOKEN före GITHUB_TOKEN före git, och molnets
  // platshållare räknas inte som nyckel. Kommandona och fetch är låtsade, så provet kräver varken gh, git eller nät.
  const anrop: string[] = [], skickat: string[] = [];
  const falsk = (gh: "ok" | "saknas" | "401"): Kor => (cmd, args) => {
    anrop.push(`${cmd} ${args[0]}`);
    if (cmd === "git") return "protocol=https\nhost=github.com\nusername=x\npassword=ur-git\n";
    if (gh === "saknas") throw Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" });
    if (gh === "401") throw Object.assign(new Error("Command failed: gh api"), { status: 1, stderr: "gh: Bad credentials (HTTP 401)\n" });
    return '[{"number":1}]';
  };
  const svar = (status: number) => (async (_u: unknown, init?: RequestInit) => {
    skickat.push(String((init?.headers as Record<string, string>).Authorization));
    return new Response(status === 200 ? "[]" : '{"message":"Bad credentials"}', { status });
  }) as typeof fetch;
  const vag = async (env: Record<string, string>, gh: "ok" | "saknas" | "401", status = 200) => {
    anrop.length = 0; skickat.length = 0;
    let ut: string;
    try { ut = JSON.stringify(await github("pulls", env, falsk(gh), svar(status))); } catch (e) { ut = String(e); }
    return `${anrop.join(", ")} → ${skickat.join(", ") || "ingen fetch"} → ${ut}`;
  };
  const moln = { GH_TOKEN: PLATSHALLARE, GITHUB_TOKEN: PLATSHALLARE };
  const vagar: [string, string][] = [
    [await vag(moln, "ok"), 'gh api → ingen fetch → [{"number":1}]'],
    [await vag(moln, "saknas"), "gh api, git credential → Bearer ur-git → []"],
    [await vag({ GITHUB_TOKEN: "ur-github" }, "saknas"), "gh api → Bearer ur-github → []"],
    [await vag({ GH_TOKEN: "ur-gh", GITHUB_TOKEN: "ur-github" }, "saknas"), "gh api → Bearer ur-gh → []"],
    [await vag(moln, "401", 401), 'gh api, git credential → Bearer ur-git → Error: GitHub 401 med nyckel ur git credential (gh api: gh: Bad credentials (HTTP 401)): {"message":"Bad credentials"}'],
  ];
  for (const [fick, vant] of vagar) if (fick !== vant) fel.push(`vägen till GitHub:\n  väntade ${vant}\n  fick    ${fick}`);
  if (vagar[4][0].split("→")[2].includes("ur-git")) fel.push("felraden bär nyckeln");

  if (fel.length) { console.error("✗ kartsynk självtest:\n" + fel.join("\n")); process.exit(1); }
  console.log("✓ kartsynk självtest: reglerna, framåt-bara, gröna delar, radformen, de genererade blocken, commitfiltret, PR-raden och vägen till GitHub");
}

function check(k: Karta): void {
  const fel: string[] = [];
  for (const d of k.delar) for (const s of d.steg ?? []) {
    if (s.regel && !giltigRegel(s.regel)) fel.push(`${d.id} · ${s.namn}: okänd regel "${s.regel}"`);
    if (s.regel && s.status === "ej") fel.push(`${d.id} · ${s.namn}: regel på ett steg som inte gäller`);
    if (s.kvar && !s.regel) fel.push(`${d.id} · ${s.namn}: kvar utan regel`);
    if (s.regel && s.status !== "klar") for (const x of s.kvar ?? []) if (!d.saknas?.includes(x)) fel.push(`${d.id} · ${s.namn}: kvar-raden "${x}" står inte i delens lista`);
  }
  if (fel.length) { console.error("✗ kartsynk:\n" + fel.join("\n")); process.exit(1); }
  const regler = k.delar.flatMap((d) => (d.steg ?? []).filter((s) => s.regel)).length;
  console.log(`✓ kartsynk: ${regler} steg läses av kartsynken, alla regler kända${k.synk ? `, synkad till ${k.synk.till.slice(0, 7)}` : ""}`);
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2);
  if (arg.includes("--sjalvtest")) return sjalvtest();
  const text = readFileSync(FIL, "utf8");
  const k = JSON.parse(text) as Karta;
  if (arg.includes("--check")) return check(k);

  if (arg.includes("--tillatna")) {
    git("fetch", "-q", "origin");
    const filer = git("diff", "--name-only", "origin/main...HEAD").split("\n").filter(Boolean);
    const fel = filer.filter((f) => f !== FIL && f !== "docs/PROJEKTKARTAN.html" &&
      utanGenererat(git("show", `origin/main:${f}`)) !== utanGenererat(readFileSync(f, "utf8")));
    if (!filer.length) { console.error("✗ grenen ändrar ingenting"); process.exit(1); }
    if (fel.length) { console.error(`✗ grenen rör mer än kartan: ${fel.join(", ")} — vänta på Bengts "slå ihop"`); process.exit(1); }
    console.log(`✓ grenen rör bara kartan och det kartan skriver (${filer.length} filer) — får slås ihop på grön körning (DECISIONS #447)`);
    return;
  }

  git("fetch", "-q", "origin");
  const main = git("rev-parse", "origin/main").trim();
  if (arg.includes("--bokford")) {
    const efter = JSON.parse(text) as Karta;
    efter.synk = { ...k.synk, till: main, tid: new Date().toISOString(), kallor: k.synk?.kallor ?? {} };
    skriv(text, k, efter);
    console.log(`✓ synken flyttad till ${main.slice(0, 7)}`);
    return;
  }

  // 1. Maskinvägen.
  const efter = JSON.parse(text) as Karta;
  const nu = new Date();
  let logg: string[] = [], nyaKallor = k.synk?.kallor ?? {};
  try {
    const { sig, skriven, nr } = await lasSignaler();
    logg = tillampa(efter, sig, nu);
    nyaKallor = kallor(sig, skriven, nu);
    console.log(`Signalerna (ärende #${nr}, skrivet ${stockholm(skriven.toISOString())}): ${Object.entries(nyaKallor).map(([a, b]) => `${a} ${b}`).join(" · ")}`);
  } catch (e) {
    console.log(`⚠ Signalerna lästes inte: ${String(e).slice(0, 200)}. Reglerna står kvar; bokföringen nedan gäller ändå.`);
  }

  // 1b. Öppna PR:er: det som väntar på ett ord ska synas i varje rapport (6/10, Bengts nej till att CI slår ihop kartgrenar),
  // och sedan 7/10 överst i kartan under Väntar på Bengt (#484 (c)) — därför sparas de i synk.prar.
  let prar: Pr[] | null = null;
  try {
    const raa = await oppnaPr();
    prar = raa.map(prInfo);
    console.log(raa.length ? `Öppna PR:er (${raa.length}) — lyft dem som väntar i rapporten:\n${raa.map((p) => prRad(p, nu)).join("\n")}` : "Inga öppna PR:er.");
  } catch (e) { console.log(`⚠ PR-listan lästes inte: ${String(e).slice(0, 200)}. Kartans lista står kvar.`); }

  const kallorAndrade = kanon(nyaKallor) !== kanon(k.synk?.kallor ?? {});
  const prAndrade = prar !== null && kanon(prar) !== kanon(k.synk?.prar ?? []);
  if (logg.length || kallorAndrade || prAndrade) {
    efter.synk = { ...k.synk, till: k.synk?.till ?? main, tid: nu.toISOString(), kallor: nyaKallor, ...(prar ? { prar, prtid: nu.toISOString() } : {}) };
    skriv(text, k, efter);
    console.log(logg.length ? `Bokfört ur signalerna:\n${logg.map((x) => `  ${x}`).join("\n")}`
      : kallorAndrade ? "Källornas läge ändrat." : "Inget nytt ur signalerna; PR-listan i kartan uppdaterad.");
  } else console.log("Inget nytt ur signalerna.");

  // 2. Bokföringsvägen.
  if (!k.synk?.till) { console.log("Ingen synkpunkt än: kör --bokford för att börja från origin/main."); return; }
  const kvar = attBokfora(commitsSedan(k.synk.till));
  if (!kvar.length) { console.log(`Inga obokförda commits sedan ${k.synk.till.slice(0, 7)}.`); return; }
  console.log(`Obokförda commits sedan ${k.synk.till.slice(0, 7)} (${kvar.length}) — bokför var och en på sin del, kör sedan --bokford:`);
  for (const c of kvar) console.log(`  ${c.sha.slice(0, 7)} ${stockholm(c.tid)} ${c.forfattare}: ${c.rubrik}\n      ${c.filer.slice(0, 8).join(", ")}${c.filer.length > 8 ? ` … (+${c.filer.length - 8})` : ""}`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/kartsynk.ts");
if (direkt) await main();
