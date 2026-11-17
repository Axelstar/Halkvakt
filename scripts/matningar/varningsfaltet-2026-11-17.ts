// Varningsfältet i Trafikverkets väglag (Bengt 17/11 2026: "läs varningsfältet"). LÄS-ONLY: ingenting sparas.
//
// VARFÖR. Rutan och rösten kallar en sträcka hal när klassen är Besvärligt eller högre, eller när orden bär is, snö eller halka
// (arHalt i publish/lanssidor.ts, samma regel som motorn). En tidning jämförde rutan med Trafikverkets karta 16/11 och fann ingen
// varning på sträckor som rutan kallade hala. Trafikverkets väglagsobjekt bär fälten Warning (varning), Cause (orsak) och Measure
// (åtgärd; Measurement före schema 1.3), enligt deras datamodell läst 17/11. Ingesten har aldrig hämtat dem
// (ingest/sources/roadcondition.ts). Frågan är vad de innehåller.
//
// FÖRREGISTRERAT, skrivet före körningen. Ingen tröskel och ingen dom: fälten räknas som de FINNS, inte som vi tror.
//   (1) Vilka fält objekten bär, och hur många objekt som bär vart och ett.
//   (2) Varje värde i Warning, Cause, Measure eller Measurement, SafetyRelatedMessage, IconId och Creator, med antal.
//   (3) Klassen (ConditionText) mot om Warning är tomt, och appens regel för halt (arHalt) mot om Warning är tomt.
//   (4) Samma per län.
//   (5) En rad per sträcka som är hal enligt appens regel eller bär en varning: id, län, kod, klass, ord, varning, orsak, åtgärd
//       och starttid, så att läsningen kan ställas mot hur länge sträckan varit hal (väglagshistoriken, läst för sig).
// Hur svaret läses: bär Warning halka på en DELMÄNGD av de hala sträckorna är fältet en kandidat för ordet halka i rutan och
// rösten. Är det tomt, eller säger det samma sak som klassen, ger det inget nytt. Ingen regel ändras av körningen.
//
// Kör: vagarbeten-matning.yml (workflow_dispatch) med skript = den här filen. TRAFIKVERKET_API_KEY krävs.
// Prov utan nyckel: node --experimental-strip-types scripts/matningar/varningsfaltet-2026-11-17.ts --prov <json-fil med en lista objekt>
import { readFileSync } from "node:fs";
import https from "node:https";
import tls from "node:tls";
import { arHalt, LAN } from "../../publish/lanssidor.ts";

const KEY = process.env.TRAFIKVERKET_API_KEY ?? "";
// Telias rot: Trafikverkets API kedjar sedan 11/11 till en rot som Nodes lista saknar (ingest.yml sätter NODE_EXTRA_CA_CERTS).
// Mätknappen gör det inte, så roten läggs till här, till Nodes egna, bara för det här anropet.
const CA = [...tls.rootCertificates, readFileSync("ingest/ca/telia-rsa-tls-root-ca-v3.pem", "utf8")];
const LIMIT = 5000;
/** Nyckeln får aldrig hamna i en utskrift, inte ens ur ett felsvar. */
const utanNyckel = (s: string) => (KEY ? s.split(KEY).join("[nyckel]") : s);

const tally = (m: Map<string, number>, k: unknown) => { const s = k === undefined || k === null || k === "" ? "(tomt)" : String(k); m.set(s, (m.get(s) ?? 0) + 1); };
const skriv = (rubrik: string, m: Map<string, number>, topp = 40) => {
  console.log(`mätt: ${rubrik}`);
  for (const [k, n] of [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, topp)) console.log(`mätt:   ${n.toString().padStart(5)}  ${k.slice(0, 110)}`);
};
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v === undefined || v === null || v === "" ? [] : [String(v)]);

function fraga(version: string, namespace: string | null): Promise<{ status: number; body: string }> {
  const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="RoadCondition" schemaversion="${version}"` +
    `${namespace ? ` namespace="${namespace}"` : ""} limit="${LIMIT}"></QUERY></REQUEST>`;
  return new Promise((ok, fel) => {
    const r = https.request("https://api.trafikinfo.trafikverket.se/v2/data.json",
      { method: "POST", headers: { "Content-Type": "text/xml", "Content-Length": Buffer.byteLength(q) }, ca: CA }, (res) => {
        const bitar: Buffer[] = [];
        res.on("data", (b) => bitar.push(b));
        res.on("end", () => ok({ status: res.statusCode ?? 0, body: Buffer.concat(bitar).toString("utf8") }));
      });
    r.on("error", fel);
    r.end(q);
  });
}

async function hamta(): Promise<any[] | null> {
  // Schema 1.3 är datamodellens nuvarande; 1.2 utan namnrymd är det ingesten läser. Det första som svarar används, och det sägs.
  for (const [version, ns] of [["1.3", "road.trafficinfo"], ["1.3", null], ["1.2", null]] as [string, string | null][]) {
    const r = await fraga(version, ns);
    let obj: any[] | undefined, felet = "";
    try { const res = JSON.parse(r.body)?.RESPONSE?.RESULT?.[0]; obj = res?.RoadCondition; felet = res?.ERROR ? JSON.stringify(res.ERROR) : ""; } catch { felet = r.body.slice(0, 300); }
    if (r.status === 200 && Array.isArray(obj)) { console.log(`mätt: schema ${version}${ns ? `, namnrymd ${ns}` : ", utan namnrymd"}: ${obj.length} objekt`); return obj; }
    console.log(`mätt: schema ${version}${ns ? `, namnrymd ${ns}` : ", utan namnrymd"} svarade ${r.status}: ${utanNyckel(felet).slice(0, 300)}`);
  }
  return null;
}

async function main(): Promise<number> {
  const prov = process.argv.indexOf("--prov");
  let alla: any[] | null;
  if (prov >= 0) alla = JSON.parse(readFileSync(process.argv[prov + 1], "utf8"));
  else {
    if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
    alla = await hamta();
  }
  if (!alla) { console.error("inget svar med väglagsobjekt"); return 1; }
  const obj = alla.filter((o) => !o.Deleted);
  console.log(`mätt: ${obj.length} väglagsobjekt som inte är raderade${alla.length >= LIMIT ? ` — TAKET ${LIMIT} NÅTT, talen är för låga` : ""} (${new Date().toISOString()})`);

  // (1) Fälten som finns.
  const falt = new Map<string, number>();
  for (const o of obj) for (const k of Object.keys(o)) tally(falt, k);
  skriv("(1) fält som finns (antal objekt som bär fältet)", falt, 60);

  // (2) Värdena.
  const atgard = (o: any) => lista(o.Measure ?? o.Measurement);
  const varning = new Map<string, number>(), orsak = new Map<string, number>(), atg = new Map<string, number>(),
    sak = new Map<string, number>(), ikon = new Map<string, number>(), kalla = new Map<string, number>(), antal = new Map<string, number>();
  for (const o of obj) {
    const w = lista(o.Warning), c = lista(o.Cause), a = atgard(o);
    if (!w.length) tally(varning, "(tomt)"); for (const x of w) tally(varning, x);
    if (!c.length) tally(orsak, "(tomt)"); for (const x of c) tally(orsak, x);
    if (!a.length) tally(atg, "(tomt)"); for (const x of a) tally(atg, x);
    tally(antal, `${w.length} varningar i objektet`);
    tally(sak, o.SafetyRelatedMessage); tally(ikon, `${o.IconId ?? "(tomt)"} · ${o.ConditionText ?? "(tomt)"}`); tally(kalla, o.Creator);
  }
  skriv("(2) Warning, varje värde (ett objekt kan bära flera)", varning);
  skriv("(2) antal varningar per objekt", antal);
  skriv("(2) Cause, varje värde", orsak);
  skriv("(2) Measure eller Measurement, varje värde", atg);
  skriv("(2) SafetyRelatedMessage", sak);
  skriv("(2) IconId · ConditionText", ikon);
  skriv("(2) Creator", kalla);

  // (3) Klassen och appens regel mot varningen.
  const hal = (o: any) => arHalt(o.ConditionCode ?? null, lista(o.ConditionInfo));
  const klass = new Map<string, number>(), regel = new Map<string, number>(), kombi = new Map<string, number>();
  for (const o of obj) {
    const w = lista(o.Warning);
    tally(klass, `${o.ConditionCode ?? "?"} ${o.ConditionText ?? "(tomt)"} · ${w.length ? "med varning" : "utan varning"}`);
    tally(regel, `${hal(o) ? "hal enligt appens regel" : "inte hal enligt appens regel"} · ${w.length ? "med varning" : "utan varning"}`);
    if (hal(o) || w.length) tally(kombi, `${o.ConditionText ?? "(tomt)"} · ord: ${lista(o.ConditionInfo).join(", ") || "(tomt)"} · varning: ${w.join(", ") || "(tomt)"}`);
  }
  skriv("(3) klassen mot varningen", klass);
  skriv("(3) appens regel för halt mot varningen", regel);
  skriv("(3) klass, ord och varning tillsammans (hala eller varnade sträckor)", kombi, 60);

  // (4) Per län: sträckor, hala enligt appens regel, med varning, och varningens värden.
  const namn = new Map(LAN.map((l) => [l.kod, l.kort]));
  const perLan = new Map<number, { n: number; hala: number; varnade: number; ord: Map<string, number> }>();
  for (const o of obj) for (const k of (Array.isArray(o.CountyNo) ? o.CountyNo : []) as number[]) {
    const p = perLan.get(k) ?? { n: 0, hala: 0, varnade: 0, ord: new Map<string, number>() };
    p.n++; if (hal(o)) p.hala++;
    const w = lista(o.Warning); if (w.length) p.varnade++; for (const x of w) tally(p.ord, x);
    perLan.set(k, p);
  }
  console.log("mätt: (4) per län: sträckor · hala enligt appens regel · med varning · varningens värden");
  for (const [k, p] of [...perLan].sort((a, b) => a[0] - b[0])) {
    console.log(`mätt:   ${String(k).padStart(2)} ${(namn.get(k) ?? "?").padEnd(16)} ${String(p.n).padStart(4)} · ${String(p.hala).padStart(3)} · ${String(p.varnade).padStart(3)} · ${[...p.ord].sort((a, b) => b[1] - a[1]).map(([o, n]) => `${o} ${n}`).join(", ")}`);
  }

  // (5) En rad per sträcka som är hal enligt appens regel eller bär en varning.
  console.log("mätt: (5) rad: id;län;kod;klass;ord;varning;orsak;åtgärd;start");
  const ren = (s: string) => s.replace(/[;\n\r]/g, ",");
  for (const o of [...obj].sort((a, b) => String(a.Id) < String(b.Id) ? -1 : 1)) {
    if (!hal(o) && !lista(o.Warning).length) continue;
    console.log(`rad: ${[o.Id, (Array.isArray(o.CountyNo) ? o.CountyNo : []).join("+"), o.ConditionCode ?? "", o.ConditionText ?? "", lista(o.ConditionInfo).join(", "),
      lista(o.Warning).join(", "), lista(o.Cause).join(", "), atgard(o).join(", "), String(o.StartTime ?? "").slice(0, 16)].map((x) => ren(String(x))).join(";")}`);
  }
  return 0;
}
main().then((c) => process.exit(c), (e) => { console.error(utanNyckel(String(e?.stack ?? e))); process.exit(1); });
