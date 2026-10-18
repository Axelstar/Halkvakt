// RUTTSPÄRREN (favoriterna steg 2, kort #357; DECISIONS #616, #625). Körda vägar sparas bara på förarens begäran, bara i
// telefonen och aldrig i en säkerhetskopia, och ingen kod som når nätet får röra dem (CLAUDE.md, produktreglerna). Vakten läser
// apparnas källor (git ls-files) och fäller:
//   1. en fil som både når nätet och rör rutterna;
//   2. en fil som skriver ruttfilerna utan backupundantaget — på iPhone isExcludedFromBackup i Application Support, på Android
//      noBackupFilesDir, som varken säkerhetskopieras eller flyttas till en ny telefon;
//   3. rutterna i UserDefaults eller SharedPreferences, som följer med i säkerhetskopian;
//   4. en loggrad i en ruttfil som skriver ut punkter eller koordinater;
//   5. för få ruttfiler (golvet): byts filnamnet ut utan att vakten följer med blir den tom och grön;
//   6. på Android ett manifest som inte pekar på data_extraction_rules.xml, eller en regel som inte stänger ute
//      no_backup/favoriter vid flytten till en ny telefon (allowBackup="false" gäller inte flytten från Android 12).
// Den läser text, inte typer: en omväg genom en tredje fil ser den inte. Det är ett skyddsnät mellan granskningarna, inte en
// ersättning för dem.
// Kör: node --experimental-strip-types scripts/rutterspar.ts [--sjalvtest]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export const GOLV = { swift: 1, kotlin: 1 };
export const MANIFEST = "android/app/src/main/AndroidManifest.xml";
export const REGLER = "android/app/src/main/res/xml/data_extraction_rules.xml";
const NAT = { swift: /\bURLSession\b|\bURLRequest\b|\bNWConnection\b/, kotlin: /HttpURLConnection|openConnection\s*\(|\bOkHttp|\bURL\s*\(/ };
const RUTT = /\bFavoriter\b|\bRuttinsamlare\b|\bSparadRutt\b|\bVantandeResa\b|\bRutter\b|\bRuttLager\b|\bRuttJson\b|rutter\.json|senaste-resan/;
const SKRIVER = /"rutter\.json"|"senaste-resan\.json"/;
const UNDANTAG = {
  swift: [/isExcludedFromBackup\s*=\s*true/, /\.applicationSupportDirectory\b/],
  kotlin: [/\bnoBackupFilesDir\b/],
};
// Inom själva anropet, på en rad: brytaren får ligga i UserDefaults eller DataStore (en inställning), vägarna aldrig.
// Tre former: UserDefaults .set(…), SharedPreferences .putString(…) och DataStore p[KEY_…] = ….
const PREFS = /(UserDefaults[^\n]*\.set\(|\.put[A-Z]\w*\()[^)\n]*\b(rutter|punkter|vantande|insamlare)\b|\[\s*KEY_\w+\s*\]\s*=[^\n]*\b(rutter|punkter|vantande|insamlare)\b/;
const LOGG = /^\s*(print|NSLog|os_log|Log\.[a-z]|println)\b.*\b(punkter|coordinate|lon|lat)\b/m;

/** Källan utan kommentarer, så att ett ord i en kommentar varken fäller eller friar. */
export function utanKommentarer(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/** Regel 6: manifestet pekar på reglerna, och reglerna stänger ute mappen vid flytten (device-transfer). */
export function granskaAndroid(manifest: string, regler: string | null): string[] {
  const fel: string[] = [];
  if (!/android:dataExtractionRules\s*=\s*"@xml\/data_extraction_rules"/.test(manifest))
    fel.push(`${MANIFEST}: pekar inte på @xml/data_extraction_rules — de sparade resorna flyttas med till en ny telefon`);
  const flytt = regler?.replace(/<!--[\s\S]*?-->/g, "").match(/<device-transfer>([\s\S]*?)<\/device-transfer>/);
  if (!flytt || !/<exclude\s+domain="root"\s+path="no_backup\/favoriter\/?"\s*\/>/.test(flytt[1]))
    fel.push(`${REGLER}: device-transfer stänger inte ute no_backup/favoriter`);
  return fel;
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
    if (PREFS.test(kod)) fel.push(`${fil}: rutterna i UserDefaults, SharedPreferences eller DataStore, som följer med i säkerhetskopian`);
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
  const rattKt = `const val RUTTER_FIL = "rutter.json"\nval m = File(ctx.noBackupFilesDir, "favoriter")`;
  const f = (fil: string, text: string) => ({ fil, text });
  const tva = (swift: string, kt = rattKt, mer: { fil: string; text: string }[] = []) => granska([f("a/Favoriter.swift", swift), f("a/Favoriter.kt", kt), ...mer]).fel;
  k(tva(ratt).length === 0, "ruttfiler med undantaget passerar på båda plattformarna");
  k(tva(ratt.replace("rv.isExcludedFromBackup = true", "")).some((e) => e.includes("isExcludedFromBackup")), "utan isExcludedFromBackup fälls");
  k(tva(ratt.replace(".applicationSupportDirectory", ".documentDirectory")).some((e) => e.includes("applicationSupportDirectory")), "i Documents fälls");
  k(tva(ratt, rattKt, [f("a/Sander.swift", "URLSession.shared.data(for: r)\nlet x = Favoriter.shared.rutter")]).some((e) => e.includes("når nätet")), "en nätfil som rör rutterna fälls");
  k(tva(ratt, rattKt, [f("a/Sander.swift", "URLSession.shared.data(for: r) // Favoriter rörs inte här")]).length === 0, "ett ord i en kommentar fäller inte");
  k(tva(ratt + "\nUserDefaults.standard.set(rutter, forKey: \"k.x\")").some((e) => e.includes("UserDefaults")), "rutterna i UserDefaults fälls");
  k(tva(ratt + "\nUserDefaults.standard.set(erbjud, forKey: \"k.favErbjud\")\nprivate(set) var rutter = []").length === 0,
    "brytaren i UserDefaults passerar, också med rutterna på raden efter");
  k(tva(ratt + "\n    print(\"sparad \\(punkter)\")").some((e) => e.includes("loggrad")), "en loggrad med punkterna fälls");
  k(granska([]).fel.some((e) => e.startsWith("swift: 0 filer")) && granska([]).fel.some((e) => e.startsWith("kotlin: 0 filer")), "golvet fäller ett träd utan ruttfiler");
  k(tva(ratt, 'val f = File(context.filesDir, "rutter.json")').some((e) => e.includes("noBackupFilesDir")), "Android utanför noBackupFilesDir fälls");
  k(tva(ratt, rattKt, [f("a/Natet.kt", "val c = URL(u).openConnection() as HttpURLConnection\nval r = SparadRutt(\"a\")")]).some((e) => e.includes("når nätet")), "en Kotlin-fil som når nätet och rör rutterna fälls");
  k(tva(ratt, rattKt + "\nLog.d(\"fav\", \"punkter ${v.punkter}\")").some((e) => e.includes("loggrad")), "en Kotlin-loggrad med punkterna fälls");
  k(tva(ratt, rattKt, [f("a/Lagra.kt", "prefs.edit().putString(\"x\", rutter.toString()).apply()")]).some((e) => e.includes("SharedPreferences")), "rutterna i SharedPreferences fälls");
  k(tva(ratt, rattKt, [f("a/Prefs.kt", "ctx.dataStore.edit { it[KEY_RUTTER] = rutter.toString() }")]).some((e) => e.includes("SharedPreferences")), "rutterna i DataStore fälls");
  k(tva(ratt, rattKt, [f("a/Prefs.kt", "ctx.dataStore.edit { it[KEY_FAV_ERBJUD] = on }")]).length === 0, "brytaren i DataStore passerar");
  const man = `<application android:allowBackup="false"\n    android:dataExtractionRules="@xml/data_extraction_rules">`;
  const regel = `<data-extraction-rules>\n  <device-transfer>\n    <exclude domain="root" path="no_backup/favoriter/"/>\n  </device-transfer>\n</data-extraction-rules>`;
  k(granskaAndroid(man, regel).length === 0, "manifestet och flyttregeln passerar");
  k(granskaAndroid(man.replace(/\n.*dataExtractionRules.*/, ">"), regel).some((e) => e.includes("pekar inte")), "ett manifest utan reglerna fälls");
  k(granskaAndroid(man, null).some((e) => e.includes("device-transfer")), "en saknad regelfil fälls");
  k(granskaAndroid(man, regel.replace("device-transfer", "cloud-backup").replace("device-transfer", "cloud-backup")).some((e) => e.includes("device-transfer")),
    "bara molnkopian utesluten fälls — flytten är det som räknas");
  k(granskaAndroid(man, `<data-extraction-rules><device-transfer><!-- <exclude domain="root" path="no_backup/favoriter/"/> --></device-transfer></data-extraction-rules>`)
    .some((e) => e.includes("device-transfer")), "en bortkommenterad regel fälls");
  console.log("✓ självtest: nätet, backupundantaget på båda plattformarna, preferenserna, loggraden, kommentarer, golvet och Androids flyttregel");
  process.exit(0);
}

if (korsSjalv) {
  const filer = execFileSync("git", ["ls-files", "-z", "ios/HalkvaktApp/Sources", "android/app/src/main"], { encoding: "utf8" })
    .split("\0").filter((f) => f.endsWith(".swift") || f.endsWith(".kt")).map((fil) => ({ fil, text: readFileSync(fil, "utf8") }));
  const { fel, ruttfiler } = granska(filer);
  fel.push(...granskaAndroid(readFileSync(MANIFEST, "utf8"), existsSync(REGLER) ? readFileSync(REGLER, "utf8") : null));
  if (fel.length) { console.error(`✗ ruttspärren: ${fel.length} fel\n  ` + fel.join("\n  ")); process.exit(1); }
  console.log(`✓ ruttspärren: ${filer.length} källfiler; ruttfilerna skrivs av ${ruttfiler.join(", ")}, utanför säkerhetskopian, ingen fil som når nätet rör rutterna, och Android stänger ute mappen vid flytten`);
}
