// RUTTSPÄRREN (favoriterna steg 2, kort #357; DECISIONS #616, #625). Körda vägar sparas bara på förarens begäran, bara i
// telefonen och aldrig i en säkerhetskopia, och ingen kod som når nätet får röra dem (CLAUDE.md, produktreglerna). Vakten läser
// apparnas källor (git ls-files) och fäller:
//   1. en fil som både når nätet och rör rutterna;
//   2. en fil som skriver ruttfilerna utan backupundantaget — på iPhone isExcludedFromBackup i Application Support, på Android
//      noBackupFilesDir, som varken säkerhetskopieras eller flyttas till en ny telefon;
//   3. rutterna i UserDefaults eller SharedPreferences, som följer med i säkerhetskopian;
//   4. en loggrad i en ruttfil som skriver ut punkter eller koordinater;
//   5. för få ruttfiler (golvet): byts filnamnet ut utan att vakten följer med blir den tom och grön.
// Den läser text, inte typer: en omväg genom en tredje fil ser den inte. Det är ett skyddsnät mellan granskningarna, inte en
// ersättning för dem.
// Kör: node --experimental-strip-types scripts/rutterspar.ts [--sjalvtest]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const GOLV = { swift: 1, kotlin: 0 };   // Android-delen höjer kotlin till 1 i samma commit som sin ruttfil
const NAT = { swift: /\bURLSession\b|\bURLRequest\b|\bNWConnection\b/, kotlin: /HttpURLConnection|openConnection\s*\(|\bOkHttp|\bURL\s*\(/ };
const RUTT = /\bFavoriter\b|\bRuttinsamlare\b|\bSparadRutt\b|\bVantandeResa\b|\bRutter\b|rutter\.json|senaste-resan/;
const SKRIVER = /"rutter\.json"|"senaste-resan\.json"/;
const UNDANTAG = {
  swift: [/isExcludedFromBackup\s*=\s*true/, /\.applicationSupportDirectory\b/],
  kotlin: [/\bnoBackupFilesDir\b/],
};
// Inom själva anropet, på en rad: brytaren får ligga i UserDefaults (en inställning), vägarna aldrig.
const PREFS = /(UserDefaults[^\n]*\.set\(|\.put[A-Z]\w*\()[^)\n]*\b(rutter|punkter|vantande|insamlare)\b/;
const LOGG = /^\s*(print|NSLog|os_log|Log\.[a-z]|println)\b.*\b(punkter|coordinate|lon|lat)\b/m;

/** Källan utan kommentarer, så att ett ord i en kommentar varken fäller eller friar. */
export function utanKommentarer(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

export function granska(filer: { fil: string; text: string }[]): { fel: string[]; ruttfiler: string[] } {
  const fel: string[] = [];
  const ruttfiler: string[] = [];
  for (const { fil, text } of filer) {
    const sprak = fil.endsWith(".swift") ? "swift" : fil.endsWith(".kt") ? "kotlin" : null;
    if (!sprak) continue;
    const kod = utanKommentarer(text);
    if (NAT[sprak].test(kod) && RUTT.test(kod)) fel.push(`${fil}: når nätet och rör rutterna — rutterna lämnar aldrig telefonen (#616)`);
    if (SKRIVER.test(kod)) {
      ruttfiler.push(fil);
      for (const m of UNDANTAG[sprak]) if (!m.test(kod)) fel.push(`${fil}: skriver ruttfilerna utan ${m.source} — filen följer med i säkerhetskopian`);
      if (LOGG.test(kod)) fel.push(`${fil}: en loggrad skriver ut punkter eller koordinater`);
    }
    if (PREFS.test(kod)) fel.push(`${fil}: rutterna i UserDefaults eller SharedPreferences, som följer med i säkerhetskopian`);
  }
  for (const sprak of ["swift", "kotlin"] as const) {
    const n = ruttfiler.filter((f) => f.endsWith(sprak === "swift" ? ".swift" : ".kt")).length;
    if (n < GOLV[sprak]) fel.push(`${sprak}: ${n} filer skriver ruttfilerna, golvet är ${GOLV[sprak]} — har filnamnet bytts utan vakten?`);
  }
  return { fel, ruttfiler };
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const ratt = `let f = "rutter.json"\nvar rv = URLResourceValues(); rv.isExcludedFromBackup = true\nlet m = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)`;
  const f = (fil: string, text: string) => ({ fil, text });
  k(granska([f("a/Favoriter.swift", ratt)]).fel.length === 0, "en ruttfil med undantaget passerar");
  k(granska([f("a/Favoriter.swift", ratt.replace("rv.isExcludedFromBackup = true", ""))]).fel.some((e) => e.includes("isExcludedFromBackup")), "utan isExcludedFromBackup fälls");
  k(granska([f("a/Favoriter.swift", ratt.replace(".applicationSupportDirectory", ".documentDirectory"))]).fel.some((e) => e.includes("applicationSupportDirectory")), "i Documents fälls");
  k(granska([f("a/Favoriter.swift", ratt), f("a/Sander.swift", "URLSession.shared.data(for: r)\nlet x = Favoriter.shared.rutter")]).fel.some((e) => e.includes("når nätet")), "en nätfil som rör rutterna fälls");
  k(granska([f("a/Favoriter.swift", ratt), f("a/Sander.swift", "URLSession.shared.data(for: r) // Favoriter rörs inte här")]).fel.length === 0, "ett ord i en kommentar fäller inte");
  k(granska([f("a/Favoriter.swift", ratt + "\nUserDefaults.standard.set(rutter, forKey: \"k.x\")")]).fel.some((e) => e.includes("UserDefaults")), "rutterna i UserDefaults fälls");
  k(granska([f("a/Favoriter.swift", ratt + "\nUserDefaults.standard.set(erbjud, forKey: \"k.favErbjud\")\nprivate(set) var rutter = []")]).fel.length === 0,
    "brytaren i UserDefaults passerar, också med rutterna på raden efter");
  k(granska([f("a/Favoriter.swift", ratt + "\n    print(\"sparad \\(punkter)\")")]).fel.some((e) => e.includes("loggrad")), "en loggrad med punkterna fälls");
  k(granska([]).fel.some((e) => e.startsWith("swift: 0 filer")), "golvet fäller ett träd utan ruttfil");
  k(granska([f("a/Favoriter.swift", ratt), f("a/Lagring.kt", 'val f = File(context.filesDir, "rutter.json")')]).fel.some((e) => e.includes("noBackupFilesDir")), "Android utanför noBackupFilesDir fälls");
  k(granska([f("a/Favoriter.swift", ratt), f("a/Natet.kt", "val c = URL(u).openConnection() as HttpURLConnection\nval r = SparadRutt(\"a\")")]).fel.some((e) => e.includes("når nätet")), "en Kotlin-fil som når nätet och rör rutterna fälls");
  console.log("✓ självtest: nätet, backupundantaget på båda plattformarna, UserDefaults, loggraden, kommentarer och golvet");
  process.exit(0);
}

if (korsSjalv) {
  const filer = execFileSync("git", ["ls-files", "-z", "ios/HalkvaktApp/Sources", "android/app/src/main"], { encoding: "utf8" })
    .split("\0").filter((f) => f.endsWith(".swift") || f.endsWith(".kt")).map((fil) => ({ fil, text: readFileSync(fil, "utf8") }));
  const { fel, ruttfiler } = granska(filer);
  if (fel.length) { console.error(`✗ ruttspärren: ${fel.length} fel\n  ` + fel.join("\n  ")); process.exit(1); }
  console.log(`✓ ruttspärren: ${filer.length} källfiler; ruttfilerna skrivs av ${ruttfiler.join(", ")}, utanför säkerhetskopian, och ingen fil som når nätet rör rutterna`);
}
