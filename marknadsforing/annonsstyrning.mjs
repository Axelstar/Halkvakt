// Annonsstyrningen — Meta-kampanjen där varje län får en annons med morgonens riktiga läge (DECISIONS #735).
//   node marknadsforing/annonsstyrning.mjs uppsattning → skapar kampanjen, en annonsuppsättning per län och länets reservannons,
//                                                        allt PAUSAT. Körs en gång. Rör aldrig något som redan finns.
//   node marknadsforing/annonsstyrning.mjs styr        → morgonens körning (meta-annonser.yml, 03:01, 05:31 och 07:01 svensk vintertid):
//        län med halka: dagens annons ritas ur mallen och läggs upp en gång per dygn, gårdagens pausas, uppsättningen slås på;
//        reservannonsen går tills dagens annons är granskad och godkänd av Meta. Län utan halka: uppsättningen pausas.
//        lan.json äldre än två timmar: allt pausas — hellre tyst än en annons med gammal halka.
// Utan META_ADS_TOKEN är båda en torrkörning: bilderna ritas till marknadsforing/meta-ut/, beslutet skrivs ut, inget når Meta.
// HV_NU=<ISO-tid> låter en torrkörning låtsas att klockan är en annan.
//
// Kampanjens status rör skriptet aldrig: den skapas pausad och slås på av Axel i Ads Manager. Budgettaket (2 000 kr för hela
// kampanjen) sitter i kampanjen. Regeln för ett län är densamma som i Halkvakt live (posta.mjs, raknas):
// en KOPIA, eftersom posta.mjs kör sina egna steg ur argv när den importeras — kontraktsgrinden vaktar att talen följs åt.
// Bilden och texten säger aldrig mer än Trafikverkets ord: "Risk för halka" när Trafikverket säger risk, "Frysrisk" när bara
// stationerna är under noll och inget vägavsnitt rapporteras halt. Klockslaget och källan står i bild och text.
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LAN_URL = process.env.HV_LAN_URL ?? "https://halkvakt.se/data/lan.json";
const STRACKOR_URL = process.env.HV_STRACKOR_URL ?? "https://halkvakt.se/data/strackor.json";
const GRAPH = "https://graph.facebook.com/v23.0";
const KONTO = "act_1760320565448083";
const KAMPANJ = "Halkvakt · län";
const PREFIX = "Län · ";
const BUDGET_ORE = 200000;                       // 2 000 kr för hela kampanjen
const DAGAR = 30;
const APP = "https://apps.apple.com/se/app/halkvakt/id6806939784";
const MAX_ALDER_H = 2;
const MIN_HALT = 1, MIN_KALLA = 3;
const raknas = l => l.halt >= MIN_HALT || l.kalla >= MIN_KALLA;
const TZ = "Europe/Stockholm";
const MALL = join(HERE, "meta-mall", "halkvakt-meta-feed.html");
const UT = join(HERE, "meta-ut");
// Under granskning eller stoppad: reservannonsen får inte pausas än.
const EJ_GODKAND = ["PENDING_REVIEW", "IN_PROCESS", "DISAPPROVED", "WITH_ISSUES"];
// Metas namn på länen (sökningen adgeolocation, typ region). Nyckeln är lan.json:s kod.
const META_LAN = { 1: "Stockholm", 3: "Uppsala", 4: "Södermanland", 5: "Östergötland", 6: "Jönköping", 7: "Kronoberg",
  8: "Kalmar", 9: "Gotland", 10: "Blekinge", 12: "Skåne", 13: "Halland", 14: "Västra Götaland", 17: "Värmland",
  18: "Örebro", 19: "Västmanland", 20: "Dalarna", 21: "Gävleborg", 22: "Västernorrland", 23: "Jämtland",
  24: "Västerbotten", 25: "Norrbotten" };

const TOKEN = process.env.META_ADS_TOKEN;
const nu = () => new Date(process.env.HV_NU ?? Date.now());
const tid = iso => new Date(iso).toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dag = d => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const lista = ord => ord.length < 2 ? ord.join("") : ord.slice(0, -1).join(", ") + " och " + ord.at(-1);

// ---- Data → annons (rena funktioner, prövade i test/annonsstyrning.test.ts) ----

const RANG = { "Risk för halka": 1, "Fläckvis is": 2, "Halka": 3 };

/** Trafikverkets ord för en hal sträcka, aldrig starkare än texten. Okänt ⇒ det svagaste. */
export function fara(s) {
  const t = [s.text, ...(s.info ?? [])].join(" ").toLowerCase();
  if (/risk för|halkrisk/.test(t)) return "Risk för halka";
  if (/fläckvis is/.test(t)) return "Fläckvis is";
  if (/(?<![a-zåäö])(is|halka|halkig|halt|mycket besvärligt)(?![a-zåäö])/.test(t)) return "Halka";
  return "Risk för halka";
}

export const vagBild = v => v.replace(/^E\s+/, "E").toUpperCase();
export const vagText = v => v.replace(/^E\s+/, "E").replace(/^Väg/, "väg");
export const stracka = p => p.replace(/^\.\d+\s+/, "").replace(/\s+-\s+/g, "–");

/** Länets annons ur lan.json-raden och länets del av strackor.json; null när länet inte räknas. */
export function annons(l, sl, generatedAt, datum) {
  if (!raknas(l)) return null;
  const klock = tid(generatedAt);
  const coldest = l.kallast ? { station: l.kallast.namn, surfaceTemp: l.kallast.yta } : null;
  const bas = { variant: "daily", date: datum, county: l.kort, coldest, dataTime: klock };
  const hala = (sl?.vagar ?? []).flatMap(v => v.strackor.filter(s => s.halt).map(s => ({ vag: v.vag, plats: s.plats, fara: fara(s) })));
  if (l.halt < 1) {
    return {
      data: { ...bas, hazard: "Frysrisk", subtitle: `${l.kalla} stationer under noll i ${l.kort}`, roads: [] },
      text: `Vägbanan under noll vid ${l.kalla} stationer i ${l.kort}, enligt Trafikverket kl. ${klock}. ` +
            "Halkvakt säger till med rösten innan du är där. Gratis för iPhone.",
      rubrik: `Läget i ${l.kort} kl. ${klock}`,
    };
  }
  // Halt enligt lan.json men inget avsnitt med vägnummer i strackor.json: det svagaste ordet, inga vägar.
  const hazard = hala.reduce((a, s) => RANG[s.fara] > RANG[a] ? s.fara : a, "Risk för halka");
  const vagar = [];
  for (const s of [...hala].sort((a, b) => RANG[b.fara] - RANG[a.fara])) {
    if (vagar.length < 3 && !vagar.some(x => x.vag === s.vag)) vagar.push(s);
  }
  return {
    data: { ...bas, hazard, subtitle: `${l.halt} vägavsnitt i ${l.kort}`,
            roads: vagar.map(s => ({ road: vagBild(s.vag), stretch: stracka(s.plats) })) },
    text: `${hazard}${vagar.length ? " på " + lista(vagar.slice(0, 2).map(s => vagText(s.vag))) : ""} i ${l.kort}, enligt Trafikverket kl. ${klock}. ` +
          "Halkvakt säger till med rösten innan du är där. Gratis för iPhone.",
    rubrik: `Läget i ${l.kort} kl. ${klock}`,
  };
}

export const RESERV = {
  data: { variant: "evergreen" },
  text: "Halkvakt säger till med rösten när det är halt på vägen framför dig. Med Trafikverkets öppna data. Gratis för iPhone.",
  rubrik: "Halka framför dig",
};

// ---- Meta ----

async function graph(path, params = {}, method = "GET") {
  const q = new URLSearchParams({ access_token: TOKEN });
  for (const [k, v] of Object.entries(params)) q.set(k, typeof v === "string" ? v : JSON.stringify(v));
  const r = method === "GET" ? await fetch(`${GRAPH}/${path}?${q}`) : await fetch(`${GRAPH}/${path}`, { method, body: q });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}

async function alla(path, params) {
  const ut = [];
  let sida = await graph(path, { ...params, limit: "200" });
  for (;;) {
    ut.push(...sida.data);
    if (!sida.paging?.next) return ut;
    sida = await (await fetch(sida.paging.next)).json();
  }
}

let browser;
async function rita(data, namn) {
  if (!browser) {
    const { chromium } = await import("playwright");
    browser = await chromium.launch(process.env.HV_CHROMIUM ? { executablePath: process.env.HV_CHROMIUM } : {});
  }
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.addInitScript(d => { window.HALKVAKT_AD = d; }, data);
  await page.goto(pathToFileURL(MALL).href);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: 30000 });
  const jpg = await page.locator("#ad").screenshot({ type: "jpeg", quality: 92 });
  await page.close();
  mkdirSync(UT, { recursive: true });
  writeFileSync(join(UT, `${namn}.jpg`), jpg);
  return jpg;
}

async function laggUpp(a, namn, adsetId) {
  const jpg = await rita(a.data, namn);
  if (!TOKEN) return null;
  const bild = await graph(`${KONTO}/adimages`, { bytes: jpg.toString("base64") }, "POST");
  const hash = Object.values(bild.images)[0].hash;
  const kreativ = await graph(`${KONTO}/adcreatives`, {
    name: namn,
    object_story_spec: {
      page_id: process.env.META_PAGE_ID, instagram_user_id: process.env.META_IG_ID,
      link_data: { image_hash: hash, link: APP, message: a.text, name: a.rubrik,
                   call_to_action: { type: "DOWNLOAD", value: { link: APP } } },
    },
  }, "POST");
  return (await graph(`${KONTO}/ads`, { name: namn, adset_id: adsetId, creative: { creative_id: kreativ.id }, status: "ACTIVE" }, "POST")).id;
}

const rapport = [];
const skriv = rad => { console.log(rad); rapport.push(rad); };

async function hamta() {
  const [lan, str] = await Promise.all([LAN_URL, STRACKOR_URL].map(async u => (await fetch(u, { cache: "no-store" })).json()));
  return { lan, str, alder: (nu() - Date.parse(lan.generated_at)) / 36e5 };
}

async function kampanjen() {
  const k = (await alla(`${KONTO}/campaigns`, { fields: "id,name,effective_status" }))
    .filter(c => c.name === KAMPANJ && !["DELETED", "ARCHIVED"].includes(c.effective_status));
  return k[0] ?? null;
}

async function satserna(kampanjId) {
  return (await alla(`${kampanjId}/adsets`, { fields: "id,name,status,effective_status,ads.limit(50){id,name,status,effective_status}" }))
    .filter(s => s.name.startsWith(PREFIX) && !["DELETED", "ARCHIVED"].includes(s.effective_status));
}

async function uppsattning() {
  const { lan } = await hamta();
  if (!TOKEN) {
    await rita(RESERV.data, "reserv");
    skriv(`Torrkörning: skulle skapa kampanjen "${KAMPANJ}" (${BUDGET_ORE / 100} kr, ${DAGAR} dygn, pausad), ` +
          `${lan.lan.length} annonsuppsättningar och lika många reservannonser. Reservbilden ritad till meta-ut/reserv.jpg.`);
    return;
  }
  const konto = await graph(KONTO, { fields: "name,currency,timezone_name" });
  skriv(`Kontot: ${konto.name}, ${konto.currency}, ${konto.timezone_name}.`);
  if (konto.currency !== "SEK") throw new Error(`Kontot räknar i ${konto.currency}, budgeten är skriven i öre.`);
  const start = nu(), slut = new Date(start.getTime() + DAGAR * 864e5);
  let k = await kampanjen();
  if (k) skriv(`Kampanjen "${KAMPANJ}" finns redan (${k.id}).`);
  else {
    k = await graph(`${KONTO}/campaigns`, { name: KAMPANJ, objective: "OUTCOME_TRAFFIC", status: "PAUSED",
      special_ad_categories: [], lifetime_budget: String(BUDGET_ORE), bid_strategy: "LOWEST_COST_WITHOUT_CAP" }, "POST");
    skriv(`Kampanjen "${KAMPANJ}" skapad, pausad (${k.id}).`);
  }
  const finns = new Map((await satserna(k.id)).map(s => [s.name, s]));
  for (const l of lan.lan) {
    const namn = PREFIX + l.kort;
    let s = finns.get(namn);
    if (!s) {
      const traff = (await graph("search", { type: "adgeolocation", location_types: ["region"], country_code: "SE", q: META_LAN[l.kod] })).data
        .filter(r => r.country_code === "SE" && r.type === "region" && r.name.startsWith(META_LAN[l.kod]));
      if (traff.length !== 1) { skriv(`${namn}: Meta gav ${traff.length} träffar på "${META_LAN[l.kod]}", hoppas över.`); continue; }
      s = await graph(`${KONTO}/adsets`, {
        name: namn, campaign_id: k.id, status: "PAUSED",
        optimization_goal: "LINK_CLICKS", billing_event: "IMPRESSIONS", destination_type: "WEBSITE",
        start_time: start.toISOString(), end_time: slut.toISOString(),
        pacing_type: ["day_parting"],
        adset_schedule: [{ start_minute: 360, end_minute: 540, days: [0, 1, 2, 3, 4, 5, 6] },
                         { start_minute: 900, end_minute: 1080, days: [0, 1, 2, 3, 4, 5, 6] }],
        targeting: { geo_locations: { regions: [{ key: traff[0].key }], location_types: ["home", "recent"] },
                     age_min: 18, user_os: ["iOS"], device_platforms: ["mobile"], publisher_platforms: ["facebook", "instagram"],
                     targeting_automation: { advantage_audience: 1 } },
        dsa_beneficiary: "Halkvakt", dsa_payor: "Axel Lagerlöf",
      }, "POST");
      s.ads = { data: [] };
      skriv(`${namn}: skapad, pausad, regionen ${traff[0].name} (${s.id}).`);
    }
    if ((s.ads?.data ?? []).some(a => a.name.startsWith("Reserv · "))) continue;
    const id = await laggUpp(RESERV, `Reserv · ${l.kort}`, s.id);
    skriv(`${namn}: reservannonsen skapad (${id}).`);
  }
}

async function styr() {
  const { lan, str, alder } = await hamta();
  const datum = dag(nu());
  const annonser = new Map(lan.lan.map(l => [PREFIX + l.kort, annons(l, str.lan.find(x => x.kort === l.kort), lan.generated_at, datum)]));
  const gammal = alder > MAX_ALDER_H;
  if (gammal) skriv(`lan.json är ${alder.toFixed(1)} h gammal (${lan.generated_at}). Alla län pausas, ingen dagsannons.`);
  else skriv(`Län med halka kl. ${tid(lan.generated_at)}: ${[...annonser].filter(([, a]) => a).map(([n]) => n.slice(PREFIX.length)).join(", ") || "inga"}.`);

  if (!TOKEN) {
    if (!gammal) for (const [namn, a] of annonser) if (a) await rita(a.data, `Dag · ${namn.slice(PREFIX.length)} · ${datum}`);
    skriv("Torrkörning: META_ADS_TOKEN saknas. Bilderna ritade till meta-ut/, inget ändrat hos Meta.");
    return;
  }
  const k = await kampanjen();
  if (!k) { skriv(`Kampanjen "${KAMPANJ}" finns inte. Kör uppsattning först.`); return; }
  for (const s of await satserna(k.id)) {
    const a = gammal ? null : annonser.get(s.name);
    const ads = s.ads?.data ?? [];
    const satt = async (id, status) => graph(id, { status }, "POST");
    if (!annonser.has(s.name)) { skriv(`${s.name}: okänt län, lämnas orörd.`); continue; }
    if (!a) {
      if (s.status !== "PAUSED") { await satt(s.id, "PAUSED"); skriv(`${s.name}: pausad.`); }
      continue;
    }
    const lanNamn = s.name.slice(PREFIX.length);
    const idag = `Dag · ${lanNamn} · ${datum}`;
    let dagens = ads.find(x => x.name === idag);
    if (!dagens) {
      const id = await laggUpp(a, idag, s.id);
      dagens = { id, effective_status: "PENDING_REVIEW" };
      skriv(`${s.name}: ${a.data.hazard}. Dagens annons skapad (${id}), väntar på granskning.`);
    }
    for (const x of ads) {
      if (x.name.startsWith("Dag · ") && x.name !== idag && x.status !== "PAUSED") await satt(x.id, "PAUSED");
    }
    const godkand = !EJ_GODKAND.includes(dagens.effective_status);
    if (dagens.effective_status === "DISAPPROVED") skriv(`${s.name}: dagens annons AVVISAD av Meta. Reservannonsen går i stället.`);
    for (const r of ads.filter(x => x.name.startsWith("Reserv · "))) {
      const onskat = godkand ? "PAUSED" : "ACTIVE";
      if (r.status !== onskat) { await satt(r.id, onskat); skriv(`${s.name}: reservannonsen ${onskat === "ACTIVE" ? "på" : "pausad, dagens annons godkänd"}.`); }
    }
    if (s.status !== "ACTIVE") { await satt(s.id, "ACTIVE"); skriv(`${s.name}: på.`); }
  }
  const igar = (await graph(`${KONTO}/insights`, { date_preset: "yesterday", fields: "spend,impressions,clicks" })).data[0];
  const totalt = (await graph(`${KONTO}/insights`, { date_preset: "maximum", fields: "spend,clicks" })).data[0];
  skriv(`I går: ${igar?.spend ?? 0} kr, ${igar?.impressions ?? 0} visningar, ${igar?.clicks ?? 0} klick. ` +
        `Totalt: ${totalt?.spend ?? 0} av ${BUDGET_ORE / 100} kr, ${totalt?.clicks ?? 0} klick.`);
}

const steg = process.argv[2];
if (steg) {
  try {
    if (steg === "styr") await styr();
    else if (steg === "uppsattning") await uppsattning();
    else { console.error(`Okänt steg "${steg}" — använd styr eller uppsattning.`); process.exitCode = 1; }
  } finally {
    await browser?.close();
    if (process.env.GITHUB_STEP_SUMMARY && rapport.length)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Annonsstyrningen (${steg})\n\n${rapport.map(r => `- ${r}`).join("\n")}\n`);
  }
}
