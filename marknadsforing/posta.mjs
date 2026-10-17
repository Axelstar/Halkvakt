// Halkvakt live — inlägg till Facebook-sidan och Instagram (kort #281; DECISIONS #598, #599, #600).
// Körs i halkvakt-live.yml tre gånger om dygnet (morgon, lunch, kväll), i två steg:
//   node marknadsforing/posta.mjs bild    → väljer händelsen, skriver inlagg/DATUM-PASS.jpg + .json och live-historik.json
//   node marknadsforing/posta.mjs skicka  → postar bilden och texten (bilden måste vara pushad: Meta hämtar den via raw-URL)
// Utan META_PAGE_ID/META_PAGE_TOKEN är "skicka" en torrkörning: texten skrivs ut, inget postas.
// HV_NU=<ISO-tid> låter en torrkörning låtsas att klockan är en annan.
//
// Urvalet är larmdisciplinen i appen överförd till flödet: EN vinnare per körning, i prioritetsordning
// SMHI-varning > höstens första > stor förändring > höstens kallaste > veckosummering > morgonlistan.
// Lunch och kväll postar bara händelser; ingen händelse betyder inget inlägg. Högst tre inlägg per dygn,
// minst fyra timmar isär, och samma sorts inlägg för samma län högst en gång per 20 timmar.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = process.env.HV_LAN_URL ?? "https://halkvakt.se/data/lan.json";
const META = process.env.HV_META_URL ?? "https://halkvakt.se/data/meta.json";
const RAW = "https://raw.githubusercontent.com/Axelstar/halkvakt/main/marknadsforing/inlagg";
const GRAPH = "https://graph.facebook.com/v23.0";

// Ett län tas med när Trafikverket rapporterar halka på minst ett vägavsnitt eller minst tre
// stationer visar vägbana på 0 °C eller kallare.
const MIN_HALT = 1, MIN_KALLA = 3, MAX_LAN = 5;
// Spärrarna (DECISIONS #600). 20 h och inte 24 h för samma nyckel: pulsklockans morgon får inte fastna en minut för tidigt.
const MAX_PER_DYGN = 3, MIN_MELLAN_H = 4, SAMMA_NYCKEL_H = 20;
// Stor förändring mot samma tid i går: halkan minst fördubblad och minst +10 vägavsnitt, eller minst två nya län.
const FORANDRING_FAKTOR = 2, FORANDRING_MIN = 10, NYA_LAN_MIN = 2;
// Höstens kallaste: minst 0,5 °C under säsongens lägsta och högst −3 °C.
const REKORD_STEG = 0.5, REKORD_TAK = -3;
const HISTORIK_DYGN = 14;
// SMHI-varningar som rör väglaget. Vind till havs och liknande tas inte med.
const SMHI_VAG = /snö|underkyl|isbel|ishalk|halk/i;

const TZ = "Europe/Stockholm";
const minus = n => n.toFixed(1).replace(".", ",").replace("-", "−");
const tid = iso => new Date(iso).toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dag = iso => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const timme = iso => Number(new Date(iso).toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit" }));
const veckodag = d => new Date(d + "T12:00:00Z").toLocaleDateString("sv-SE", { timeZone: TZ, weekday: "long" });
const datumText = iso => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const timmarMellan = (a, b) => (Date.parse(b) - Date.parse(a)) / 36e5;
const lista = ord => ord.length < 2 ? ord.join("") : ord.slice(0, -1).join(", ") + " och " + ord.at(-1);

export function pass(iso) {
  const h = timme(iso);
  return h < 10 ? "morgon" : h < 15 ? "lunch" : "kvall";
}

export function sasong(iso) {
  const [y, m] = dag(iso).split("-").map(Number);
  return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export const raknas = l => l.halt >= MIN_HALT || l.kalla >= MIN_KALLA;

export function valjLan(lan) {
  return lan.filter(raknas).sort((a, b) => b.halt - a.halt || b.kalla - a.kalla);
}

export function rubrik(iso) {
  const h = timme(iso);
  return h < 11 ? "Halt i morse" : h < 17 ? "Halt i dag" : "Halt i kväll";
}

export function rad(l) {
  const delar = [];
  if (l.halt) delar.push(`halka på ${l.halt} av ${l.vagavsnitt} vägavsnitt`);
  if (l.kalla) delar.push(`${l.kalla} ${l.kalla === 1 ? "station" : "stationer"} under noll`);
  if (l.kallast) delar.push(`kallast ${minus(l.kallast.yta)} °C vid ${l.kallast.namn}`);
  if (l.olyckor) delar.push(`${l.olyckor} ${l.olyckor === 1 ? "olycka" : "olyckor"}`);
  return `${l.kort}: ${delar.join(", ")}.`;
}

// Facebook gör en hel adress klickbar i texten; Instagram gör inga länkar klickbara i texten, där pekar raden på profilens länk.
const LANK = {
  facebook: "Läget i ditt län uppdateras var 30:e minut: https://halkvakt.se/lan",
  instagram: "Läget i ditt län uppdateras var 30:e minut. Länken finns i vår profil.",
};
// Facebook får App Store-länken klickbar i varje inlägg; på Instagram ligger den först i profilen (DECISIONS #601).
const APP = {
  facebook: "Halkvakt säger till med rösten innan det blir halt. Gratis för iPhone: https://apps.apple.com/se/app/halkvakt/id6806939784",
  instagram: "Halkvakt säger till med rösten innan det blir halt. Gratis för iPhone, länken finns i vår profil.",
};
const lanTagg = l => "#" + l.kort.replace(/s? län$/, "").replace(/\s+/g, "");

// Gemensam svans för alla inlägg: länk, app, källa och taggar.
function svans(kanal, kalla, lanen) {
  const taggar = ["#halka", "#väglag", ...lanen.map(lanTagg)];
  // Bengts förslag 17/10 (DECISIONS #610): säg att vi är oberoende, så att ingen tror att inlägget kommer från Trafikverket.
  return ["", LANK[kanal], APP[kanal], "", `Halkvakt är en oberoende app och sajt, inte en del av Trafikverket. Siffrorna kommer från ${kalla}.`, "", [...new Set(taggar)].join(" ")];
}

// Morgonlistans inledning skiftar mellan dagarna så att inläggen inte ser likadana ut varje morgon.
export function inledning(iso) {
  const n = Math.floor(Date.parse(iso) / 864e5) % 3;
  return [
    `Halkläget kl. ${tid(iso)}, ${datumText(iso)}.`,
    `God morgon. Så här ser vägarna ut kl. ${tid(iso)}.`,
    `Innan du kör i dag: läget kl. ${tid(iso)}, ${datumText(iso)}.`,
  ][n];
}

export function bildtext(alla, generatedAt, kanal = "facebook", forsta = `Halkläget kl. ${tid(generatedAt)}, ${datumText(generatedAt)}.`) {
  const valda = alla.slice(0, MAX_LAN), fler = alla.length - valda.length;
  return [
    forsta,
    "",
    ...valda.map(rad),
    ...(fler ? [`Halka eller minusgrader även i ${fler} län till.`] : []),
    ...svans(kanal, "Trafikverkets öppna data", valda),
  ].join("\n");
}

// ---------- Historiken ----------

function kallastNu(lan, iso) {
  const k = lan.filter(l => l.kallast).sort((a, b) => a.kallast.yta - b.kallast.yta)[0];
  return k ? { yta: k.kallast.yta, namn: k.kallast.namn, kort: k.kort, tid: iso } : null;
}

export function nyHistorik(iso, state, lan) {
  // Län som redan haft halka i höst (generatorns state.json) eller som räknas i dag är redan "sedda":
  // första körningen får aldrig påstå en första gång den inte själv har sett.
  const forsta = {};
  if (state?.season === sasong(iso)) for (const [kod, d] of Object.entries(state.lan ?? {})) forsta[kod] = d;
  for (const l of lan) if (raknas(l) && !forsta[l.kod]) forsta[l.kod] = dag(iso);
  return { sasong: sasong(iso), forsta, kallaste: kallastNu(lan, iso), bilder: [] };
}

export function lagg(historik, iso, lan) {
  const bild = { tid: iso, lan: Object.fromEntries(lan.map(l => [l.kod, { h: l.halt, k: l.kalla, y: l.kallast?.yta ?? null, n: l.kallast?.namn ?? null }])) };
  const bilder = [...historik.bilder, bild].filter(b => timmarMellan(b.tid, iso) <= HISTORIK_DYGN * 24);
  const forsta = { ...historik.forsta };
  for (const l of lan) if (raknas(l) && !forsta[l.kod]) forsta[l.kod] = dag(iso);
  const nu = kallastNu(lan, iso);
  const kallaste = nu && (!historik.kallaste || nu.yta < historik.kallaste.yta) ? nu : historik.kallaste;
  return { ...historik, forsta, kallaste, bilder };
}

// Ögonblicksbilden närmast 24 h före, men bara inom 20–28 h — annars finns inget "samma tid i går".
function igar(historik, iso) {
  return historik.bilder
    .map(b => ({ b, d: Math.abs(timmarMellan(b.tid, iso) - 24) }))
    .filter(x => x.d <= 4)
    .sort((a, b) => a.d - b.d)[0]?.b ?? null;
}

// ---------- Spärrarna ----------

const somLista = v => Array.isArray(v) ? v : [{ ...v, typ: "lista", nyckel: "lista" }];   // 16/10 skrevs ett enda kvitto per dag

export function inlaggIdag(postat, iso) {
  return postat[dag(iso)] ? somLista(postat[dag(iso)]) : [];
}

const allaInlagg = postat => Object.values(postat).flatMap(somLista);

export function sparr(postat, iso) {
  // Ett inlägg om flera läns första gång har en kopia per län; kopiorna är inga egna inlägg.
  if (inlaggIdag(postat, iso).filter(p => !p.kopia).length >= MAX_PER_DYGN) return `redan ${MAX_PER_DYGN} inlägg i dag`;
  const senast = allaInlagg(postat).map(p => p.tid).sort().at(-1);
  if (senast && timmarMellan(senast, iso) < MIN_MELLAN_H) return `senaste inlägget ${tid(senast)}, mindre än ${MIN_MELLAN_H} h sedan`;
  return null;
}

const nyligen = (postat, iso, nyckel) =>
  allaInlagg(postat).some(p => p.nyckel === nyckel && timmarMellan(p.tid, iso) < SAMMA_NYCKEL_H);

// ---------- Händelserna, i prioritetsordning ----------

function smhi(nu, lan, meta, historik, postat) {
  const varningar = (meta?.smhi_vinter ?? []).filter(v => SMHI_VAG.test(v.event) && !/havs?\b/i.test(v.omrade));
  const nyckel = v => `smhi:${v.event}:${v.omrade}:${v.niva_kod}`;
  const ny = varningar.find(v => !nyligen(postat, nu, nyckel(v)));
  if (!ny) return null;
  const valda = valjLan(lan);
  const fler = varningar.length - 1;
  const forsta = `SMHI har utfärdat en ${ny.niva.toLowerCase()} varning för ${ny.event.toLowerCase()} i ${ny.omrade}.` +
    (fler ? ` Det finns ${fler} varning${fler === 1 ? "" : "ar"} till för snö eller halka.` : "");
  const text = kanal => [
    forsta,
    ...(valda.length ? ["", `Halkläget kl. ${tid(lan.generatedAt)}:`, ...valda.slice(0, MAX_LAN).map(rad)] : []),
    ...svans(kanal, "SMHI och Trafikverkets öppna data", valda.slice(0, MAX_LAN)),
  ].join("\n");
  return {
    typ: "smhi", nyckel: nyckel(ny),
    etikett: "SMHI-varning", rubrik: "Varning för väglaget", underrad: `Halkläget kl. ${tid(lan.generatedAt)}`,
    varning: { niva: `${ny.niva} varning`, event: ny.event, omrade: ny.omrade, fler },
    lan: valda, text: text("facebook"), textIg: text("instagram"),
  };
}

function forstaGangen(nu, lan, meta, historik, postat) {
  const nya = valjLan(lan).filter(l => !historik.forsta[l.kod] && !nyligen(postat, nu, `forsta:${l.kod}`));
  if (!nya.length) return null;
  const nar = { morgon: "I natt", lunch: "I dag", kvall: "I kväll" }[pass(nu)];
  const vad = nya.every(l => l.halt) ? "halka" : nya.every(l => !l.halt) ? "minusgrader på vägbanan" : "halka och minusgrader";
  const text = kanal => [
    `${nar} kom höstens första ${vad} i ${lista(nya.map(l => l.kort))}.`,
    "",
    ...nya.slice(0, MAX_LAN).map(rad),
    "",
    "Kör efter väglaget, inte efter vanan.",
    ...svans(kanal, "Trafikverkets öppna data", nya.slice(0, MAX_LAN)),
  ].join("\n");
  const ett = nya.length === 1;
  return {
    typ: "forsta", nyckel: `forsta:${nya[0].kod}`, alla: nya.map(l => `forsta:${l.kod}`),
    etikett: "Höstens första",
    rubrik: ett ? `Första ${vad === "halka" ? "halkan" : "minusgraderna"} i ${nya[0].kort}` : `Höstens första ${vad}`,
    underrad: `${nar.toLowerCase()} · ${datumText(nu)}`,
    lyft: ett ? { stort: nya[0].halt ? String(nya[0].halt) : String(nya[0].kalla), liten: nya[0].halt
      ? `av ${nya[0].vagavsnitt} vägavsnitt med halka`
      : "stationer med vägbanan under noll", fot: [
        nya[0].halt && nya[0].kalla ? `${nya[0].kalla} stationer under noll` : "",
        nya[0].kallast ? `kallast ${minus(nya[0].kallast.yta)} °C vid ${nya[0].kallast.namn}` : "",
      ].filter(Boolean).join(" · ") } : null,
    lan: ett ? [] : nya, text: text("facebook"), textIg: text("instagram"),
  };
}

function forandring(nu, lan, meta, historik, postat) {
  const forr = igar(historik, nu);
  if (!forr || nyligen(postat, nu, "forandring")) return null;
  const summa = lan.reduce((s, l) => s + l.halt, 0);
  const summaForr = Object.values(forr.lan).reduce((s, l) => s + l.h, 0);
  const nyaLan = lan.filter(l => l.halt >= MIN_HALT && !(forr.lan[l.kod]?.h >= MIN_HALT));
  const vaxt = summa >= FORANDRING_FAKTOR * summaForr && summa - summaForr >= FORANDRING_MIN;
  if (!vaxt && nyaLan.length < NYA_LAN_MIN) return null;
  const valda = valjLan(lan);
  const text = kanal => [
    `Trafikverket rapporterar halka på ${summa} vägavsnitt, mot ${summaForr} vid samma tid i går.`,
    ...(nyaLan.length ? [`Ny halka sedan i går: ${lista(nyaLan.map(l => l.kort))}.`] : []),
    "",
    ...valda.slice(0, MAX_LAN).map(rad),
    ...(valda.length > MAX_LAN ? [`Halka eller minusgrader även i ${valda.length - MAX_LAN} län till.`] : []),
    ...svans(kanal, "Trafikverkets öppna data", valda.slice(0, MAX_LAN)),
  ].join("\n");
  return {
    typ: "forandring", nyckel: "forandring",
    etikett: "Sedan i går", rubrik: "Halkan sprider sig", underrad: "vägavsnitt med halka, mot samma tid i går",
    lyft: { stort: `${summaForr} → ${summa}`, liten: nyaLan.length ? `ny halka i ${lista(nyaLan.map(l => l.kort))}` : "" },
    lan: valda, text: text("facebook"), textIg: text("instagram"),
  };
}

function kallaste(nu, lan, meta, historik, postat) {
  const k = kallastNu(lan, nu), forr = historik.kallaste;
  if (!k || !forr || k.yta > REKORD_TAK || k.yta > forr.yta - REKORD_STEG || nyligen(postat, nu, "kallaste")) return null;
  const l = lan.find(x => x.kort === k.kort);
  // En punktkälla: stationen och länet, aldrig ett avstånd (CLAUDE.md).
  const text = kanal => [
    `${minus(k.yta)} °C på vägbanan vid ${k.namn} i ${k.kort} kl. ${tid(lan.generatedAt)}.`,
    `Det är höstens kallaste vägbana hittills i Halkvakts mätningar. Förra lägsta var ${minus(forr.yta)} °C vid ${forr.namn}.`,
    "",
    rad(l),
    ...svans(kanal, "Trafikverkets öppna data", [l]),
  ].join("\n");
  return {
    typ: "kallaste", nyckel: "kallaste",
    etikett: "Höstens kallaste", rubrik: "Kallaste vägbanan i höst", underrad: `${k.namn}, ${k.kort} · kl. ${tid(lan.generatedAt)}`,
    lyft: { stort: `${minus(k.yta)}°`, liten: "på vägbanan", fot: `Förra lägsta: ${minus(forr.yta)} °C vid ${forr.namn}` }, tema: "is",
    lan: [l], text: text("facebook"), textIg: text("instagram"),
  };
}

export function veckan(historik, nu) {
  const dagar = new Map();
  for (const b of historik.bilder.filter(b => timmarMellan(b.tid, nu) < 7 * 24)) {
    const d = dag(b.tid), v = dagar.get(d) ?? { dag: d, halt: 0, kallast: null };
    v.halt = Math.max(v.halt, Object.values(b.lan).reduce((s, l) => s + l.h, 0));
    for (const [kod, l] of Object.entries(b.lan))
      if (l.y !== null && (!v.kallast || l.y < v.kallast.yta)) v.kallast = { yta: l.y, namn: l.n, kod };
    dagar.set(d, v);
  }
  return [...dagar.values()].sort((a, b) => a.dag.localeCompare(b.dag));
}

function vecka(nu, lan, meta, historik, postat) {
  const sondag = new Date(nu).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" }) === "Sun";
  if (pass(nu) !== "kvall" || !sondag || nyligen(postat, nu, "vecka")) return null;
  const dagar = veckan(historik, nu);
  if (dagar.length < 5) return null;
  const halka = dagar.filter(d => d.halt > 0);
  const kall = dagar.filter(d => d.kallast).sort((a, b) => a.kallast.yta - b.kallast.yta)[0];
  if (!halka.length && !(kall?.kallast.yta <= 0)) return null;   // en vecka utan halka och minusgrader är ingen nyhet
  const topp = [...dagar].sort((a, b) => b.halt - a.halt)[0];
  const nar = d => d === dag(nu) ? "i dag" : `i ${veckodag(d)}s`;
  const namnPa = kod => lan.find(l => String(l.kod) === String(kod))?.kort ?? "";
  const text = kanal => [
    `Veckan på vägarna: halka rapporterades ${halka.length} av ${dagar.length} dagar.`,
    ...(topp.halt ? [`Mest halka ${nar(topp.dag)}: ${topp.halt} vägavsnitt.`] : []),
    ...(kall ? [`Kallast: ${minus(kall.kallast.yta)} °C på vägbanan vid ${kall.kallast.namn} (${namnPa(kall.kallast.kod)}) ${nar(kall.dag)}.`] : []),
    ...svans(kanal, "Trafikverkets öppna data", []),
  ].join("\n");
  return {
    typ: "vecka", nyckel: "vecka",
    etikett: "Veckan i halka", rubrik: "Veckan på vägarna", underrad: `${halka.length} av ${dagar.length} dagar med halka`,
    staplar: dagar, lan: [], text: text("facebook"), textIg: text("instagram"),
  };
}

function morgonlista(nu, lan, meta, historik, postat) {
  // En gång per dag, inte 20 h: gårdagens kvällsinlägg får aldrig tysta morgonlistan (17/10, DECISIONS #609).
  if (pass(nu) !== "morgon" || inlaggIdag(postat, nu).some(p => p.nyckel === "lista")) return null;
  const valda = valjLan(lan);
  if (!valda.length) return null;
  return {
    typ: "lista", nyckel: "lista",
    etikett: `Halkläget kl. ${tid(lan.generatedAt)}`, rubrik: rubrik(lan.generatedAt), underrad: datumText(nu),
    lan: valda,
    text: bildtext(valda, lan.generatedAt, "facebook", inledning(nu)),
    textIg: bildtext(valda, lan.generatedAt, "instagram", inledning(nu)),
  };
}

const ORDNING = [smhi, forstaGangen, forandring, kallaste, vecka, morgonlista];

/** Ren funktion: körningens vinnare eller null. `lan` bär `generatedAt` som egenskap. */
export function valjHandelse(nu, lan, meta, historik, postat) {
  if (sparr(postat, nu)) return null;
  for (const f of ORDNING) {
    const h = f(nu, lan, meta, historik, postat);
    if (h) return { ...h, pass: pass(nu) };
  }
  return null;
}

// ---------- Bilden ----------

export function html(h) {
  // Med ett stort tal eller ett varningskort ryms tre län; annars fem.
  const valda = h.lan.slice(0, h.lyft || h.varning ? 3 : MAX_LAN), fler = h.lan.length - valda.length;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rader = valda.map(l => `
    <div class="lan">
      <div class="namn">${esc(l.kort)}</div>
      <div class="tal"><b class="${l.halt ? "varm" : ""}">${l.halt}</b><span>av ${l.vagavsnitt} vägavsnitt<br>med halka</span></div>
      <div class="tal"><b class="${l.kalla ? "varm" : ""}">${l.kalla}</b><span>stationer<br>under noll</span></div>
      <div class="tal"><b class="${l.kallast ? "" : "liten"}">${l.kallast ? minus(l.kallast.yta) + "°" : "över 0°"}</b><span>${l.kallast ? esc(l.kallast.namn) + "<br>kallast" : "alla<br>stationer"}</span></div>
    </div>`).join("");
  const lyft = h.lyft ? `<div class="lyft"><b>${esc(h.lyft.stort)}</b>${h.lyft.liten ? `<span>${esc(h.lyft.liten)}</span>` : ""}
    ${h.lyft.fot ? `<p>${esc(h.lyft.fot)}</p>` : ""}</div>` : "";
  const varning = h.varning ? `<div class="varning"><small>${esc(h.varning.niva)}</small><b>${esc(h.varning.event)}</b>
    <span>${esc(h.varning.omrade)}${h.varning.fler ? ` · ${h.varning.fler} varning${h.varning.fler === 1 ? "" : "ar"} till` : ""}</span></div>` : "";
  const max = Math.max(1, ...(h.staplar ?? []).map(d => d.halt));
  const staplar = h.staplar ? `<div class="staplar">${h.staplar.map(d => `
    <div class="stapel"><b>${d.halt}</b><i style="height:${Math.round(8 + 360 * d.halt / max)}px" class="${d.halt ? "varm" : ""}"></i>
      <span>${esc(veckodag(d.dag).slice(0, 3))}</span></div>`).join("")}</div>
    <p class="fler">Vägavsnitt med halka, högsta värdet per dag</p>` : "";
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root{--mark:#080B0D;--panel:#0F1518;--kant:#1E282D;--text:#E9EFF2;--text2:#A9B5BB;--dampad:#8FA0A9;--gul:#FFC94A;
    --sans:"Instrument Sans","Helvetica Neue",Arial,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1350px;background:var(--mark);color:var(--text);font-family:var(--sans);padding:84px 80px;display:flex;flex-direction:column}
  .etikett{display:flex;align-items:center;gap:18px;font:600 26px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dampad)}
  .etikett svg{width:38px}.etikett b{color:var(--text)}
  h1{font:700 92px/1.02 var(--sans);letter-spacing:-.02em;margin-top:36px}
  .datum{font:500 30px var(--mono);color:var(--text2);margin-top:20px;letter-spacing:.02em}
  .lista{display:grid;gap:14px;margin-top:44px}
  .lan{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;align-items:center;gap:20px;background:var(--panel);border:1px solid var(--kant);border-radius:22px;padding:20px 30px}
  .namn{font:600 36px/1.1 var(--sans)}
  .tal b{display:block;font:600 52px/1 var(--mono)}.tal b.varm{color:var(--gul)}.tal b.liten{font-size:38px;line-height:52px;white-space:nowrap}
  .tal span{display:block;font:400 20px/1.3 var(--sans);color:var(--text2);margin-top:8px}
  .fler{font:500 26px var(--mono);color:var(--text2);margin-top:22px}
  .staplar{display:flex;align-items:flex-end;gap:22px;height:520px;margin-top:60px;background:var(--panel);border:1px solid var(--kant);border-radius:22px;padding:30px 36px}
  .stapel{flex:1;display:flex;flex-direction:column;align-items:center;gap:12px;font:600 34px var(--mono)}
  .stapel i{display:block;width:100%;border-radius:10px;background:var(--kant)}.stapel i.varm{background:var(--gul)}
  .stapel span{font:500 24px var(--mono);color:var(--dampad);text-transform:uppercase}
  .lyft{margin-top:56px}
  .lyft b{display:block;font:600 230px/0.95 var(--mono);letter-spacing:-.04em;color:var(--gul)}
  .lyft span{display:block;font:600 44px/1.2 var(--sans);margin-top:18px}
  .lyft p{font:500 28px/1.4 var(--mono);color:var(--text2);margin-top:22px}
  body.is{--gul:#9AD8FF}
  .varning{margin-top:48px;background:#FFC94A;color:#111719;border-radius:26px;padding:40px 46px}
  .varning small{display:block;font:600 26px var(--mono);letter-spacing:.16em;text-transform:uppercase}
  .varning b{display:block;font:700 96px/1 var(--sans);letter-spacing:-.02em;margin-top:16px}
  .varning span{display:block;font:500 32px var(--sans);margin-top:16px}
  .fot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font:500 26px var(--mono);color:var(--dampad);letter-spacing:.04em}
  .fot b{color:var(--text);font-weight:600;font-size:32px;letter-spacing:.06em}
</style></head><body class="${h.tema ?? ""}">
  <p class="etikett"><svg viewBox="3 3 94 83"><path fill-rule="evenodd" fill="#FFC94A" d="M55.196 6 L96.196 77 A6 6 0 0 1 91 86 L9 86 A6 6 0 0 1 3.804 77 L44.804 6 A6 6 0 0 1 55.196 6 Z M46.4 32 L53.6 32 L52 58 L48 58 Z M45.6 68 A4.4 4.4 0 1 0 54.4 68 A4.4 4.4 0 1 0 45.6 68 Z"/></svg><b>Halkvakt</b>${esc(h.etikett)}</p>
  <h1>${esc(h.rubrik)}</h1>
  <p class="datum">${esc(h.underrad)}</p>
  ${varning}${lyft}
  ${rader ? `<div class="lista">${rader}</div>` : ""}
  ${fler ? `<p class="fler">+ ${fler} län till</p>` : ""}
  ${staplar}
  <div class="fot"><span>Källa: ${h.typ === "smhi" ? "SMHI och Trafikverket" : "Trafikverkets öppna data"}</span><b>halkvakt.se/lan</b></div>
</body></html>`;
}

// ---------- Stegen ----------

const dir = join(HERE, "inlagg");
const postatPath = join(HERE, "postat.json");
const historikPath = join(HERE, "live-historik.json");
const lasJson = (p, annars) => existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : annars;

async function bild() {
  const nu = process.env.HV_NU || new Date().toISOString();
  const postat = lasJson(postatPath, {});
  const d = await (await fetch(DATA, { cache: "no-store" })).json();
  const alder = timmarMellan(d.generated_at, nu);
  if (alder > 2) throw new Error(`lan.json är ${alder.toFixed(1)} h gammal (${d.generated_at}) — postar inte på gammal data`);
  const meta = await fetch(META, { cache: "no-store" }).then(r => r.json()).catch(() => null);
  const lan = Object.assign([...d.lan], { generatedAt: d.generated_at });

  let historik = lasJson(historikPath, null);
  // Första körningen (eller ny säsong) sår historiken; då kan bara det som inte kräver historik vinna.
  if (!historik || historik.sasong !== sasong(nu)) historik = nyHistorik(nu, lasJson(join(HERE, "state.json"), null), lan);
  const h = valjHandelse(nu, lan, meta, historik, postat);
  writeFileSync(historikPath, JSON.stringify(lagg(historik, nu, lan)) + "\n");

  if (!h) return console.log(`${pass(nu)} ${dag(nu)}: inget inlägg (${sparr(postat, nu) ?? "ingen händelse"}).`);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.HV_CHROMIUM ? { executablePath: process.env.HV_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html(h), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dir, { recursive: true });
  const namn = `${dag(nu)}-${h.pass}`;
  await page.screenshot({ path: join(dir, `${namn}.jpg`), type: "jpeg", quality: 90 });
  await browser.close();
  const { lan: valda, staplar, ...resten } = h;
  writeFileSync(join(dir, `${namn}.json`), JSON.stringify({ ...resten, datum: dag(nu), generated_at: d.generated_at, lan: valda.map(l => l.slug) }, null, 2) + "\n");
  console.log(`Inlägg ${namn} (${h.typ}):\n\n${h.text}`);
}

async function graph(path, params) {
  const r = await fetch(`${GRAPH}/${path}`, { method: "POST", body: new URLSearchParams(params) });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(`${path}: ${r.status} ${JSON.stringify(body)}`);
  return body;
}

async function skicka() {
  const nu = process.env.HV_NU || new Date().toISOString();
  const postat = lasJson(postatPath, {});
  const namn = `${dag(nu)}-${pass(nu)}`;
  const fil = join(dir, `${namn}.json`);
  if (!existsSync(fil)) return console.log(`Inget inlägg ${namn}.`);
  const inlagg = JSON.parse(readFileSync(fil, "utf8"));
  if (inlaggIdag(postat, nu).some(p => p.pass === inlagg.pass)) return console.log(`Redan postat ${namn}.`);
  const stopp = sparr(postat, nu);
  if (stopp) return console.log(`Postar inte ${namn}: ${stopp}.`);
  const url = `${RAW}/${namn}.jpg`;
  const { META_PAGE_ID: page, META_PAGE_TOKEN: token, META_IG_ID: ig } = process.env;
  if (!page || !token) return console.log(`TORRKÖRNING (META_PAGE_ID/META_PAGE_TOKEN saknas). Skulle posta ${url}:\n\n${inlagg.text}`);

  const kvitto = { pass: inlagg.pass, typ: inlagg.typ, nyckel: inlagg.nyckel, tid: new Date().toISOString(), bild: url };
  const fb = await graph(`${page}/photos`, { url, caption: inlagg.text, access_token: token });
  kvitto.facebook = fb.post_id ?? fb.id;
  console.log(`Facebook: ${kvitto.facebook}`);
  if (ig) {
    const media = await graph(`${ig}/media`, { image_url: url, caption: inlagg.textIg ?? inlagg.text, access_token: token });
    const ut = await graph(`${ig}/media_publish`, { creation_id: media.id, access_token: token });
    kvitto.instagram = ut.id;
    console.log(`Instagram: ${ut.id}`);
  }
  // Ett inlägg om flera läns första gång spärrar alla de länen, inte bara det första.
  const kvitton = (inlagg.alla ?? [inlagg.nyckel]).map((nyckel, i) => i ? { ...kvitto, nyckel, kopia: true } : kvitto);
  postat[dag(nu)] = [...inlaggIdag(postat, nu), ...kvitton];
  writeFileSync(postatPath, JSON.stringify(postat, null, 2) + "\n");
}

const steg = process.argv[2];
if (steg === "bild") await bild();
else if (steg === "skicka") await skicka();
else if (steg) { console.error(`Okänt steg "${steg}" — använd bild eller skicka.`); process.exit(1); }
