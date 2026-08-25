// Marknadsmotorn — körs varje morgon av marknadsforing.yml.
// Läser Halkvakts egen publicerade livedata och skriver:
//   utkast/halklaget-DATUM.md  — färdiga kanaltexter (FB, Flashback, Reddit, press)
//   larm.json                  — SNÖLARM: län där säsongens första halka just slagit till
//   rapport.json               — måndagar: veckorapport
//   state.json                 — minne mellan körningar (per-län-status + historik)
// Noll beroenden. Node 20+. Tonen = sajtens ("Kl 06:50. Minus två.").
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.HV_BASE ?? "https://axelstar.github.io/halkvakt-karta";
const LAN = { 1:"Stockholms län",3:"Uppsala län",4:"Södermanlands län",5:"Östergötlands län",
  6:"Jönköpings län",7:"Kronobergs län",8:"Kalmar län",9:"Gotlands län",10:"Blekinge län",
  12:"Skåne",13:"Hallands län",14:"Västra Götaland",17:"Värmlands län",18:"Örebro län",
  19:"Västmanlands län",20:"Dalarna",21:"Gävleborgs län",22:"Västernorrlands län",
  23:"Jämtlands län",24:"Västerbottens län",25:"Norrbottens län" };

const j = async p => (await fetch(`${BASE}/data/${p}`)).json();
const [meta, vaglag, vader] = await Promise.all([j("meta.json"), j("vaglag.geojson"), j("vader.geojson")]);

const now = Date.now(), H = 36e5;
const fresh = (t, h) => t && (now - Date.parse(t)) < h * H;

// Läget per län (län saknas i äldre filer → hamnar under 0 = "Sverige")
const st = {};
const lan = n => (st[n] ??= { halka: 0, frys: 0, sno: 0, vagar: new Set() });
for (const f of vaglag.features) {
  const p = f.properties;
  if (p.code !== 1 && fresh(p.updated, 24)) { const s = lan(p.lan ?? 0); s.halka++; if (p.road) s.vagar.add(p.road); }
}
for (const f of vader.features) {
  const p = f.properties;
  if (!fresh(p.t, 3)) continue;
  const s = lan(p.lan ?? 0);
  if (p.yta !== null && p.yta <= 0.5) s.frys++;
  if (p.sno) s.sno++;
}
const tot = k => Object.values(st).reduce((a, s) => a + s[k], 0);
const halkaTot = tot("halka"), frysTot = tot("frys");
const vinter = halkaTot > 0 || frysTot > 0;

// Minne + säsong (nollställs 1 sep)
const statePath = join(HERE, "state.json");
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8"))
  : { season: "", lan: {}, history: [] };
const d = new Date(), iso = d.toISOString().slice(0, 10);
const season = d.getUTCMonth() >= 8 ? `${d.getUTCFullYear()}/${d.getUTCFullYear()+1}` : `${d.getUTCFullYear()-1}/${d.getUTCFullYear()}`;
if (state.season !== season) { state.season = season; state.lan = {}; }

// SNÖLARM: första halkan i länet denna säsong
const larm = [];
for (const [nr, s] of Object.entries(st)) {
  const namn = LAN[nr];
  if (!namn || s.halka === 0 || state.lan[nr]) continue;
  state.lan[nr] = iso;
  larm.push({ lan: Number(nr), namn, halka: s.halka, frys: s.frys,
    vagar: [...s.vagar].slice(0, 3),
    text: [
      `# 🚨 SNÖLARM · ${namn} — säsongens första halka. POSTA NU.`, ``,
      `Trafikverket rapporterar just nu **${s.halka} vägsträcko${s.halka===1?"a":"r"} med halt väglag** i ${namn}` +
      (s.vagar.size ? ` (bl.a. ${[...s.vagar].slice(0,3).join(", ")})` : "") +
      (s.frys ? `, och ${s.frys} mätstationer visar vägbana under noll` : "") + `.`, ``,
      `## FB-sidan (posta + boosta 200–500 kr, geo: ${namn}, 25–65 år, intresse bil/pendling)`,
      `❄️ Nu är den här — första halkan i ${namn}.`,
      `Trafikverkets mätstationer larmar om halt väglag${s.vagar.size ? ` på bl.a. ${[...s.vagar][0]}` : ""}.`,
      `Halkvakt säger till med rösten INNAN du är där — gratis, startar sig själv när du kör.`,
      `👉 halkvakt: ${BASE}/`, ``,
      `## Flashback/Reddit (svar i väder-/vintertrådar, rak ton)`,
      `Första halkan i ${namn} enligt Trafikverkets stationsdata (${s.halka} sträckor just nu). ` +
      `Byggde en gratisapp som läser samma data och röstvarnar när något ligger på ens väg — länk i profilen om någon vill testa betan.`, ``,
      `## Checklista (15 min)`,
      `- [ ] Posta FB-texten på Halkvakt-sidan`,
      `- [ ] Boosta med geo ${namn}`,
      `- [ ] Kolla väntelistan i morgon (veckorapporten räknar åt dig)`,
    ].join("\n") });
}

// Historik (drivmedel för veckorapporten)
state.history = state.history.filter(h => h.date !== iso);
state.history.push({ date: iso, waitlist: meta.waitlist_count ?? 0, halka: halkaTot, frys: frysTot });
if (state.history.length > 400) state.history = state.history.slice(-400);

// Dagens utkast — färdiga kanaltexter
const topp = Object.entries(st).filter(([n]) => LAN[n]).sort((a, b) => b[1].halka - a[1].halka).slice(0, 3)
  .filter(([, s]) => s.halka > 0).map(([n, s]) => `${LAN[n]} (${s.halka})`).join(", ");
const rad = vinter
  ? `Just nu: ${halkaTot} sträckor med halt väglag${topp ? ` — mest i ${topp}` : ""}${frysTot ? `, ${frysTot} stationer under noll` : ""}.`
  : `Sommarläge: 0 halksträckor. ${meta.stationer} mätstationer i beredskap, ${meta.vilt_vecka ?? 0} viltolyckor senaste veckan${meta.vilt_vanligast ? ` (vanligast: ${meta.vilt_vanligast})` : ""}.`;

const utkast = `# Halkläget ${iso}
> ${rad}
> Väntelista: ${meta.waitlist_count ?? 0}. Data: ${BASE}/karta.html

## FB-sidan (dagsläge — posta vid behov, alltid vid larm)
${vinter
? `❄️ Läget på vägarna just nu: ${halkaTot} sträckor med halt väglag${topp ? `. Värst: ${topp}` : ""}.
Halkvakt läser Trafikverkets livedata och varnar med rösten innan du är framme. Gratis. ${BASE}/`
: `Vägen ser torr ut i hela landet just nu — men ${meta.stationer} mätstationer står redo för första frysnatten.
När den kommer säger Halkvakt till innan du är där. Ställ dig i betakön: ${BASE}/`}

## Flashback (uppdatering i egen tråd — bara vid nyhetsvärde)
${vinter
? `Lägesuppdatering från stationsdatan: ${halkaTot} halksträckor${topp ? `, tyngst i ${topp}` : ""}. Appen plockar upp dem inom 30 min från Trafikverkets API.`
: `(sommarläge — posta inte för sakens skull; nästa naturliga inlägg är säsongens första frysnatt, larmet säger till)`}

## Reddit r/sweden / r/Gothenburg m.fl. (kommentar när vädret diskuteras)
${vinter
? `Om någon undrar var det är halt på riktigt: Trafikverkets stationer visar ${halkaTot} sträckor just nu (${topp || "spritt"}). Byggde en gratis röstvarnar-app på samma data — beta i oktober.`
: `(spara till vintern)`}

## Pressnotis-stycke (klistras i mejl till lokalpress vid larm)
${vinter
? `Enligt Trafikverkets vägväderstationer rådde på ${iso.slice(8)}/${Number(iso.slice(5,7))} halt väglag på ${halkaTot} vägsträckor${topp ? `, flest i ${topp}` : ""}. Svenska appen Halkvakt läser samma data i realtid och varnar bilister med röst — gratis, byggd på öppna data.`
: `(aktiveras vid första larmet)`}
`;

mkdirSync(join(HERE, "utkast"), { recursive: true });
writeFileSync(join(HERE, "utkast", `halklaget-${iso}.md`), utkast);
writeFileSync(join(HERE, "larm.json"), JSON.stringify(larm, null, 2));
writeFileSync(statePath, JSON.stringify(state, null, 2));

// Måndag → veckorapport
let rapport = null;
if (d.getUTCDay() === 1 && state.history.length > 1) {
  const veckan = state.history.slice(-8), forst = veckan[0], sist = veckan.at(-1);
  rapport = { title: `📊 Veckorapport ${iso} — väntelista ${sist.waitlist} (${sist.waitlist - forst.waitlist >= 0 ? "+" : ""}${sist.waitlist - forst.waitlist})`,
    body: [`# Veckorapport ${iso}`, ``,
      `| | ${forst.date} | ${sist.date} | Δ |`, `|---|---|---|---|`,
      `| Väntelista | ${forst.waitlist} | ${sist.waitlist} | ${sist.waitlist - forst.waitlist >= 0 ? "+" : ""}${sist.waitlist - forst.waitlist} |`,
      `| Halksträckor | ${forst.halka} | ${sist.halka} | ${sist.halka - forst.halka} |`,
      `| Frysstationer | ${forst.frys} | ${sist.frys} | ${sist.frys - forst.frys} |`, ``,
      `Larmade län denna säsong: ${Object.keys(state.lan).map(n => LAN[n]).filter(Boolean).join(", ") || "inga än"}.`,
      ``, `Dagens utkast: \`marknadsforing/utkast/halklaget-${iso}.md\``].join("\n") };
}
writeFileSync(join(HERE, "rapport.json"), JSON.stringify(rapport, null, 2));

console.log(`OK ${iso} · halka=${halkaTot} frys=${frysTot} larm=${larm.length} rapport=${rapport ? "ja" : "nej"} väntelista=${meta.waitlist_count}`);
