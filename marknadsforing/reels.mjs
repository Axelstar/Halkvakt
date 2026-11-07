// Reels (DECISIONS #780, #806, kort #281): two reels a day to Instagram and the Facebook page, nothing else. Evening 20:50 (winter
// time) rotates between the films below; morning 06:45 is the morning cut. The slot follows the clock in Stockholm. The data decides
// which films are allowed, and the rotation gives each the same number of turns so we learn which one people watch.
//   python3 marknadsforing/reels/data.py      tonight's picture -> reels-ut/nat.js + sammanfattning.json
//   node marknadsforing/reels.mjs rendera      chooses the type, films reel.html frame by frame, writes reels-ut/reel.mp4 + texts
//   node marknadsforing/reels.mjs posta        only when the slot is live: uploads to Instagram and Facebook, books it in the history
//   node marknadsforing/reels.mjs matt         reach, views, watch time, shares and saves for reels older than 24 h
// The evening is live since 4/11 (REELS_SKARPT=nej stops it); the morning is a dry run until REELS_MORGON_SKARPT=ja. A dry run
// leaves the film and the texts as an artifact.
import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, execFileSync } from "node:child_process";

const HAR = dirname(fileURLToPath(import.meta.url));
const UT = join(HAR, "reels-ut");
const HISTORIK = join(HAR, "reels-historik.json");
// A film picked by hand for one evening ({dag, typ}); it wins over the rotation that day if the data allows it.
const VALD = join(HAR, "reels-vald.json");
const GRAPH = "https://graph.facebook.com/v23.0";
const TZ = "Europe/Stockholm";
const FPS = 30;
const MAX_ALDER_H = 2;

// Length in seconds, as in ljud.py. frost, kallast and e4 are left out of the rotation (Axel 6/11) but can still be picked by hand.
export const TYPER = { du: 14, nu: 14, plus: 14, gissa: 14, pendling: 14, stad: 14, halt: 14, natt: 16, frost: 14, kallast: 14, e4: 14 };
// Each slot's rotation. Order is the tie-break when counts are equal. In the evening plus runs odd weeks and gissa even weeks.
export const PLATS = { kvall: ["du", "plus", "gissa", "pendling", "stad", "halt", "natt"], morgon: ["nu", "plus"] };

const tid = iso => new Date(iso).toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dag = iso => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const grad = x => (x < 0 ? "−" : "+") + Math.abs(x).toFixed(1).replace(".", ",") + " °C";
const kort = l => l.replace(/s? län$/, "");
const lista = a => (a.length > 1 ? `${a.slice(0, -1).join(", ")} och ${a.at(-1)}` : a[0] ?? "");
export const plats = (d = new Date()) => (+d.toLocaleTimeString("sv-SE", { timeZone: TZ, hour: "2-digit" }) < 12 ? "morgon" : "kvall");
export function vecka(isoDag) {   // ISO week number of a yyyy-mm-dd day
  const d = new Date(isoDag + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
}

// What each film needs to say something true. A film without its data is not made.
export function behorig(sam) {
  return {
    halt: sam.vagar >= 1,
    natt: sam.vagar >= 1,
    frost: sam.under >= 3 && sam.iso >= 1 && !!sam.front,
    kallast: sam.under >= 5 && sam.top.length >= 3,
    e4: sam.e4.risk >= 1 || !!sam.e4.forstaKall,
    du: sam.vagar >= 1,
    nu: sam.vagar >= 1,
    plus: sam.plusMinus >= 5 && !!sam.plus,
    gissa: sam.plusMinus >= 5 && !!sam.gissa,
    pendling: !!sam.pendling && sam.pendling.under >= 1,
    stad: sam.stader.minus.length >= 1 && sam.stader.minus.length < sam.stader.antal,
  };
}

// Equal turns first: the allowed type with the fewest reels so far in this slot and mode (dry runs and real posts are counted
// apart), and never the same type twice in a row in the slot when another one is allowed.
export function valjTyp(sam, historik, skarpt, plats = "kvall", isoDag = dag(sam.gen)) {
  const ok = behorig(sam), jamn = vecka(isoDag) % 2 === 0;
  const mojliga = PLATS[plats].filter(t => ok[t] && !(plats === "kvall" && t === (jamn ? "plus" : "gissa")));
  if (!mojliga.length) return null;
  const egna = historik.filter(h => !h.torr === skarpt && (h.plats ?? "kvall") === plats), sist = egna.at(-1)?.typ;
  const antal = t => egna.filter(h => h.typ === t).length;
  const urval = mojliga.length > 1 ? mojliga.filter(t => t !== sist) : mojliga;
  return urval.reduce((a, b) => (antal(b) < antal(a) ? b : a));
}

const LANK = {
  facebook: "Läget i ditt län uppdateras var 30:e minut: https://halkvakt.se/lan",
  instagram: "Läget i ditt län uppdateras var 30:e minut: halkvakt.se/lan (länken finns i vår profil).",
};
const APP = {
  facebook: "Halkvakt säger till med rösten innan det blir halt. Gratis för iPhone: https://apps.apple.com/se/app/halkvakt/id6806939784?ct=reels",
  instagram: "Halkvakt säger till med rösten innan det blir halt. Gratis för iPhone, länken finns i vår profil.",
};

// Trafikverket's words, never stronger: "halka" only where they say it, otherwise "risk för halka".
function ordText(o) {
  const delar = [o["Halka"] && `${o["Halka"]} med halka`, o["Fläckvis is"] && `${o["Fläckvis is"]} med fläckvis is`,
    o["Risk för halka"] && `${o["Risk för halka"]} med risk för halka`].filter(Boolean);
  return delar.length > 1 ? `${delar.slice(0, -1).join(", ")} och ${delar.at(-1)}` : delar[0] ?? "";
}

export function bildtext(typ, sam, kanal = "instagram") {
  const kl = tid(sam.gen), lanen = sam.lan.slice(0, 3).map(l => kort(l.kort));
  const KV = plats(new Date(sam.gen)) === "morgon" ? "i morse" : "i kväll", P = sam.pendling, S = sam.stader;
  const regioner = () => sam.regioner.map(r => `${r.namn}: ${r.halt ? `${r.halt} vägavsnitt med halkrisk` : "inga rapporter om halka"}.`).join("\n");
  const forsta = {
    du: ["Ska du köra i morgon bitti?", `Så ser vägarna ut ${KV} enligt Trafikverket kl. ${kl}:`, regioner()],
    nu: ["Ska du köra nu?", `Så ser vägarna ut just nu enligt Trafikverket kl. ${kl}:`, regioner()],
    plus: ["Bilen säger plus. Vägen säger minus.", sam.plus && `${sam.plus.n} ${KV} kl. ${kl}: luften ${grad(sam.plus.luft)}, vägbanan ${grad(sam.plus.yta)}.`,
      `${sam.plusMinus} av Trafikverkets mätstationer visade plus i luften och minus på vägbanan. Bilens termometer mäter luften. Halkvakt läser vägbanan.`],
    gissa: [sam.gissa && `Luften vid ${sam.gissa.n} ${KV} kl. ${kl}: ${grad(sam.gissa.luft)}. Vad visar vägbanan?`,
      "Svaret finns i filmen. Bilens termometer mäter luften. Halkvakt läser vägbanan."],
    pendling: [P && `Pendlar du mellan ${P.fran} och ${P.till}?`,
      P && `${KV === "i morse" ? "I morse" : "I kväll"} kl. ${kl} visade ${P.under} av ${P.stationer} mätstationer längs vägen minusgrader på vägbanan.`],
    stad: ["Har frosten nått din stad?", `Minus på vägbanan ${KV} kl. ${kl} vid närmaste mätstation i ${lista(S.minus)}.`,
      `${S.antal - S.minus.length} av ${S.antal} städer hade fortfarande plus.`],
    halt: [`Var är det halt i kväll? Kl. ${kl} rapporterade Trafikverket ${sam.vagar} vägavsnitt: ${ordText(sam.ord)}.`,
      lanen.length && `Flest i ${lanen.length > 1 ? `${lanen.slice(0, -1).join(", ")} och ${lanen.at(-1)}` : lanen[0]}.`],
    natt: [`Sverige i kväll kl. ${kl}. ${sam.under} av ${sam.stationer} mätstationer längs vägarna visade minusgrader på vägbanan.`,
      sam.vagar && `${sam.vagar} vägavsnitt med halkrisk enligt Trafikverket${lanen[0] ? `, flest i ${lanen[0]}` : ""}.`],
    frost: [`Här går nollgradersgränsen på vägbanan i kväll kl. ${kl}.`,
      sam.front && `Längst söderut under noll: ${sam.front.n}, ${grad(sam.front.yta)}. ${sam.under} av ${sam.stationer} stationer under noll.`],
    kallast: [`Kallast på vägbanan i kväll kl. ${kl}:`, sam.top.slice(0, 3).map((s, i) => `${i + 1}. ${s.n}, ${grad(s.yta)}`).join("\n")],
    e4: [`E4 från Helsingborg till Haparanda i kväll kl. ${kl}.`,
      [sam.e4.risk ? `${sam.e4.risk} avsnitt med halkrisk enligt Trafikverket.` : "Inga avsnitt med halkrisk enligt Trafikverket.",
        sam.e4.forstaKall && `Första minusgraden från söder: ${sam.e4.forstaKall}.`].filter(Boolean).join(" ")],
  }[typ].filter(Boolean);
  const taggar = ["#halka", "#väglag", ...(typ === "e4" ? ["#E4"] : []), "#halkvakt"];
  return [...forsta, "", LANK[kanal], APP[kanal], "",
    "Halkvakt är en oberoende app och sajt, inte en del av Trafikverket. Siffrorna kommer från Trafikverkets öppna data.", "",
    taggar.join(" ")].join("\n");
}

const lasHistorik = () => (existsSync(HISTORIK) ? JSON.parse(readFileSync(HISTORIK, "utf8")) : []);
const sparaHistorik = h => writeFileSync(HISTORIK, JSON.stringify(h, null, 1) + "\n");
const skarpt = (p = plats()) => (p === "morgon" ? process.env.REELS_MORGON_SKARPT : process.env.REELS_SKARPT) === "ja";
const sammanfattning = msg => { console.log(msg); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + "\n\n"); };

function kor(cmd, args) { execFileSync(cmd, args, { stdio: "inherit" }); }

async function filma(typ, ut) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.HV_CHROMIUM ? { executablePath: process.env.HV_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(HAR, "reels", "reel.html")).href + `?mode=${typ}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.seek(0));
  const tyst = join(UT, "tyst.mp4");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", tyst], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0, n = TYPER[typ] * FPS; i < n; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    if (!ff.stdin.write(await page.screenshot({ type: "jpeg", quality: 92 }))) await new Promise(r => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  const kod = await new Promise(r => ff.on("close", r));
  await browser.close();
  if (kod !== 0) throw new Error(`ffmpeg föll med ${kod}`);
  const wav = join(UT, "ljud.wav");
  kor("python3", [join(HAR, "reels", "ljud.py"), typ, wav]);
  kor("ffmpeg", ["-y", "-loglevel", "error", "-i", tyst, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    "-movflags", "+faststart", ut + ".part.mp4"]);
  renameSync(ut + ".part.mp4", ut);
}

const handval = (idag, sam, p) => {
  const v = existsSync(VALD) ? JSON.parse(readFileSync(VALD, "utf8")) : null;
  return v?.dag === idag && (v.plats ?? "kvall") === p && behorig(sam)[v.typ] ? v.typ : null;
};

async function rendera() {
  const sam = JSON.parse(readFileSync(join(UT, "sammanfattning.json"), "utf8"));
  const alder = (Date.now() - new Date(sam.gen)) / 36e5;
  const p = plats(), val = { dag: dag(new Date().toISOString()), plats: p, gen: sam.gen, torr: !skarpt(p), typ: null };
  if (alder > MAX_ALDER_H) val.skal = `Datan är ${alder.toFixed(1)} timmar gammal (gränsen är ${MAX_ALDER_H}). Ingen reel.`;
  else {
    const historik = lasHistorik();
    if (historik.some(h => h.dag === val.dag && (h.plats ?? "kvall") === p && !h.torr === skarpt(p))) val.skal = `Reeln för ${p} är redan gjord (${val.dag}).`;
    else if (handval(val.dag, sam, p)) val.typ = handval(val.dag, sam, p);
    else if (!(val.typ = valjTyp(sam, historik, skarpt(p), p, val.dag))) val.skal = "Ingen av filmerna har något sant att visa. Ingen reel.";
  }
  writeFileSync(join(UT, "val.json"), JSON.stringify(val, null, 1) + "\n");
  if (!val.typ) return sammanfattning(`### Reels\n\n${val.skal}`);
  await filma(val.typ, join(UT, "reel.mp4"));
  for (const k of ["instagram", "facebook"]) writeFileSync(join(UT, `text-${k}.txt`), bildtext(val.typ, sam, k) + "\n");
  sammanfattning(`### Reels ${val.dag} ${p}: ${val.typ}${val.torr ? " (torrkörning, inget postat)" : ""}\n\nData kl. ${tid(sam.gen)}. ` +
    `Filmen och texterna ligger i artefakten *reel*.\n\n**Instagram**\n\n\`\`\`\n${bildtext(val.typ, sam, "instagram")}\n\`\`\``);
}

async function api(path, params = {}, method = "POST") {
  const url = `${GRAPH}/${path}`, body = new URLSearchParams(params);
  const r = method === "GET" ? await fetch(`${url}?${body}`) : await fetch(url, { method, body });
  const svar = await r.json();
  if (!r.ok || svar.error) throw new Error(`${path}: ${r.status} ${JSON.stringify(svar)}`);
  return svar;
}

async function skickaFil(uploadUrl, token, buf) {
  const r = await fetch(uploadUrl, { method: "POST", body: buf,
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(buf.length) } });
  const svar = await r.json().catch(() => ({}));
  if (!r.ok || svar.success === false) throw new Error(`Uppladdningen ${uploadUrl}: ${r.status} ${JSON.stringify(svar)}`);
}

async function instagram(ig, token, buf, caption) {
  const beh = await api(`${ig}/media`, { media_type: "REELS", upload_type: "resumable", share_to_feed: "true", caption, access_token: token });
  await skickaFil(beh.uri, token, buf);
  for (let i = 0; i < 60; i++) {   // video takes longer than a picture: up to five minutes
    const s = await api(beh.id, { fields: "status_code", access_token: token }, "GET");
    if (s.status_code === "FINISHED") return (await api(`${ig}/media_publish`, { creation_id: beh.id, access_token: token })).id;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram-behållaren ${beh.id}: ${s.status_code}`);
    await new Promise(ok => setTimeout(ok, 5000));
  }
  throw new Error(`Instagram-behållaren ${beh.id} blev inte klar på fem minuter`);
}

async function facebook(page, token, buf, description) {
  const start = await api(`${page}/video_reels`, { upload_phase: "start", access_token: token });
  await skickaFil(start.upload_url, token, buf);
  await api(`${page}/video_reels`, { upload_phase: "finish", video_id: start.video_id, video_state: "PUBLISHED", description, access_token: token });
  return start.video_id;
}

async function posta() {
  const val = JSON.parse(readFileSync(join(UT, "val.json"), "utf8"));
  if (!val.typ) return console.log("Ingen reel i kväll.");
  const historik = lasHistorik(), post = { dag: val.dag, plats: val.plats, typ: val.typ, gen: val.gen, torr: val.torr };
  const { META_PAGE_ID: page, META_PAGE_TOKEN: token, META_IG_ID: ig } = process.env;
  if (val.torr || !page || !token || !ig) {
    historik.push({ ...post, torr: true }); sparaHistorik(historik);
    return sammanfattning(`Torrkörning: ${val.typ} bokförd i historiken, inget postat.`);
  }
  const buf = readFileSync(join(UT, "reel.mp4")), fel = [];
  try { post.ig = await instagram(ig, token, buf, readFileSync(join(UT, "text-instagram.txt"), "utf8").trim()); } catch (e) { fel.push(e.message); }
  try { post.fb = await facebook(page, token, buf, readFileSync(join(UT, "text-facebook.txt"), "utf8").trim()); } catch (e) { fel.push(e.message); }
  post.tid = new Date().toISOString();
  if (post.ig || post.fb) { historik.push(post); sparaHistorik(historik); }   // the receipt is kept even if one channel fell
  sammanfattning(`Postat ${val.typ}: Instagram ${post.ig ?? "föll"}, Facebook ${post.fb ?? "föll"}.`);
  if (fel.length) throw new Error(fel.join("\n"));
}

// After a day the numbers have settled enough to compare the types. Fetched once per reel, by the next evening's run:
// 20 h and not 24, because that run starts about 24 h after the post and would otherwise miss it by seconds.
async function matt() {
  const token = process.env.META_PAGE_TOKEN, historik = lasHistorik();
  if (!token) return console.log("META_PAGE_TOKEN saknas, ingen mätning.");
  let n = 0;
  for (const h of historik) {
    if (h.torr || h.stats || !h.ig || Date.now() - new Date(h.tid) < 20 * 36e5) continue;
    const varden = async m => (await api(`${h.ig}/insights`, { metric: m, access_token: token }, "GET")).data;
    let data;
    try { data = await varden("reach,views,saved,shares,ig_reels_avg_watch_time"); }
    catch { data = await varden("reach,views,saved,shares"); }
    h.stats = Object.fromEntries(data.map(d => [d.name, d.values?.[0]?.value ?? d.total_value?.value ?? null]));
    h.matt = new Date().toISOString(); n++;
  }
  sparaHistorik(historik);
  const per = {};
  for (const h of historik.filter(h => h.stats)) (per[h.typ] ??= []).push(h.stats);
  const rad = t => { const s = per[t] ?? [], m = k => s.length ? Math.round(s.reduce((a, x) => a + (x[k] ?? 0), 0) / s.length) : "-";
    return `| ${t} | ${s.length} | ${m("reach")} | ${m("views")} | ${m("ig_reels_avg_watch_time")} | ${m("shares")} | ${m("saved")} |`; };
  sammanfattning(`### Reels per typ (${n} nya mätningar)\n\n| typ | reels | räckvidd | visningar | snittid ms | delningar | sparade |\n|---|---|---|---|---|---|---|\n` +
    Object.keys(TYPER).map(rad).join("\n"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const steg = { rendera, posta, matt }[process.argv[2]];
  if (!steg) { console.error("Använd: rendera | posta | matt"); process.exit(2); }
  await steg();
}
