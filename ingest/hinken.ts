// DEN PRIVATA HINKEN UR ETT FLÖDE (arkivdump: lägena kuvos_hamta och kuvos_ladda_upp), för kedjans bakåtläge (kuvos-smavag-bakat.yml,
// DECISIONS #848), som läser och skriver många filer per jobb. Adressen och nyckeln står i FN och KEY, som flödet läser ur cron.job
// (halkvakt-arkivexport) och maskar. curl:s fel bär kommandoraden och därmed nyckeln eller den signerade adressen: de fångas, och bara
// statusen skrivs ut. Inga filnamn, tal eller innehåll i utskriften.
//   node --experimental-strip-types ingest/hinken.ts finns <namn>                 kod 0 om filen finns, 3 annars
//   node --experimental-strip-types ingest/hinken.ts hamta <namn> <ut> [sha256]   kod 3 om filen saknas, 1 om kontrollsumman inte stämmer
//   node --experimental-strip-types ingest/hinken.ts ladda <fil> <namn>           finns filen redan med samma innehåll står den kvar, med
//                                                                                 annat innehåll är det ett fel; en uppladdad fil hämtas
//                                                                                 tillbaka och jämförs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const stopp = (text: string, kod = 1): never => { console.error(`hinken: ${text}`); process.exit(kod); };

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

const [kmd, a, b, c] = process.argv.slice(2);
if (kmd === "finns" && a) process.exit(anrop("kuvos_hamta", a) ? 0 : 3);
else if (kmd === "hamta" && a && b) {
  const f = hamta(a);
  if (!f) stopp("filen saknas", 3);
  if (c && sha(f!) !== c) stopp("kontrollsumman stämmer inte");
  writeFileSync(`${b}.tmp`, f!);
  renameSync(`${b}.tmp`, b);
} else if (kmd === "ladda" && a && b) {
  const lokal = readFileSync(a), finns = hamta(b);
  if (finns) { if (sha(finns) !== sha(lokal)) stopp("filen finns redan med annat innehåll"); }
  else {
    const u = anrop("kuvos_ladda_upp", b, "adressen för uppladdningen").urls[0];
    curl(["-X", "PUT", "-H", "Content-Type: application/octet-stream", "--data-binary", `@${a}`, u], "uppladdningen");
    const t = hamta(b);
    if (!t || sha(t) !== sha(lokal)) stopp("i hinken med annat innehåll");
  }
} else { console.error("finns <namn> | hamta <namn> <ut> [sha256] | ladda <fil> <namn>"); process.exit(2); }
