// Vinterbältet (kort #52, Bengts order 5/9): hur stor är cry-wolf-ytan?
//
// FRÅGAN: motorn larmar i dag på ett segment klassat Normalt (code 1) om ConditionInfo
// matchar (is|snö|halka|frost) — test/engine.test.ts låser fast att "Packad snö" MÅSTE
// larma. I norr är packad snöväg NORMALT vinterväglag, så samma regel som är rätt i Skåne
// kan göra appen till en tjutande radiopratare i Norrbotten från november till april.
//
// VAD DEN HÄR MÄTER: EXPONERINGEN. Hur stor del av varningsytan — mätt i både segment och
// KILOMETER, för en förare upplever sträcka och inte antal — ligger i län där packad snö
// är normalt en stor del av vintern?
//
// VAD DEN INTE MÄTER, och det ska stå i rapporten: INCIDENSEN. Vi har ingen vinter i
// arkivet (det börjar 24/8), så hur många segment som FAKTISKT bär "Packad snö" i januari
// är okänt. Den här siffran är ett tak för hur illa det kan bli, inte en prognos.
//
// Två grupper redovisas med flit, inte en. scripts/ankaranalys.ts definierar Norrland som
// län 21–25 och räknar därmed Dalarna som söder — rimligt för ankartäthet, tveksamt för
// snöväglag. Därför visas även ett bredare "vinterbälte" (17 Värmland, 20 Dalarna + 21–25).
// Att välja gräns är ett produktbeslut; mätningen ger båda och väljer inte åt någon.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/vinterbaltet.ts
// Självtest utan DB: scripts/vinterbaltet.ts --sjalvtest

const LAN: Record<number, string> = { 1:"Stockholm",3:"Uppsala",4:"Södermanland",5:"Östergötland",
  6:"Jönköping",7:"Kronoberg",8:"Kalmar",9:"Gotland",10:"Blekinge",12:"Skåne",13:"Halland",
  14:"Västra Götaland",17:"Värmland",18:"Örebro",19:"Västmanland",20:"Dalarna",21:"Gävleborg",
  22:"Västernorrland",23:"Jämtland",24:"Västerbotten",25:"Norrbotten" };

const NORRLAND = new Set([21, 22, 23, 24, 25]);          // samma som scripts/ankaranalys.ts:13
const VINTERBALTE = new Set([17, 20, 21, 22, 23, 24, 25]); // + Värmland och Dalarna

type Rad = { lan: number | null; km: number; flerLan: boolean };

function rakna(rows: Rad[]) {
  const per = new Map<number, { n: number; km: number }>();
  let utanLan = 0, utanLanKm = 0, flerLan = 0;
  for (const r of rows) {
    if (r.lan === null) { utanLan++; utanLanKm += r.km; continue; }
    const p = per.get(r.lan) ?? { n: 0, km: 0 };
    p.n++; p.km += r.km; per.set(r.lan, p);
    if (r.flerLan) flerLan++;
  }
  const summa = (s: Set<number>) => {
    let n = 0, km = 0;
    for (const [l, p] of per) if (s.has(l)) { n += p.n; km += p.km; }
    return { n, km };
  };
  const totN = rows.length, totKm = rows.reduce((a, r) => a + r.km, 0);
  return { per, totN, totKm, utanLan, utanLanKm, flerLan,
           norrland: summa(NORRLAND), vinterbalte: summa(VINTERBALTE) };
}

const p1 = (x: number) => x.toFixed(1);
function rapport(t: ReturnType<typeof rakna>) {
  console.log(`Vägnätet i arkivet: ${t.totN} segment, ${p1(t.totKm)} km`);
  if (t.utanLan) console.log(`  varav ${t.utanLan} utan länskod (${p1(t.utanLanKm)} km) — räknas i totalen men i ingen grupp`);
  if (t.flerLan) console.log(`  ${t.flerLan} segment spänner över flera län (räknas på det FÖRSTA, som kartan gör)`);
  console.log(`\nPER LÄN, nordligast först:`);
  for (const l of [...t.per.keys()].sort((a, b) => b - a)) {
    const p = t.per.get(l)!;
    const mark = NORRLAND.has(l) ? "❄❄" : VINTERBALTE.has(l) ? "❄ " : "  ";
    console.log(`  ${mark} ${String(l).padStart(2)} ${(LAN[l] ?? "okänt").padEnd(16)} ${String(p.n).padStart(4)} segment  ${p1(p.km).padStart(8)} km`);
  }
  const andel = (v: { n: number; km: number }) =>
    `${v.n} segment (${p1(100 * v.n / t.totN)} %) · ${p1(v.km)} km (${p1(100 * v.km / t.totKm)} % av sträckan)`;
  console.log(`\nEXPONERING — hur stor del av varningsytan ligger i snöland?`);
  console.log(`  Norrland (21–25):        ${andel(t.norrland)}`);
  console.log(`  Vinterbältet (17,20–25): ${andel(t.vinterbalte)}`);
}

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  const rows: Rad[] = [
    { lan: 25, km: 100, flerLan: false }, { lan: 24, km: 100, flerLan: true },  // Norrland: 2 st, 200 km
    { lan: 20, km: 50, flerLan: false },                                        // + Dalarna ⇒ bälte 3 st, 250 km
    { lan: 12, km: 50, flerLan: false },                                        // Skåne
    { lan: null, km: 100, flerLan: false },                                     // utan län
  ];
  const t = rakna(rows);
  console.log("SJÄLVTEST — 5 segment, 400 km; väntat Norrland 2/200, bälte 3/250, 1 utan län, 1 flerlän");
  rapport(t);
  let ok = true;
  const k = (n: string, f: number, v: number) => { if (Math.abs(f - v) > 0.001) { console.error(`SJÄLVTEST: ${n} ${f}, väntat ${v}`); ok = false; } };
  k("totN", t.totN, 5); k("totKm", t.totKm, 400);
  k("norrland.n", t.norrland.n, 2); k("norrland.km", t.norrland.km, 200);
  k("vinterbalte.n", t.vinterbalte.n, 3); k("vinterbalte.km", t.vinterbalte.km, 250);
  k("utanLan", t.utanLan, 1); k("flerLan", t.flerLan, 1);
  // Andelen ska räknas mot HELA nätet, inte mot de län som har kod — annars blåses den upp.
  k("norrland km-andel", 100 * t.norrland.km / t.totKm, 50);
  if (!ok) process.exit(1);
  console.log("SJÄLVTEST OK: grupperna, längderna och andelarna återfinner den kända sanningen.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const r = await pool.query(`
  SELECT CASE WHEN array_length(county_nos, 1) IS NULL THEN NULL ELSE county_nos[1] END AS lan,
         COALESCE(ST_Length(geom::geography), 0) / 1000.0 AS km,
         COALESCE(array_length(county_nos, 1), 0) > 1 AS fler_lan
  FROM road_conditions WHERE NOT deleted`);
await pool.end();

console.log(`Vinterbältet (kort #52) — hur stor är cry-wolf-ytan?\n`);
if (r.rows.length < 400) {
  console.error(`UNDERLAGSVAKT: bara ${r.rows.length} segment (<400) — hämtningen är trasig. Grön-men-tom räknas inte.`);
  process.exit(1);
}
rapport(rakna(r.rows.map((x: any) => ({ lan: x.lan === null ? null : Number(x.lan), km: Number(x.km), flerLan: x.fler_lan }))));

console.log(`\nLÄSNING — och mätningens gräns, som inte får glömmas:`);
console.log(`  Det här är EXPONERING, inte incidens. Arkivet börjar 24/8, så vi har ingen vinter`);
console.log(`  att räkna på: hur många segment som FAKTISKT bär "Packad snö" i januari vet vi inte.`);
console.log(`  Siffran är alltså ett TAK för hur stor cry-wolf-ytan kan bli — inte en prognos.`);
console.log(`  Två gränser redovisas för att valet är ett produktbeslut, inte ett mätresultat.`);
