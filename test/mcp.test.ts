// Halkvakts MCP-server (DECISIONS #630): protokollet, de fyra verktygen och reglerna — källa och tid i varje svar,
// inga avstånd, noll halka sägs som noll, gammal data sägs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hantera, hittaLan, vagNamn, VERKTYG } from "../supabase/functions/mcp/karna.ts";

const NU = new Date("2026-11-20T06:40:00Z");
const LAN = {
  generated_at: "2026-11-20T06:30:00Z",
  lan: [
    { kod: 17, namn: "Värmlands län", kort: "Värmland", slug: "varmland", halt: 9, vagavsnitt: 52, kalla: 14, kallast: { namn: "Vadje", yta: -4.2 }, olyckor: 1 },
    { kod: 14, namn: "Västra Götalands län", kort: "Västra Götaland", slug: "vastra-gotaland", halt: 0, vagavsnitt: 133, kalla: 0, kallast: null, olyckor: 0 },
    { kod: 12, namn: "Skåne län", kort: "Skåne", slug: "skane", halt: 0, vagavsnitt: 40, kalla: 3, kallast: { namn: "Hörby", yta: -0.6 }, olyckor: 0 },
  ],
};
const STRACKOR = {
  generated_at: "2026-11-20T06:30:00Z",
  lan: [
    { slug: "varmland", kort: "Värmland", vagar: [
      { vag: "E 18", strackor: [{ plats: "Karlstad - Kristinehamn", halt: true, text: "Halt", info: ["Is"] }, { plats: "Grums - Karlstad", halt: false, text: "Normalt", info: ["Torrt"] }], kallast: { namn: "Vadje", yta: -4.2 }, kalla: 2 },
      { vag: "Väg 26", strackor: [{ plats: "Filipstad - Storfors", halt: false, text: "Normalt", info: [] }], kallast: null, kalla: 0 },
    ] },
    { slug: "vastra-gotaland", kort: "Västra Götaland", vagar: [
      { vag: "E 18", strackor: [{ plats: "Töreboda - Hova", halt: false, text: "Normalt", info: ["Torrt"] }], kallast: null, kalla: 0 },
    ] },
  ],
};
const META = { generated_at: "2026-11-20T06:30:00Z", stationer: 1321, kalla_stationer: 167, olyckor: 3,   // räknar även Finland och Danmark
  smhi_vinter: [{ event: "Snöfall", niva: "Gul", omrade: "Värmlands län" }, { event: "Medelvind till havs", niva: "Gul", omrade: "Södra Östersjön" }] };
const VADER = { features: [
  { properties: { land: "SE", name: "Vadje", t: "2026-11-20T06:25:00Z", yta: -4.2 } },
  { properties: { land: "SE", name: "Hörby", t: "2026-11-20T06:25:00Z", yta: -0.6 } },
  { properties: { land: "SE", name: "Trasig", t: "2026-11-20T06:25:00Z", yta: -99 } },
  { properties: { land: "SE", name: "Gammal", t: "2026-11-19T20:00:00Z", yta: -12 } },
  { properties: { land: "FI", name: "Helsingfors", t: "2026-11-20T06:25:00Z", yta: -9 } },
] };
const FILER: Record<string, unknown> = { "lan.json": LAN, "strackor.json": STRACKOR, "meta.json": META, "vader.geojson": VADER };
const hamta = async (f: string) => { if (!(f in FILER)) throw new Error(f); return FILER[f]; };
const anropa = async (name: string, args: Record<string, unknown> = {}, h = hamta, nu = NU) => {
  const r = await hantera({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, h, nu) as { result: { content: { text: string }[]; isError?: boolean } };
  return { text: r.result.content[0].text, fel: !!r.result.isError };
};

test("protokollet: initialize väljer en version vi kan, tools/list har fyra läsande verktyg, notiser får inget svar, okänt ger fel", async () => {
  const init = await hantera({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, hamta, NU) as { result: { protocolVersion: string; capabilities: object } };
  assert.equal(init.result.protocolVersion, "2025-06-18");
  const okand = await hantera({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } }, hamta, NU) as { result: { protocolVersion: string } };
  assert.equal(okand.result.protocolVersion, "2025-11-25");
  const lista = await hantera({ jsonrpc: "2.0", id: 3, method: "tools/list" }, hamta, NU) as { result: { tools: typeof VERKTYG } };
  assert.deepEqual(lista.result.tools.map((t) => t.name), ["lage_i_lan", "vag", "sverige_just_nu", "kallaste_stationer"]);
  assert.ok(lista.result.tools.every((t) => t.annotations.readOnlyHint));
  assert.equal(await hantera({ jsonrpc: "2.0", method: "notifications/initialized" }, hamta, NU), null);
  assert.equal((await hantera({ jsonrpc: "2.0", id: 4, method: "resources/list" }, hamta, NU) as { error: { code: number } }).error.code, -32601);
  assert.equal((await hantera({ id: 5, method: "ping" } as never, hamta, NU) as { error: { code: number } }).error.code, -32600);
});

test("län och vägar ur fritext", () => {
  assert.equal(hittaLan("värmland", LAN.lan as never)?.slug, "varmland");
  assert.equal(hittaLan("Västra Götalands län", LAN.lan as never)?.slug, "vastra-gotaland");
  assert.equal(hittaLan("Varmlands lan", LAN.lan as never)?.slug, "varmland");
  assert.equal(hittaLan("Atlantis", LAN.lan as never), null);
  assert.equal(vagNamn("E18"), "E 18");
  assert.equal(vagNamn("e 4 norrut"), "E 4");
  assert.equal(vagNamn("riksväg 26"), "Väg 26");
  assert.equal(vagNamn("rv26"), "Väg 26");
  assert.equal(vagNamn("Kungsgatan"), null);
});

test("lage_i_lan: talen ur lan.json, tiden och källan, ingen halka sägs som ingen halka", async () => {
  const v = await anropa("lage_i_lan", { lan: "Värmland" });
  assert.ok(v.text.includes("halka eller vinterväglag på 9 av länets 52 vägavsnitt"));
  assert.ok(v.text.includes("14 vägväderstationer visar vägbana på 0 °C eller kallare, kallast −4,2 °C vid Vadje"));
  assert.ok(v.text.includes("1 olycka eller hinder pågår"));
  assert.ok(v.text.includes("Källa: Trafikverkets öppna data via Halkvakt, läget kl. 07:30") && v.text.includes("ingen prognos"));
  assert.ok(v.text.includes("https://halkvakt.se/lan/varmland/"));
  const g = await anropa("lage_i_lan", { lan: "Västra Götaland" });
  assert.ok(g.text.includes("rapporterar Trafikverket ingen halka") || g.text.includes("Trafikverket ingen halka"));
  assert.ok(!/rapporterar Trafikverket halka/.test(g.text) && !g.text.includes("olycka"));
  const x = await anropa("lage_i_lan", { lan: "Atlantis" });
  assert.ok(x.fel && x.text.includes("Värmland, Västra Götaland, Skåne"));
});

test("vag: sträckorna med halka per län, kallast vid vägen, ett län eller alla, okänd väg ger fel", async () => {
  const e18 = await anropa("vag", { vag: "E18" });
  assert.ok(e18.text.startsWith("E18 enligt Trafikverket:"));
  assert.ok(e18.text.includes("Värmland: halka på 1 av 2 sträckor: Karlstad–Kristinehamn (Halt, Is)."));
  assert.ok(e18.text.includes("Västra Götaland: ingen halka rapporterad på vägens 1 sträckor."));
  assert.ok(e18.text.includes("Kallast vid vägen: −4,2 °C vid Vadje."));
  const bara = await anropa("vag", { vag: "e 18", lan: "Västra Götaland" });
  assert.ok(!bara.text.includes("Värmland") && bara.text.includes("Västra Götaland"));
  assert.ok((await anropa("vag", { vag: "riksväg 26" })).text.includes("riksväg 26 enligt Trafikverket"));
  assert.ok((await anropa("vag", { vag: "E99" })).fel);
  assert.ok((await anropa("vag", { vag: "Kungsgatan" })).fel);
});

test("sverige_just_nu: län med halka, rikstalen, bara SMHI-varningar som rör väglaget", async () => {
  const s = await anropa("sverige_just_nu");
  assert.ok(s.text.includes("halka i 1 län: Värmland (9 av 52 vägavsnitt)"));
  assert.ok(s.text.includes("Vägbana under noll men ingen rapporterad halka: Skåne (3 stationer)"));
  assert.ok(s.text.includes("I Sverige visar 17 vägväderstationer vägbana på 0 °C eller kallare, och 1 olycka eller hinder pågår."), "ur länen, inte ur meta.json");
  assert.ok(s.text.includes("Gul varning, snöfall, Värmlands län") && !s.text.includes("havs"));
});

test("kallaste_stationer: länens kallaste ur lan.json, kallast först, aldrig råvärden ur vader.geojson", async () => {
  const k = await anropa("kallaste_stationer", { antal: 5 });
  assert.ok(k.text.includes("1. Vadje (Värmland): −4,2 °C") && k.text.includes("2. Hörby (Skåne): −0,6 °C"));
  assert.ok(!k.text.includes("Trasig") && !k.text.includes("Helsingfors") && !k.text.includes("Västra Götaland"));
  assert.ok((await anropa("kallaste_stationer", { antal: 1 })).text.split("\n").filter((r) => /^\d\./.test(r)).length === 1);
});

test("reglerna: inga avstånd i något svar, gammal data sägs, en trasig källa ger ett vänligt fel", async () => {
  const alla = await Promise.all([anropa("lage_i_lan", { lan: "Värmland" }), anropa("vag", { vag: "E18" }), anropa("sverige_just_nu"), anropa("kallaste_stationer")]);
  for (const a of alla) assert.ok(!/\b\d+(,\d+)? ?(km|m|meter|kilometer)\b/.test(a.text), a.text);
  const sent = await anropa("lage_i_lan", { lan: "Värmland" }, hamta, new Date("2026-11-20T10:00:00Z"));
  assert.ok(sent.text.includes("Obs: datan är 3 timmar gammal."));
  const trasig = await anropa("lage_i_lan", { lan: "Värmland" }, async () => { throw new Error("404"); });
  assert.ok(trasig.fel && trasig.text.includes("gick inte att hämta"));
});
