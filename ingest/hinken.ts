// DEN PRIVATA HINKEN UR ETT FLÖDE (arkivdump: lägena kuvos_hamta och kuvos_ladda_upp), för kedjans bakåtläge (kuvos-smavag-bakat.yml,
// DECISIONS #848) och småvägsflödena, som läser och skriver många filer per jobb. Adressen och nyckeln står i FN och KEY, som flödet läser
// ur cron.job (halkvakt-arkivexport) och maskar. curl:s fel bär kommandoraden och därmed nyckeln eller den signerade adressen: de fångas,
// och bara statusen skrivs ut. Inga filnamn, tal eller innehåll i utskriften.
// Varje hämtning ur hinken räknas mot Supabase-trafiken (DECISIONS #850). En uppladdning kontrolleras därför med hinkens ETag, som för en
// vanlig uppladdning är filens MD5 (provat 12/11 på tre filer), ur ett anrop som bara ber om första byten. Ger hinken en ETag i annan form
// (en uppladdning i delar, eller en svag ETag) hämtas hela filen och jämförs, som förut.
//   node --experimental-strip-types ingest/hinken.ts finns <namn>                 kod 0 om filen finns, 3 annars
//   node --experimental-strip-types ingest/hinken.ts hamta <namn> <ut> [sha256]   kod 3 om filen saknas, 1 om kontrollsumman inte stämmer
//   node --experimental-strip-types ingest/hinken.ts ladda <fil> <namn> [--finns-ok]
//       finns filen redan med samma innehåll står den kvar, med annat innehåll är det ett fel (med --finns-ok står den kvar utan
//       jämförelse: en omräknad fil med gzip:s klockslag är aldrig byte-lik); en uppladdad fil kontrolleras mot hinkens ETag
//   node --experimental-strip-types ingest/hinken.ts --sjalvtest
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { devNull } from "node:os";
import { pathToFileURL } from "node:url";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");
const stopp = (text: string, kod = 1): never => { console.error(`hinken: ${text}`); process.exit(kod); };

/** Hinkens MD5 ur svarshuvudena: en stark ETag med 32 hexsiffror, annars null (svag, i delar eller saknas). */
export function etagMd5(huvuden: string): string | null {
  const m = /^etag:[ \t]*"([0-9a-f]{32})"[ \t]*\r?$/imu.exec(huvuden);
  return m ? m[1] : null;
}

function curl(a: string[], vad?: string): Buffer | null {
  try { return execFileSync("curl", ["-sS", "--fail", ...a], { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e: any) { return vad ? stopp(`${vad} föll (curl ${e.status})`) : null; }
}

function anrop(lage: string, namn: string, vad?: string): any {
  const { FN, KEY } = process.env;
  if (!FN || !KEY) stopp("FN eller KEY saknas");
  const b = curl(["-X", "POST", `${FN}?lage=${lage}`, "-H", `x-halkvakt-key: ${KEY}`, "-H", "Content-Type: application/json",
    "-d", JSON.stringify({ filer: [namn] })], vad);
  return b && JSON.parse(b.toString("utf8"));
}

/** Filens innehåll, eller null när den inte finns i hinken. */
function hamta(namn: string): Buffer | null {
  const h = anrop("kuvos_hamta", namn);
  return h ? curl([h.filer[0].url], "hämtningen") : null;
}

/** Är filen i hinken densamma som `lokal`? undefined när den inte finns. ETag först, hela filen bara när ETag inte är en MD5. */
function lika(namn: string, lokal: Buffer): boolean | undefined {
  const h = anrop("kuvos_hamta", namn);
  if (!h) return undefined;
  const huvuden = curl(["-r", "0-0", "-D", "-", "-o", devNull, h.filer[0].url]);
  const e = huvuden ? etagMd5(huvuden.toString("latin1")) : null;
  if (e) return e === md5(lokal);
  const f = curl([h.filer[0].url], "hämtningen");
  return !!f && sha(f) === sha(lokal);
}

function sjalvtest(): number {
  const fel: string[] = [], k = (ok: boolean, namn: string) => { if (!ok) fel.push(namn); };
  k(etagMd5('HTTP/2 206\r\ncontent-range: bytes 0-0/292153\r\nETag: "ee841beadf570c915c5be8db93927f80"\r\n\r\n') === "ee841beadf570c915c5be8db93927f80",
    "en stark ETag är MD5");
  k(etagMd5('etag: W/"8379e80fdb95a27cf31a2be3c3f25736"\r\n') === null, "en svag ETag (packad) är ingen MD5");
  k(etagMd5('etag: "8379e80fdb95a27cf31a2be3c3f25736-3"\r\n') === null, "en uppladdning i delar är ingen MD5");
  k(etagMd5("content-length: 1\r\n") === null, "utan ETag");
  k(md5(Buffer.from("x")) === "9dd4e461268c8034f5c8564e155c67a6", "MD5 av innehållet");
  console.log(`självtest hinken: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, a, b, c] = process.argv.slice(2);
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "finns" && a) process.exit(anrop("kuvos_hamta", a) ? 0 : 3);
  else if (kmd === "hamta" && a && b) {
    const f = hamta(a);
    if (!f) stopp("filen saknas", 3);
    if (c && sha(f!) !== c) stopp("kontrollsumman stämmer inte");
    writeFileSync(`${b}.tmp`, f!);
    renameSync(`${b}.tmp`, b);
  } else if (kmd === "ladda" && a && b && (c === undefined || c === "--finns-ok")) {
    const lokal = readFileSync(a);
    if (c === "--finns-ok" && anrop("kuvos_hamta", b)) process.exit(0);
    const fore = lika(b, lokal);
    if (fore === false) stopp("filen finns redan med annat innehåll");
    if (fore === undefined) {
      const u = anrop("kuvos_ladda_upp", b, "adressen för uppladdningen").urls[0];
      curl(["-X", "PUT", "-H", "Content-Type: application/octet-stream", "--data-binary", `@${a}`, u], "uppladdningen");
      if (lika(b, lokal) !== true) stopp("i hinken med annat innehåll");
    }
  } else { console.error("finns <namn> | hamta <namn> <ut> [sha256] | ladda <fil> <namn> [--finns-ok] | --sjalvtest"); process.exit(2); }
}
