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
//   gh run list --workflow kandidat-fysik.yml --limit 10 --json status,conclusion,createdAt \
//     | node --experimental-strip-types scripts/kandidat-reserv.ts [--nu 2026-10-20T07:43:00Z]
//     skriver "<beslut>\t<skäl>", beslut = starta | hoppa | trasig
//   node --experimental-strip-types scripts/kandidat-reserv.ts --sjalvtest
import { readFileSync } from "node:fs";

export type Korning = { status: string; conclusion: string | null; createdAt: string };
export type Beslut = { beslut: "starta" | "hoppa" | "trasig"; skal: string };

export const SLOTTAR_H = [0, 6, 12, 18];
export const SLOTT_MIN = 13;

/** Den senaste slotten (00:13, 06:13, 12:13, 18:13 UTC) som inte ligger efter `nu`. */
export function slott(nu: Date): Date {
  for (let dygn = 0; dygn < 2; dygn++) {
    for (const h of [...SLOTTAR_H].reverse()) {
      const s = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate() - dygn, h, SLOTT_MIN));
      if (s.getTime() <= nu.getTime()) return s;
    }
  }
  throw new Error("ingen slott");
}

const hm = (iso: string) => iso.slice(5, 16).replace("T", " ");

export function besluta(korningar: Korning[], nu: Date): Beslut {
  const s = slott(nu);
  const sedan = korningar.filter((k) => new Date(k.createdAt).getTime() >= s.getTime())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const st = s.toISOString();
  if (!sedan.length) return { beslut: "starta", skal: `ingen del A-körning sedan slotten ${hm(st)} UTC — pulsklockan startade den inte` };
  const senast = sedan[0];
  if (senast.status !== "completed") return { beslut: "hoppa", skal: `del A pågår (${senast.status}, startad ${hm(senast.createdAt)} UTC)` };
  if (senast.conclusion === "success") return { beslut: "trasig", skal: `del A lyckades ${hm(senast.createdAt)} UTC efter slotten ${hm(st)} UTC` };
  if (sedan.length < 2) return { beslut: "starta", skal: `del A föll (${senast.conclusion}, ${hm(senast.createdAt)} UTC) — ett nytt försök` };
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
  if (slott(nu("2026-10-20T00:05:00Z")).toISOString() !== "2026-10-19T18:13:00.000Z") fel("slotten strax efter midnatt");
  if (slott(nu("2026-10-20T12:13:00Z")).toISOString() !== "2026-10-20T12:13:00.000Z") fel("slotten på minuten");
  console.log(`✓ kandidat-reserv självtest: ${fall.length} fall — missad slott startar, pågående och dubbelfall hoppar, lyckad utan PH är trasig, ett fall försöks om`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/kandidat-reserv.ts");
if (direkt) {
  const a = process.argv.slice(2);
  if (a[0] === "--sjalvtest") sjalvtest();
  else {
    const i = a.indexOf("--nu");
    const nu = i >= 0 ? new Date(a[i + 1]) : new Date();
    const b = besluta(JSON.parse(readFileSync(0, "utf8") || "[]"), nu);
    console.log(`${b.beslut}\t${b.skal}`);
  }
}
