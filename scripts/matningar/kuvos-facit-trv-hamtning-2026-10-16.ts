// Hämtningen av Trafikverkets utlämnande TRV 2026/111808 ur hinken, i kuvösen (DECISIONS #591). Steget före i kuvos.yml har
// hämtat filerna och jämfört sha256 med kuvos/trv-111808-leverans.json; här läses de med kuvösens egen läsare och antalen och
// tidszonen skrivs ut, så att det syns att Actions läser samma filer som manifestet. Läser inget utfall och ställer inget mot
// kuvösen; Trafikverkets rader skrivs aldrig ut (PUBLIKT REPO).
import { readFileSync } from "node:fs";
import { lasXlsx, tidszonsprov } from "../../kuvos/facit-trv.ts";

const m = JSON.parse(readFileSync("kuvos/trv-111808-leverans.json", "utf8"));
for (const f of m.filer) {
  const x = lasXlsx(readFileSync(`trv/${f.fil}`));
  const ok = x.rader.length === f.rader;
  console.log(`${f.fil}: ${x.rader.length} rader (manifestet ${f.rader}) — ${ok ? "lika" : "OLIKA"}`);
  if (!ok) process.exitCode = 1;
  if (f.fil.startsWith("RoadCondition24")) {
    const tz = tidszonsprov(x.rader.map((r) => r[x.kolumner.indexOf("ModifiedTime")]));
    console.log(`tidszonen: ${tz.lage} (timmen 02 natten till 30/3 2025: ${tz.i02} ändringar, timmarna runt: ${tz.runt})`);
  }
}
