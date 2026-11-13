// RESERVEN FÖR KANDIDATENS DEL A (Bengts order 20/10, ur Källornas genomgång). Pulsklockan (pg_cron) startar del A
// (kandidat-fysik.yml) 00:13, 06:13, 12:13 och 18:13 UTC, och varje körning ger PH för de sex timmarna efter sin slott. Står
// pulsklockan still när slotten kommer startas körningen aldrig — 20/10 föll 06:13 bort under morgonavbrottet (pg_cron 03:28–07:39),
// och kandidaten teg 02:00–12:43, nästan elva timmar. Del B (kandidat-timme.yml) frågade bara om del A:s SENASTE körning lyckades,
// så en körning som aldrig startat såg ut som en trasig kedja.
//
// När del B saknar PH för timmen beslutar det här skriptet, ur del A:s körningar sedan den senaste slotten:
//   ingen körning sedan slotten            → starta del A nu (reserven)
//   körningen pågår                        → hoppa timmen (grönt; PH kommer)
//   den enda körningen sedan slotten föll  → starta ett nytt försök
//   två eller fler har fallit              → hoppa timmen (mätvakten larmar redan på del A)
//   körningen lyckades men PH saknas       → trasig kedja (rött)
// En dubbel körning är ofarlig: kandidat-fysik har en concurrency-grupp, och skrivningen till kandidat_ph är ON CONFLICT DO UPDATE.
//
// DEN NYA KANDIDATEN (DECISIONS #854, Bengt 13/11: "Ja, båda"): samma reserv för ny-kandidat-fysik.yml, vars slott är :28, med tre
// försök i stället för två. MET:s THREDDS svarade HTTP 500 ("datasetTracker_2 is not active") varje morgon 11–13/11 mellan omkring
// 06:10 och 06:50 UTC. Den frystas reserv på :43 räddade 13/11 men inte 12/11, där också försöket 06:43 föll; ett tredje försök 07:47
// hade nått fram. Den nyas del B (ny-kandidat-timme.yml, :47) frågar med --slott-min 28 --forsok 3. Den frysta är oförändrad.
//
//   gh run list --workflow kandidat-fysik.yml --limit 10 --json status,conclusion,createdAt \
//     | node --experimental-strip-types scripts/kandidat-reserv.ts [--nu 2026-10-20T07:43:00Z] [--slott-min 28] [--forsok 3]
//     skriver "<beslut>\t<skäl>", beslut = starta | hoppa | trasig
//   node --experimental-strip-types scripts/kandidat-reserv.ts --sjalvtest
import { readFileSync } from "node:fs";

export type Korning = { status: string; conclusion: string | null; createdAt: string };
export type Beslut = { beslut: "starta" | "hoppa" | "trasig"; skal: string };

export const SLOTTAR_H = [0, 6, 12, 18];
export const SLOTT_MIN = 13;
export const FORSOK = 2;   // den frystas: slottens körning och ett nytt försök (20/10)

/** Den senaste slotten (00:13, 06:13, 12:13, 18:13 UTC, eller på slottMin) som inte ligger efter `nu`. */
export function slott(nu: Date, slottMin = SLOTT_MIN): Date {
  for (let dygn = 0; dygn < 2; dygn++) {
    for (const h of [...SLOTTAR_H].reverse()) {
      const s = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate() - dygn, h, slottMin));
      if (s.getTime() <= nu.getTime()) return s;
    }
  }
  throw new Error("ingen slott");
}

const hm = (iso: string) => iso.slice(5, 16).replace("T", " ");

export function besluta(korningar: Korning[], nu: Date, slottMin = SLOTT_MIN, forsok = FORSOK): Beslut {
  const s = slott(nu, slottMin);
  const sedan = korningar.filter((k) => new Date(k.createdAt).getTime() >= s.getTime())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const st = s.toISOString();
  if (!sedan.length) return { beslut: "starta", skal: `ingen del A-körning sedan slotten ${hm(st)} UTC — pulsklockan startade den inte` };
  const senast = sedan[0];
  if (senast.status !== "completed") return { beslut: "hoppa", skal: `del A pågår (${senast.status}, startad ${hm(senast.createdAt)} UTC)` };
  if (senast.conclusion === "success") return { beslut: "trasig", skal: `del A lyckades ${hm(senast.createdAt)} UTC efter slotten ${hm(st)} UTC` };
  if (sedan.length < forsok) return { beslut: "starta", skal: `del A föll (${senast.conclusion}, ${hm(senast.createdAt)} UTC) — försök ${sedan.length + 1} av ${forsok}` };
  return { beslut: "hoppa", skal: `del A har fallit ${sedan.length} gånger sedan slotten ${hm(st)} UTC — mätvakten larmar` };
}

function sjalvtest(): void {
  const fel = (m: string) => { console.error(`✗ självtest: ${m}`); process.exit(1); };
  const k = (createdAt: string, status = "completed", conclusion: string | null = "success"): Korning => ({ status, conclusion, createdAt });
  const nu = (iso: string) => new Date(iso);
  const fall: [string, Korning[], string, Beslut["beslut"]][] = [
    ["20/10: 06:13 startades aldrig", [k("2026-10-20T00:13:03Z")], "2026-10-20T07:43:00Z", "starta"],
    ["slottens körning pågår", [k("2026-10-20T06:13:05Z", "in_progress", null), k("2026-10-20T00:13:03Z")], "2026-10-20T06:43:00Z", "hoppa"],
    ["slottens körning lyckades men PH saknas", [k("2026-10-20T06:13:05Z")], "2026-10-20T07:43:00Z", "trasig"],
    ["slottens körning föll en gång", [k("2026-10-20T06:13:05Z", "completed", "failure")], "2026-10-20T07:43:00Z", "starta"],
    ["två fall sedan slotten", [k("2026-10-20T07:44:00Z", "completed", "failure"), k("2026-10-20T06:13:05Z", "completed", "failure")], "2026-10-20T08:43:00Z", "hoppa"],
    ["reservens körning pågår", [k("2026-10-20T07:44:00Z", "queued", null), k("2026-10-20T00:13:03Z")], "2026-10-20T08:43:00Z", "hoppa"],
    ["före 06:13 gäller 00:13", [k("2026-10-20T00:13:03Z")], "2026-10-20T05:43:00Z", "trasig"],
    ["strax efter midnatt gäller gårdagens 18:13", [], "2026-10-20T00:05:00Z", "starta"],
  ];
  for (const [namn, kor, n, vant] of fall) {
    const b = besluta(kor, nu(n));
    if (b.beslut !== vant) fel(`${namn}: ${b.beslut} (${b.skal}), väntade ${vant}`);
  }
  // Den nya kandidaten (#854): slotten :28 och tre försök. 12/11: 06:28 och reserven 06:47 föll, och det tredje försöket 07:47 startar.
  const ny: [string, Korning[], string, Beslut["beslut"]][] = [
    ["ny, 13/11: 06:28 föll", [k("2026-11-13T06:28:01Z", "completed", "failure")], "2026-11-13T06:47:00Z", "starta"],
    ["ny, 12/11: två fall, tredje försöket", [k("2026-11-12T06:48:00Z", "completed", "failure"), k("2026-11-12T06:28:01Z", "completed", "failure")],
     "2026-11-12T07:47:00Z", "starta"],
    ["ny: tre fall", [k("2026-11-12T07:48:00Z", "completed", "failure"), k("2026-11-12T06:48:00Z", "completed", "failure"),
      k("2026-11-12T06:28:01Z", "completed", "failure")], "2026-11-12T08:47:00Z", "hoppa"],
    ["ny: före 06:28 gäller 00:28", [k("2026-11-13T00:28:01Z")], "2026-11-13T06:20:00Z", "trasig"],
  ];
  for (const [namn, kor, n, vant] of ny) {
    const b = besluta(kor, nu(n), 28, 3);
    if (b.beslut !== vant) fel(`${namn}: ${b.beslut} (${b.skal}), väntade ${vant}`);
  }
  if (besluta([k("2026-11-12T06:48:00Z", "completed", "failure"), k("2026-11-12T06:13:01Z", "completed", "failure")], nu("2026-11-12T07:43:00Z")).beslut !== "hoppa")
    fel("den frysta har fortfarande två försök");
  if (slott(nu("2026-11-13T06:20:00Z"), 28).toISOString() !== "2026-11-13T00:28:00.000Z") fel("den nyas slott före 06:28");
  if (slott(nu("2026-10-20T00:05:00Z")).toISOString() !== "2026-10-19T18:13:00.000Z") fel("slotten strax efter midnatt");
  if (slott(nu("2026-10-20T12:13:00Z")).toISOString() !== "2026-10-20T12:13:00.000Z") fel("slotten på minuten");
  console.log(`✓ kandidat-reserv självtest: ${fall.length + ny.length} fall — missad slott startar, pågående och dubbelfall hoppar, lyckad utan PH är trasig, ett fall försöks om; den nya: slotten :28 och tre försök`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/kandidat-reserv.ts");
if (direkt) {
  const a = process.argv.slice(2);
  if (a[0] === "--sjalvtest") sjalvtest();
  else {
    const arg = (namn: string) => { const i = a.indexOf(namn); return i >= 0 ? a[i + 1] : undefined; };
    const nu = arg("--nu") ? new Date(arg("--nu")!) : new Date();
    const slottMin = Number(arg("--slott-min") ?? SLOTT_MIN), forsok = Number(arg("--forsok") ?? FORSOK);
    if (!Number.isInteger(slottMin) || slottMin < 0 || slottMin > 59 || !Number.isInteger(forsok) || forsok < 1) {
      console.error(`ogiltiga flaggor: --slott-min ${slottMin}, --forsok ${forsok}`); process.exit(2);
    }
    const b = besluta(JSON.parse(readFileSync(0, "utf8") || "[]"), nu, slottMin, forsok);
    console.log(`${b.beslut}\t${b.skal}`);
  }
}
