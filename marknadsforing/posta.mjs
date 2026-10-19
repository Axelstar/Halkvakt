// Halkvakt live — inlägg till Facebook-sidan och Instagram (kort #281; DECISIONS #598, #599, #600).
// Körs i halkvakt-live.yml tre gånger om dygnet (morgon, lunch, kväll) och i halkvakt-larm.yml var 30:e minut (DECISIONS #627):
//   node marknadsforing/posta.mjs bild    → väljer händelsen, skriver inlagg/DATUM-PASS.jpg + .json och live-historik.json
//   node marknadsforing/posta.mjs koll    → finns ett larm att posta? (har=ja|nej i GITHUB_OUTPUT; ritar och skriver inget)
//   node marknadsforing/posta.mjs bild --live → ritar larmet till inlagg/DATUM-live-HHMM.jpg + .json (ingen historik)
//   node marknadsforing/posta.mjs skicka  → postar bilden och texten (bilden måste vara pushad: Meta hämtar den via raw-URL);
//                                           X får bilden ur arbetsträdet och textX(), när X_API_KEY m.fl. finns (DECISIONS #645);
//                                           HV_NAMN väljer filerna, annars dagens pass
// Utan META_PAGE_ID/META_PAGE_TOKEN är "skicka" en torrkörning: texten skrivs ut, inget postas.
// HV_NU=<ISO-tid> låter en torrkörning låtsas att klockan är en annan.
//
// Urvalet är larmdisciplinen i appen överförd till flödet: EN vinnare per körning, i prioritetsordning.
// LARMEN (gula, DECISIONS #627): SMHI-varning > höstens första. De prövas var 30:e minut av halkvakt-larm.yml
// (`bild --live`), postas när det händer och räknas inte mot dagens tre; högst fyra larm per dygn.
// DAGSLÄGET (mörka): stor förändring > höstens kallaste > veckosummering > morgonlistan, morgon, lunch och kväll.
// Lunch och kväll postar bara händelser; ingen händelse betyder inget inlägg. Högst tre per dygn, minst fyra timmar
// isär. Samma sorts inlägg för samma län (eller samma varning) högst en gång per 20 timmar, larm som dagsläge.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes } from "node:crypto";

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
// Larmen (DECISIONS #627): utanför dagens tre, men högst fyra per dygn — en stormdag med tio SMHI-varningar ska inte
// bli tio inlägg i rad. Varje SMHI-inlägg räknar redan upp varningarna som inte fick eget inlägg.
const MAX_LARM_PER_DYGN = 4;
const LARMTYPER = new Set(["smhi", "forsta"]);
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
  // #halkvakt sist i varje inlägg, så att inläggen samlas under vårt namn (Axel 17/10, DECISIONS #622).
  const taggar = ["#halka", "#väglag", ...lanen.map(lanTagg), "#halkvakt"];
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

export function sparr(postat, iso, larm = false) {
  // Ett inlägg om flera läns första gång har en kopia per län; kopiorna är inga egna inlägg.
  // Larmen och dagsläget har var sin räkning: ett larm tar aldrig en av dagens tre platser (DECISIONS #627).
  const egna = p => !p.kopia && LARMTYPER.has(p.typ) === larm;
  if (larm) return inlaggIdag(postat, iso).filter(egna).length >= MAX_LARM_PER_DYGN ? `redan ${MAX_LARM_PER_DYGN} larm i dag` : null;
  if (inlaggIdag(postat, iso).filter(egna).length >= MAX_PER_DYGN) return `redan ${MAX_PER_DYGN} inlägg i dag`;
  const senast = allaInlagg(postat).filter(egna).map(p => p.tid).sort().at(-1);
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
    ikon: vad === "minusgrader på vägbanan" ? "frys" : "halka",   // en ikon per fara (guiden, avsnitt 05)
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
    lyft: { stort: `${minus(k.yta)}°`, liten: "på vägbanan", fot: `Förra lägsta: ${minus(forr.yta)} °C vid ${forr.namn}` },
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

const LARM = [smhi, forstaGangen];
const ORDNING = [forandring, kallaste, vecka, morgonlista];

/** Ren funktion: körningens vinnare eller null. `lan` bär `generatedAt` som egenskap. `larm` prövar bara larmen (#627). */
export function valjHandelse(nu, lan, meta, historik, postat, larm = false) {
  if (sparr(postat, nu, larm)) return null;
  for (const f of larm ? LARM : ORDNING) {
    const h = f(nu, lan, meta, historik, postat);
    if (h) return { ...h, pass: larm ? "live" : pass(nu) };
  }
  return null;
}

// ---------- Bilden ----------

// Bilden följer Varumärkesguide 1.0 och Sociala mallar (Axel 17/10, DECISIONS #626): gult är bara ytan för en fara som är live
// (SMHI-varning, höstens första), allt annat är Dagsläget på mörk mark. Gult är aldrig text, och inga andra färger.
const MARKE = "M55.196 6 L96.196 77 A6 6 0 0 1 91 86 L9 86 A6 6 0 0 1 3.804 77 L44.804 6 A6 6 0 0 1 55.196 6 Z M46.4 32 L53.6 32 L52 58 L48 58 Z M45.6 68 A4.4 4.4 0 1 0 54.4 68 A4.4 4.4 0 1 0 45.6 68 Z";
const FRYS = `<svg class="ikon" viewBox="0 0 48 48"><g><path d="M24 5 V43 M19 8 L24 13 L29 8 M19 40 L24 35 L29 40"/></g><g transform="rotate(60 24 24)"><path d="M24 5 V43 M19 8 L24 13 L29 8 M19 40 L24 35 L29 40"/></g><g transform="rotate(-60 24 24)"><path d="M24 5 V43 M19 8 L24 13 L29 8 M19 40 L24 35 L29 40"/></g></svg>`;
const HALKA = `<svg class="ikon" viewBox="0 0 48 48"><path d="M13 18 L16 9 H32 L35 18"/><rect x="8" y="17" width="32" height="10" rx="3"/><path d="M13 22 H16 M32 22 H35 M13 27 V31 M35 27 V31"/><path d="M5 38 q4.5 -4 9.5 0 t9.5 0 t9.5 0 t9.5 0"/><path d="M5 45 q4.5 -4 9.5 0 t9.5 0 t9.5 0 t9.5 0"/></svg>`;

export function html(h) {
  const live = LARMTYPER.has(h.typ);
  // Med ett stort tal eller ett varningskort ryms tre län; annars fem.
  const valda = h.lan.slice(0, h.lyft || h.varning ? 3 : MAX_LAN), fler = h.lan.length - valda.length;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const forst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const kallast = l => l.kallast ? `${minus(l.kallast.yta)}°` : "över 0°";
  const rader = valda.map(l => live ? `
    <div class="r"><div class="namn">${esc(l.kort)}</div><div class="v"><b>${l.halt} av ${l.vagavsnitt}</b>
      <span>med halka · ${l.kalla} under noll · ${l.kallast ? "kallast " + kallast(l) : "alla över 0°"}</span></div></div>` : `
    <div class="rad"><div class="namn">${esc(l.kort)}</div>
      <div class="t"><b>${l.halt}</b><span>av ${l.vagavsnitt} med halka</span></div>
      <div class="t"><b>${l.kalla}</b><span>stationer under noll</span></div>
      <div class="t"><b>${kallast(l)}</b><span>${l.kallast ? esc(l.kallast.namn) + ", kallast" : "alla stationer"}</span></div></div>`).join("");
  const lyft = h.lyft ? `<div class="lyft"><b>${esc(h.lyft.stort)}</b>${h.lyft.liten ? `<span>${esc(h.lyft.liten)}</span>` : ""}
    ${h.lyft.fot ? `<p>${esc(h.lyft.fot)}</p>` : ""}</div>` : "";
  const varning = h.varning ? `<div class="plats"><span class="skylt">SMHI</span><span>${esc(h.varning.niva)} för ${esc(h.varning.event.toLowerCase())} i ${esc(h.varning.omrade)}</span></div>
    ${h.varning.fler ? `<p class="fler">${h.varning.fler} varning${h.varning.fler === 1 ? "" : "ar"} till för snö eller halka</p>` : ""}` : "";
  const max = Math.max(1, ...(h.staplar ?? []).map(d => d.halt));
  const staplar = h.staplar ? `<div class="staplar">${h.staplar.map(d => `
    <div class="stapel"><b>${d.halt}</b><i style="height:${Math.round(8 + 360 * d.halt / max)}px" class="${d.halt ? "halt" : ""}"></i>
      <span>${esc(veckodag(d.dag).slice(0, 3))}</span></div>`).join("")}</div>
    <p class="fler">Vägavsnitt med halka, högsta värdet per dag</p>` : "";
  const kalla = h.typ === "smhi" ? "SMHI och Trafikverket" : "Trafikverket";
  const ink = live ? "#080B0D" : "#FFC94A";
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root{--sans:"Instrument Sans","Helvetica Neue",Arial,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1350px;padding:72px 72px 60px;display:flex;flex-direction:column;font-family:var(--sans);background:#080B0D;color:#E9EFF2}
  .meta{display:flex;justify-content:space-between;align-items:center;font:500 24px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#8FA0A9}
  .meta span:first-child{display:flex;align-items:center;gap:.6em}
  .prick{width:.5em;height:.5em;border-radius:50%;background:#FFC94A;box-shadow:0 0 .6em #FFC94A}
  h1{margin-top:56px;font-size:96px;font-weight:600;letter-spacing:-.035em;line-height:1;text-wrap:balance}
  .under{margin-top:18px;font-size:30px;color:#A9B5BB}
  .panel{margin-top:48px;background:#0F1518;border-radius:36px;padding:4px 40px}
  .rad{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:18px;align-items:center;padding:22px 0;border-bottom:2px dashed #253036}.rad:last-child{border-bottom:0}
  .namn{font-size:32px;font-weight:600}
  .t b{display:block;font:600 52px/1 var(--mono);letter-spacing:-.02em}
  .t span{display:block;margin-top:8px;font:500 19px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:#8FA0A9}
  .fler{font:500 24px var(--mono);letter-spacing:.06em;color:#A9B5BB;margin-top:22px}
  .lyft{margin-top:56px}
  .lyft b{display:block;font:600 200px/0.95 var(--mono);letter-spacing:-.04em}
  .lyft span{display:block;font:600 44px/1.2 var(--sans);letter-spacing:-.015em;margin-top:18px}
  .lyft p{font:500 26px/1.4 var(--mono);color:#A9B5BB;margin-top:22px}
  .staplar{display:flex;align-items:flex-end;gap:22px;height:520px;margin-top:56px;background:#0F1518;border-radius:36px;padding:30px 36px}
  .stapel{flex:1;display:flex;flex-direction:column;align-items:center;gap:12px;font:600 34px var(--mono)}
  .stapel i{display:block;width:100%;border-radius:10px;background:#26323A}.stapel i.halt{background:#A9B5BB}
  .stapel span{font:500 24px var(--mono);color:#8FA0A9;text-transform:uppercase}
  .fot{margin-top:auto;padding-top:28px;display:flex;justify-content:space-between;align-items:center;font:500 20px var(--mono);letter-spacing:.12em;color:#6F7C83}
  .fot .lock{display:flex;align-items:center;gap:13px;font:600 22px var(--mono);letter-spacing:.12em;color:#E9EFF2}
  .fot .h{display:flex;gap:1.2em}.fot .u{color:#8FA0A9;letter-spacing:.04em;text-transform:none}
  /* Live: hela ytan gul, bläck #080B0D, sekundär text #3A2E0B. */
  body.live{background:#FFC94A;color:#080B0D}
  .live .meta{color:#080B0D;font-weight:600}.live .prick{background:#080B0D;box-shadow:none}
  .live .ikon{display:block;width:150px;height:150px;margin-top:64px;fill:none;stroke:#080B0D;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}
  .live h1{margin-top:36px;font-size:104px;line-height:.95}
  .live .under,.live .fler,.live .lyft p,.live .v span{color:#3A2E0B}
  .live .lyft{margin-top:40px}.live .lyft b{font-size:180px}
  .plats{margin-top:28px;display:flex;flex-wrap:wrap;align-items:center;gap:20px;font-size:40px;font-weight:500;letter-spacing:-.015em;line-height:1.15}
  .skylt{padding:8px 16px;border:5px solid #080B0D;border-radius:14px;font:600 34px/1 var(--mono);letter-spacing:.04em}
  .rader{margin-top:44px}
  .r{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:20px 0;border-top:3px dashed rgba(8,11,13,.4)}
  .r .v{text-align:right}.r .v b{display:block;font:600 52px/1 var(--mono);letter-spacing:-.02em}
  .r .v span{display:block;margin-top:8px;font:500 19px var(--mono);letter-spacing:.06em;text-transform:uppercase}
  .live .fot{border-top:3px solid #080B0D;color:#3A2E0B}.live .fot .lock{color:#080B0D}.live .fot .u{color:#3A2E0B}
</style></head><body class="${live ? "live" : ""}">
  <div class="meta"><span><span class="prick"></span>${live ? "Live · " : ""}${esc(h.etikett)}</span></div>
  ${live ? (h.ikon === "frys" ? FRYS : HALKA) : ""}
  <h1>${esc(h.rubrik)}</h1>
  <p class="under">${esc(forst(h.underrad))}</p>
  ${varning}${lyft}
  ${rader ? (live ? `<div class="rader">${rader}</div>` : `<div class="panel">${rader}</div>`) : ""}
  ${fler ? `<p class="fler">+ ${fler} län till</p>` : ""}
  ${staplar}
  <div class="fot"><span class="lock"><svg width="40.5" height="35.8" viewBox="3 3 94 83"><path fill-rule="evenodd" fill="${ink}" d="${MARKE}"/></svg>HALKVAKT</span>
    <span class="h"><span>KÄLLA ${esc(kalla.toUpperCase())}</span><span class="u">halkvakt.se/lan</span></span></div>
</body></html>`;
}

// ---------- Stegen ----------

const dir = join(HERE, "inlagg");
const postatPath = join(HERE, "postat.json");
const historikPath = join(HERE, "live-historik.json");
const lasJson = (p, annars) => existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : annars;

// Namnet på inläggets filer: larmen får klockslaget, eftersom flera larm kan komma samma dag.
const filnamn = (nu, larm) => larm ? `${dag(nu)}-live-${tid(nu).replace(":", "")}` : `${dag(nu)}-${pass(nu)}`;
// Steget efter läser namnet ur GITHUB_OUTPUT (HV_NAMN), så att det postar exakt den bild som ritades.
const utdata = (nyckel, varde) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${nyckel}=${varde}\n`); };

async function bild(larm, bara_koll) {
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
  const h = valjHandelse(nu, lan, meta, historik, postat, larm);
  // Historiken är en ögonblicksbild per dagslägespass; larmkollen var 30:e minut skriver ingen (den skulle bli 48 om dygnet).
  if (!larm) writeFileSync(historikPath, JSON.stringify(lagg(historik, nu, lan)) + "\n");

  utdata("har", h ? "ja" : "nej");
  if (!h) return console.log(`${larm ? "larm" : pass(nu)} ${dag(nu)}: inget inlägg (${sparr(postat, nu, larm) ?? "ingen händelse"}).`);
  if (bara_koll) return console.log(`Larm att posta: ${h.typ} (${h.nyckel}).`);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.HV_CHROMIUM ? { executablePath: process.env.HV_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html(h), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dir, { recursive: true });
  const namn = filnamn(nu, larm);
  utdata("namn", namn);
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

// Instagram bearbetar bilden efter att behållaren skapats; publiceras den för tidigt svarar Meta 9007 "media not ready"
// (larmet 17/10 19:37). Vänta tills behållaren är FINISHED, högst en minut.
async function vantaPaIg(id, token) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${token}`).then(r => r.json());
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") throw new Error(`Instagram-behållaren ${id}: ${r.status_code}`);
    await new Promise(ok => setTimeout(ok, 3000));
  }
  throw new Error(`Instagram-behållaren ${id} blev inte klar på en minut`);
}

// ---------- X (DECISIONS #645) ----------
// X charges per post, and a post with a link costs about thirteen times one without, so the X text carries no address:
// the Instagram text up to its link line, cut by whole lines to fit 280 characters, and a short tail.
const X_MAX = 280;
export function textX(textIg) {
  const rader = textIg.split("\n"), slut = rader.indexOf(LANK.instagram);
  const kalla = textIg.match(/Siffrorna kommer från (.+)\./)?.[1] ?? "Trafikverkets öppna data";
  const svansX = `\n\nOberoende, inte en del av Trafikverket. Siffrorna från ${kalla}. Appen och ditt län: länk i profilen.\n\n#halka #halkvakt`;
  const kropp = [];
  for (const r of rader.slice(0, slut < 0 ? rader.length : slut)) {
    if ([...[...kropp, r].join("\n").trim() + svansX].length > X_MAX) break;
    kropp.push(r);
  }
  return kropp.join("\n").trim() + svansX;
}

// OAuth 1.0a user context (the four keys from the X console). A JSON body is not part of the signature.
const pct = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
export function signatur(method, url, params, consumerSecret, tokenSecret) {
  const bas = [method, pct(url), pct(Object.keys(params).sort().map(n => `${pct(n)}=${pct(params[n])}`).join("&"))].join("&");
  return createHmac("sha1", `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(bas).digest("base64");
}
function oauth(method, url, k) {
  const p = {
    oauth_consumer_key: k.X_API_KEY, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: k.X_ACCESS_TOKEN, oauth_version: "1.0",
  };
  p.oauth_signature = signatur(method, url, p, k.X_API_SECRET, k.X_ACCESS_SECRET);
  return "OAuth " + Object.keys(p).sort().map(n => `${pct(n)}="${pct(p[n])}"`).join(", ");
}
async function xApi(url, body, k) {
  const r = await fetch(url, { method: "POST", headers: { Authorization: oauth("POST", url, k), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const svar = await r.json().catch(() => ({}));
  if (!r.ok || !svar.data) throw new Error(`${url}: ${r.status} ${JSON.stringify(svar)}`);
  return svar.data;
}
async function postaX(jpg, text, k) {
  const media = await xApi("https://api.x.com/2/media/upload", { media: readFileSync(jpg).toString("base64"), media_category: "tweet_image" }, k);
  const ut = await xApi("https://api.x.com/2/tweets", { text, media: { media_ids: [media.id] } }, k);
  console.log(`X: ${ut.id}`);
  return ut.id;
}

async function postaIg(ig, url, caption, token) {
  const media = await graph(`${ig}/media`, { image_url: url, caption, access_token: token });
  await vantaPaIg(media.id, token);
  const ut = await graph(`${ig}/media_publish`, { creation_id: media.id, access_token: token });
  console.log(`Instagram: ${ut.id}`);
  return ut.id;
}

// Ta igen Instagram för ett inlägg som nådde Facebook men inte Instagram (larmet 17/10 19:37). Facebook rörs inte.
async function ikapp() {
  const namn = process.env.HV_NAMN;
  const postat = lasJson(postatPath, {});
  const kvitton = allaInlagg(postat).filter(p => p.namn === namn);
  const huvud = kvitton.find(p => !p.kopia);
  if (!huvud?.facebook) throw new Error(`Inget Facebook-kvitto för ${namn}; ikapp tar bara igen Instagram.`);
  if (huvud.instagram) return console.log(`${namn} finns redan på Instagram: ${huvud.instagram}.`);
  const { META_PAGE_TOKEN: token, META_IG_ID: ig } = process.env;
  if (!token || !ig) return console.log(`TORRKÖRNING (META_PAGE_TOKEN/META_IG_ID saknas). Skulle posta ${huvud.bild} på Instagram.`);
  const inlagg = JSON.parse(readFileSync(join(dir, `${namn}.json`), "utf8"));
  const id = await postaIg(ig, huvud.bild, inlagg.textIg ?? inlagg.text, token);
  for (const k of kvitton) k.instagram = id;
  writeFileSync(postatPath, JSON.stringify(postat, null, 2) + "\n");
}

async function skicka() {
  const nu = process.env.HV_NU || new Date().toISOString();
  const postat = lasJson(postatPath, {});
  const namn = process.env.HV_NAMN || filnamn(nu, false);
  const fil = join(dir, `${namn}.json`);
  if (!existsSync(fil)) return console.log(`Inget inlägg ${namn}.`);
  const inlagg = JSON.parse(readFileSync(fil, "utf8"));
  const larm = inlagg.pass === "live";
  if (inlaggIdag(postat, nu).some(p => p.namn ? p.namn === namn : !larm && p.pass === inlagg.pass)) return console.log(`Redan postat ${namn}.`);
  const stopp = sparr(postat, nu, larm);
  if (stopp) return console.log(`Postar inte ${namn}: ${stopp}.`);
  const url = `${RAW}/${namn}.jpg`;
  const { META_PAGE_ID: page, META_PAGE_TOKEN: token, META_IG_ID: ig } = process.env;
  if (!page || !token) return console.log(`TORRKÖRNING (META_PAGE_ID/META_PAGE_TOKEN saknas). Skulle posta ${url}:\n\n${inlagg.text}`);

  const kvitto = { pass: inlagg.pass, namn, typ: inlagg.typ, nyckel: inlagg.nyckel, tid: new Date().toISOString(), bild: url };
  const fb = await graph(`${page}/photos`, { url, caption: inlagg.text, access_token: token });
  kvitto.facebook = fb.post_id ?? fb.id;
  console.log(`Facebook: ${kvitto.facebook}`);
  // Kvittot skrivs så fort Facebook har inlägget: faller Instagram sedan får nästa körning inte posta Facebook en gång till.
  const spara = () => {
    // Ett inlägg om flera läns första gång spärrar alla de länen, inte bara det första.
    const kvitton = (inlagg.alla ?? [inlagg.nyckel]).map((nyckel, i) => i ? { ...kvitto, nyckel, kopia: true } : kvitto);
    postat[dag(nu)] = [...inlaggIdag(postat, nu), ...kvitton];
    writeFileSync(postatPath, JSON.stringify(postat, null, 2) + "\n");
  };
  const x = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"].every(n => process.env[n]);
  try {
    if (ig) kvitto.instagram = await postaIg(ig, url, inlagg.textIg ?? inlagg.text, token);
    if (x) kvitto.x = await postaX(join(dir, `${namn}.jpg`), textX(inlagg.textIg ?? inlagg.text), process.env);
  } finally {
    spara();
  }
}

const steg = process.argv[2], larm = process.argv.includes("--live");
if (steg === "bild") await bild(larm, false);
else if (steg === "koll") await bild(true, true);
else if (steg === "skicka") await skicka();
else if (steg === "ikapp") await ikapp();
else if (steg) { console.error(`Okänt steg "${steg}" — använd bild [--live], koll, skicka eller ikapp.`); process.exit(1); }
