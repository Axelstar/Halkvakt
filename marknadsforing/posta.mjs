// Halkvakt live — morgoninlägget till Facebook-sidan och Instagram (kort #281, Axels order 16/10).
// Körs i marknadsforing.yml efter generatorn, i två steg:
//   node marknadsforing/posta.mjs bild    → inlagg/DATUM.jpg + inlagg/DATUM.json (bara om det är halt i morse)
//   node marknadsforing/posta.mjs skicka  → postar bilden och texten (bilden måste vara pushad: Meta hämtar den via raw-URL)
// Utan META_PAGE_ID/META_PAGE_TOKEN/META_IG_ID är "skicka" en torrkörning: texten skrivs ut, inget postas.
// Ett inlägg per dygn; postat.json minns vilka dagar som gått ut.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = process.env.HV_LAN_URL ?? "https://halkvakt.se/data/lan.json";
const RAW = "https://raw.githubusercontent.com/Axelstar/halkvakt/main/marknadsforing/inlagg";
const GRAPH = "https://graph.facebook.com/v23.0";

// Ett län tas med när Trafikverket rapporterar halka på minst ett vägavsnitt eller minst tre
// stationer visar vägbana på 0 °C eller kallare. Ett inlägg går bara ut när något län tas med.
const MIN_HALT = 1, MIN_KALLA = 3, MAX_LAN = 5;

const steg = process.argv[2];
const idag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
const dir = join(HERE, "inlagg");
const postatPath = join(HERE, "postat.json");
const postat = existsSync(postatPath) ? JSON.parse(readFileSync(postatPath, "utf8")) : {};

const minus = n => n.toFixed(1).replace(".", ",").replace("-", "−");
const tid = iso => new Date(iso).toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
const datumText = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long" });

export function valjLan(lan) {
  return lan
    .filter(l => l.halt >= MIN_HALT || l.kalla >= MIN_KALLA)
    .sort((a, b) => b.halt - a.halt || b.kalla - a.kalla);
}

export function rubrik(iso) {
  const h = Number(new Date(iso).toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit" }));
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

export function bildtext(alla, generatedAt) {
  const valda = alla.slice(0, MAX_LAN), fler = alla.length - valda.length;
  const taggar = ["#halka", "#väglag", ...valda.map(l => "#" + l.kort.replace(/s? län$/, "").replace(/\s+/g, ""))];
  return [
    `Halkläget kl. ${tid(generatedAt)}, ${datumText}.`,
    "",
    ...valda.map(rad),
    ...(fler ? [`Halka eller minusgrader även i ${fler} län till.`] : []),
    "",
    "Läget i ditt län uppdateras var 30:e minut: halkvakt.se/lan",
    "Halkvakt säger till med rösten innan det blir halt. Gratis för iPhone.",
    "",
    "Källa: Trafikverkets öppna data.",
    "",
    [...new Set(taggar)].join(" "),
  ].join("\n");
}

function html(alla, generatedAt) {
  const valda = alla.slice(0, MAX_LAN), fler = alla.length - valda.length;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rader = valda.map(l => `
    <div class="lan">
      <div class="namn">${esc(l.kort)}</div>
      <div class="tal"><b class="${l.halt ? "varm" : ""}">${l.halt}</b><span>av ${l.vagavsnitt} vägavsnitt<br>med halka</span></div>
      <div class="tal"><b class="${l.kalla ? "varm" : ""}">${l.kalla}</b><span>stationer<br>under noll</span></div>
      <div class="tal"><b>${l.kallast ? minus(l.kallast.yta) + "°" : "över 0"}</b><span>${l.kallast ? esc(l.kallast.namn) + "<br>kallast" : "alla<br>stationer"}</span></div>
    </div>`).join("");
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
  .tal b{display:block;font:600 52px/1 var(--mono)}.tal b.varm{color:var(--gul)}
  .tal span{display:block;font:400 20px/1.3 var(--sans);color:var(--text2);margin-top:8px}
  .fler{font:500 26px var(--mono);color:var(--text2);margin-top:22px}
  .fot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font:500 26px var(--mono);color:var(--dampad);letter-spacing:.04em}
  .fot b{color:var(--text);font-weight:600;font-size:32px;letter-spacing:.06em}
</style></head><body>
  <p class="etikett"><svg viewBox="3 3 94 83"><path fill-rule="evenodd" fill="#FFC94A" d="M55.196 6 L96.196 77 A6 6 0 0 1 91 86 L9 86 A6 6 0 0 1 3.804 77 L44.804 6 A6 6 0 0 1 55.196 6 Z M46.4 32 L53.6 32 L52 58 L48 58 Z M45.6 68 A4.4 4.4 0 1 0 54.4 68 A4.4 4.4 0 1 0 45.6 68 Z"/></svg><b>Halkvakt</b>Halkläget kl. ${tid(generatedAt)}</p>
  <h1>${rubrik(generatedAt)}</h1>
  <p class="datum">${esc(datumText)}</p>
  <div class="lista">${rader}</div>
  ${fler ? `<p class="fler">+ ${fler} län till</p>` : ""}
  <div class="fot"><span>Källa: Trafikverkets öppna data</span><b>halkvakt.se/lan</b></div>
</body></html>`;
}

async function bild() {
  if (postat[idag]) return console.log(`Redan postat ${idag}.`);
  const d = await (await fetch(DATA, { cache: "no-store" })).json();
  const alder = (Date.now() - Date.parse(d.generated_at)) / 36e5;
  if (alder > 2) throw new Error(`lan.json är ${alder.toFixed(1)} h gammal (${d.generated_at}) — postar inte på gammal data`);
  const valda = valjLan(d.lan);
  if (!valda.length) return console.log(`Ingen halka i morse (${d.generated_at}) — inget inlägg.`);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.HV_CHROMIUM ? { executablePath: process.env.HV_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html(valda, d.generated_at), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${idag}.jpg`), type: "jpeg", quality: 90 });
  await browser.close();

  const text = bildtext(valda, d.generated_at);
  writeFileSync(join(dir, `${idag}.json`), JSON.stringify({ datum: idag, generated_at: d.generated_at, lan: valda.map(l => l.slug), text }, null, 2) + "\n");
  console.log(`Inlägg ${idag}: ${valda.map(l => l.kort).join(", ")}\n\n${text}`);
}

async function graph(path, params) {
  const r = await fetch(`${GRAPH}/${path}`, { method: "POST", body: new URLSearchParams(params) });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(`${path}: ${r.status} ${JSON.stringify(body)}`);
  return body;
}

async function skicka() {
  const fil = join(dir, `${idag}.json`);
  if (postat[idag] || !existsSync(fil)) return console.log(postat[idag] ? `Redan postat ${idag}.` : "Inget inlägg i dag.");
  const { text } = JSON.parse(readFileSync(fil, "utf8"));
  const url = `${RAW}/${idag}.jpg`;
  const { META_PAGE_ID: page, META_PAGE_TOKEN: token, META_IG_ID: ig } = process.env;
  if (!page || !token) return console.log(`TORRKÖRNING (META_PAGE_ID/META_PAGE_TOKEN saknas). Skulle posta ${url}:\n\n${text}`);

  const kvitto = { tid: new Date().toISOString(), bild: url };
  const fb = await graph(`${page}/photos`, { url, caption: text, access_token: token });
  kvitto.facebook = fb.post_id ?? fb.id;
  console.log(`Facebook: ${kvitto.facebook}`);
  if (ig) {
    const media = await graph(`${ig}/media`, { image_url: url, caption: text, access_token: token });
    const ut = await graph(`${ig}/media_publish`, { creation_id: media.id, access_token: token });
    kvitto.instagram = ut.id;
    console.log(`Instagram: ${ut.id}`);
  }
  postat[idag] = kvitto;
  writeFileSync(postatPath, JSON.stringify(postat, null, 2) + "\n");
}

if (steg === "bild") await bild();
else if (steg === "skicka") await skicka();
else if (steg) { console.error(`Okänt steg "${steg}" — använd bild eller skicka.`); process.exit(1); }
