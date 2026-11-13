// RESERVEN FÖR SMÅVÄGSRÖSTENS KEDJA (DECISIONS #859, Bengt 13/11: "Ja, bygg reserven"). Pulsklockan startar kedjan (kuvos-smavag.yml)
// vid R + 51 minuter (puls-kuvos-smavag, #849), och kedjans timfil för körningen R bär blocket R+6 … R+11. Kedjan frågar MET:s katalog i
// en halvtimme och ger sedan upp utan nytt försök, och ett fel hos MET fäller den. Då saknar småvägsrösten sex timmar: 13/11 00–05 UTC,
// när körningen 18Z inte fick någon timfil. MET:s THREDDS föll dessutom varje morgon 11–13/11 mellan omkring 06:10 och 06:50, strax före
// slotten 06:51.
//
// Timflödet (kuvos-smavag-timme.yml, jobbet reserv) frågar varje timme, och skriptet beslutar för den senaste slotten:
//   timfilen finns                                  → klar
//   färre än 45 minuter efter slotten               → hoppa (slottens kedja är normalt klar efter 12–40 minuter)
//   270 minuter eller mer efter slotten              → hoppa (en kedja som startar efter R + 6 räknar nästa körning)
//   kedjan pågår eller väntar                        → hoppa
//   en annan körning i MET-kön kör eller väntar      → hoppa (kuvos-ny-kandidat-met: en ny väntande körning avbryter den som väntar)
//   kedjan har körts tre gånger sedan slotten        → hoppa (smavag-vakt larmar för dygnet)
//   annars                                          → starta (en kedja som lyckades utan timfil räknas som ett försök)
// En dubbel kedja är ofarlig: timfilen laddas upp med --finns-ok och skrivs aldrig över.
//
//   gh run list --workflow kuvos-smavag.yml --limit 10 --json status,conclusion,createdAt \
//     | node --experimental-strip-types scripts/smavag-reserv.ts --nu 2026-11-12T19:48:00Z --timfil nej --grannar 0
//     skriver "<beslut>\t<skäl>", beslut = starta | hoppa | klar
//   node --experimental-strip-types scripts/smavag-reserv.ts --stampel 2026-11-12T19:48:00Z   körningen för den senaste slotten
//   node --experimental-strip-types scripts/smavag-reserv.ts --sjalvtest
import { readFileSync } from "node:fs";
import { type Korning, minuterEfterSlott, slott } from "./kandidat-reserv.ts";

export const SLOTT_MIN = 51;   // puls-kuvos-smavag (scripts/pulsklocka.ts)
export const FORSOK = 3;       // slottens kedja och två reserver
export const FRAN_MIN = 45;
export const TILL_MIN = 270;
export type Beslut = { beslut: "starta" | "hoppa" | "klar"; skal: string };

const hm = (iso: string) => iso.slice(5, 16).replace("T", " ");

/** Körningen R för den senaste slotten, som kedjans stämpel: 20261112T18Z. */
export const stampel = (nu: Date): string => slott(nu, SLOTT_MIN).toISOString().slice(0, 13).replace(/-/g, "") + "Z";

export function besluta(korningar: Korning[], nu: Date, timfil: boolean, grannar: number, forsok = FORSOK): Beslut {
  const s = slott(nu, SLOTT_MIN), m = minuterEfterSlott(nu, SLOTT_MIN), r = stampel(nu), st = hm(s.toISOString());
  if (timfil) return { beslut: "klar", skal: `timfilen för körningen ${r} finns` };
  if (m < FRAN_MIN) return { beslut: "hoppa", skal: `slottens kedja (${st} UTC) har bara haft ${m} minuter` };
  if (m >= TILL_MIN) return { beslut: "hoppa", skal: `${m} minuter efter slotten ${st} UTC: en kedja som startar nu hinner inte räkna körningen ${r}` };
  const sedan = korningar.filter((k) => new Date(k.createdAt).getTime() >= s.getTime()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sedan.some((k) => k.status !== "completed")) return { beslut: "hoppa", skal: `kedjan pågår eller väntar (startad efter slotten ${st} UTC)` };
  if (grannar > 0) return { beslut: "hoppa", skal: `${grannar} körning(ar) i MET-kön kör eller väntar — en ny väntande hade avbrutit den som väntar` };
  if (sedan.length >= forsok) return { beslut: "hoppa", skal: `kedjan har körts ${sedan.length} gånger sedan slotten ${st} UTC utan timfil för ${r} — smavag-vakt larmar` };
  const varfor = sedan.length ? `kedjan ${sedan[0].conclusion} ${hm(sedan[0].createdAt)} UTC utan timfil för ${r}` : `pulsklockan startade inte kedjan för ${r}`;
  return { beslut: "starta", skal: `${varfor} — försök ${sedan.length + 1} av ${forsok}` };
}

function sjalvtest(): void {
  const fel = (m: string) => { console.error(`✗ självtest: ${m}`); process.exit(1); };
  const k = (createdAt: string, status = "completed", conclusion: string | null = "success"): Korning => ({ status, conclusion, createdAt });
  const nu = (iso: string) => new Date(iso);
  const fall: [string, Korning[], string, boolean, number, Beslut["beslut"]][] = [
    ["12/11 18Z: kedjan 18:59 lyckades utan timfil", [k("2026-11-12T18:59:38Z"), k("2026-11-12T13:29:17Z")], "2026-11-12T19:48:00Z", false, 0, "starta"],
    ["pulsklockan startade inte kedjan", [k("2026-11-12T18:51:01Z")], "2026-11-13T01:48:00Z", false, 0, "starta"],
    ["MET föll 06:51", [k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T07:48:00Z", false, 0, "starta"],
    ["timfilen finns", [k("2026-11-13T06:51:01Z")], "2026-11-13T07:48:00Z", true, 0, "klar"],
    ["kedjan pågår", [k("2026-11-13T07:48:30Z", "in_progress", null), k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T08:48:00Z", false, 0, "hoppa"],
    ["kedjan väntar i kön", [k("2026-11-13T06:51:01Z", "pending", null)], "2026-11-13T07:48:00Z", false, 0, "hoppa"],
    ["kuvos-stad i MET-kön", [k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T07:48:00Z", false, 1, "hoppa"],
    ["tre försök", [k("2026-11-13T09:48:30Z", "completed", "failure"), k("2026-11-13T08:48:30Z", "completed", "failure"),
      k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T10:48:00Z", false, 0, "hoppa"],
    ["två försök, det tredje startar", [k("2026-11-13T07:48:30Z", "completed", "failure"), k("2026-11-13T06:51:01Z", "completed", "failure")],
      "2026-11-13T09:48:00Z", false, 0, "starta"],
    ["för tidigt: 06:55", [], "2026-11-13T06:55:00Z", false, 0, "hoppa"],
    ["före slotten gäller förra, för sent: 06:48", [], "2026-11-13T06:48:00Z", false, 0, "hoppa"],
    ["sista timmen i fönstret: 10:48", [k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T10:48:00Z", false, 0, "starta"],
    ["för sent: 11:30", [k("2026-11-13T06:51:01Z", "completed", "failure")], "2026-11-13T11:30:00Z", false, 0, "hoppa"],
    ["körningar före slotten räknas inte", [k("2026-11-13T00:51:01Z", "completed", "failure"), k("2026-11-12T18:59:38Z", "completed", "failure"),
      k("2026-11-12T18:51:01Z", "completed", "failure")], "2026-11-13T01:48:00Z", false, 0, "starta"],
  ];
  for (const [namn, kor, n, t, g, vant] of fall) {
    const b = besluta(kor, nu(n), t, g);
    if (b.beslut !== vant) fel(`${namn}: ${b.beslut} (${b.skal}), väntade ${vant}`);
  }
  // Stämpeln är kedjans: körningen R för slotten R + 51, och före slotten den förra körningen.
  const st: [string, string][] = [["2026-11-12T19:48:00Z", "20261112T18Z"], ["2026-11-13T06:51:00Z", "20261113T06Z"],
    ["2026-11-13T06:50:59Z", "20261113T00Z"], ["2026-11-13T00:10:00Z", "20261112T18Z"]];
  for (const [t, v] of st) if (stampel(nu(t)) !== v) fel(`stämpeln ${t}: ${stampel(nu(t))}, väntade ${v}`);
  // Där reserven kan starta är slottens körning densamma som kedjans (R = senaste 00/06/12/18 vid start, kuvos-smavag.yml).
  for (let m = FRAN_MIN; m < TILL_MIN; m++) {
    const t = new Date(Date.UTC(2026, 10, 13, 6, 51 + m));
    const r = new Date(Math.floor(t.getTime() / 21_600_000) * 21_600_000).toISOString().slice(0, 13).replace(/-/g, "") + "Z";
    if (stampel(t) !== r) fel(`${t.toISOString()}: slottens körning ${stampel(t)} är inte kedjans ${r}`);
  }
  console.log(`✓ smavag-reserv självtest: ${fall.length} fall och ${st.length} stämplar — saknad timfil startar kedjan igen 45–269 minuter efter slotten, högst tre försök, aldrig när MET-kön har en körning`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/smavag-reserv.ts");
if (direkt) {
  const a = process.argv.slice(2);
  const arg = (namn: string) => { const i = a.indexOf(namn); return i >= 0 ? a[i + 1] : undefined; };
  if (a[0] === "--sjalvtest") sjalvtest();
  else if (arg("--stampel")) {
    const t = new Date(arg("--stampel")!);
    if (Number.isNaN(t.getTime())) { console.error("ogiltig tid"); process.exit(2); }
    console.log(stampel(t));
  } else {
    const nu = arg("--nu") ? new Date(arg("--nu")!) : new Date(), timfil = arg("--timfil"), grannar = Number(arg("--grannar"));
    if (Number.isNaN(nu.getTime()) || (timfil !== "ja" && timfil !== "nej") || !Number.isInteger(grannar) || grannar < 0) {
      console.error(`ogiltiga flaggor: --nu ${arg("--nu")}, --timfil ${timfil}, --grannar ${arg("--grannar")}`); process.exit(2);
    }
    const b = besluta(JSON.parse(readFileSync(0, "utf8") || "[]"), nu, timfil === "ja", grannar);
    console.log(`${b.beslut}\t${b.skal}`);
  }
}
