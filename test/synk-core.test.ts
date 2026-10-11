import { test } from "node:test";
import assert from "node:assert/strict";
import { bilensLarm, jamfor, korLangs, rapportensAlder, summa, LANGS_TOL_M, type Larm } from "../publish/synk-core.ts";
import type { Rad } from "../publish/rapport-core.ts";
import type { Hazard } from "../engine/src/types.ts";

// Synkprovet (DECISIONS #533): rapporten tio minuter innan mot bilens larm. Rutten går rakt österut vid 59°, ~29 km.
const RUTT: [number, number][] = [[15.0, 59.0], [15.5, 59.0]];
const FAROR: Hazard[] = [
  { id: "wx:2", kind: "icing_point", lon: 15.4, lat: 59.0005, meta: { surfaceTempC: -1, moisture: true, rainH: null, fall30C: null } } as Hazard,
  { id: "dev:9", kind: "accident", lon: 15.1, lat: 59.0002, meta: { severityCode: 4, endTimeLocal: null, road: null } } as Hazard,
];
const rad = (id: string, slag: Rad["slag"], langsM: number): Rad => ({ id, slag, rubrik: id, text: "", avstandM: 0, langsM, vag: null, start: null });

test("bilen: 80 km/h längs rutten, och larmets plats är farans plats längs rutten", () => {
  const { fixar, langs } = korLangs(RUTT);
  assert.equal(fixar[1].t - fixar[0].t, 5);
  assert.ok(Math.abs(langs[langs.length - 1] - 28_700) < 300, `${langs[langs.length - 1]}`);
  const larm = bilensLarm(FAROR, RUTT);
  const olycka = larm.find((a) => a.id === "dev:9")!, is = larm.find((a) => a.id === "wx:2")!;
  assert.ok(olycka && is, JSON.stringify(larm));
  assert.ok(Math.abs(olycka.langsM - 5_750) < 200, `olyckan vid ${olycka.langsM} m`);
  assert.ok(Math.abs(is.langsM - 23_000) < 200, `isrisken vid ${is.langsM} m`);
});

test("jämförelsen: förvarnad på id eller på slag och plats; saknad; borta och kvar; ej jämförbara slag räknas", () => {
  const larm: Larm[] = [
    { id: "wx:2", kind: "icing_point", t: 0, langsM: 23_000, text: "" },          // rapporten bar samma id
    { id: "dev:9", kind: "accident", t: 0, langsM: 5_750, text: "" },             // rapporten bar en olycka 400 m bort med annat id
    { id: "seg:7", kind: "slippery_segment", t: 0, langsM: 12_000, text: "" },    // rapporten nämnde inget
  ];
  const rader = [rad("wx:2", "frysrisk", 23_010), rad("dev:8", "olycka", 6_150), rad("seg:5", "halka", 2_000),
    rad("cam:3", "kamera", 26_000), rad("dev:4", "vagarbete", 9_000)];
  const u = jamfor(rader, larm, new Set(["cam:3", "wx:2", "dev:9", "seg:7"]));
  assert.equal(u.larm, 3);
  assert.equal(u.forvarnade, 2);
  assert.deepEqual(u.saknade.map((s) => s.id), ["seg:7"]);
  assert.deepEqual(u.utanLarm.map((x) => `${x.id}:${x.orsak}`), ["seg:5:borta", "cam:3:kvar"]);
  assert.deepEqual(u.ejJamforbara, { vagarbete: 1 });
});

test("jämförelsen: en avvikelse längre bort än toleransen, eller av fel slag, förvarnar inte; en rad förvarnar bara ett larm", () => {
  const a = (id: string, langsM: number): Larm => ({ id, kind: "accident", t: 0, langsM, text: "" });
  assert.equal(jamfor([rad("dev:8", "olycka", 5_000 + LANGS_TOL_M + 1)], [a("dev:9", 5_000)], new Set()).forvarnade, 0);
  assert.equal(jamfor([rad("dev:8", "restid", 5_000)], [a("dev:9", 5_000)], new Set()).forvarnade, 0);
  assert.equal(jamfor([rad("dev:8", "olycka", 5_000)], [a("dev:9", 5_000), a("dev:10", 5_100)], new Set()).forvarnade, 1);
  // Halka och frysrisk matchas bara på id, aldrig på plats.
  assert.equal(jamfor([rad("seg:1", "halka", 5_000)], [{ id: "seg:2", kind: "slippery_segment", t: 0, langsM: 5_000, text: "" }], new Set()).forvarnade, 0);
});

test("jämförelsen: samma Trafikverket-id under motorns prefix (djur:X mot dev:X) förvarnar, oavsett plats", () => {
  const djur: Larm = { id: "djur:SE_STA_TRISSID_1_8067642", kind: "wildlife", t: 0, langsM: 101_700, text: "" };
  assert.equal(jamfor([rad("dev:SE_STA_TRISSID_1_8067642", "vilt", 100_156)], [djur], new Set()).forvarnade, 1);
  assert.equal(jamfor([rad("dev:SE_STA_TRISSID_1_1", "vilt", 100_156)], [djur], new Set()).forvarnade, 0, "annat id och 1,5 km bort förvarnar inte");
  assert.equal(jamfor([rad("cam:SE_STA_TRISSID_1_8067642", "kamera", 0)], [djur], new Set()).forvarnade, 0, "bara dev: räknas som samma avvikelse");
});

test("summan: andelen förvarnade larm, per motorslag, och utan larm delat i borta och kvar", () => {
  const larm: Record<string, Larm[]> = {
    A: [{ id: "wx:1", kind: "icing_point", t: 0, langsM: 0, text: "" }, { id: "seg:2", kind: "slippery_segment", t: 0, langsM: 0, text: "" }],
    B: [],
  };
  const u = { A: jamfor([rad("wx:1", "frysrisk", 0), rad("seg:9", "halka", 50)], larm.A, new Set()), B: jamfor([], [], new Set()) };
  const s = summa(u, larm);
  assert.equal(s.rutter, 2); assert.equal(s.larm, 2); assert.equal(s.forvarnade, 1); assert.equal(s.andel, 0.5);
  assert.deepEqual(s.perSlag, { icing_point: { larm: 1, forvarnade: 1 }, slippery_segment: { larm: 1, forvarnade: 0 } });
  assert.deepEqual(s.utanLarm, { borta: 1, kvar: 0 });
  assert.equal(summa({ B: u.B }, { B: [] }).andel, null, "inga larm ger ingen andel, inte noll");
});

test("rapportens ålder: 5–20 minuter räknas, annars inte (en utebliven körning ger en gammal rapport)", () => {
  const nu = Date.parse("2026-10-12T06:18:00Z");
  assert.deepEqual(rapportensAlder("2026-10-12T06:08:04Z", nu), { min: 9.9, ok: true });
  assert.equal(rapportensAlder("2026-10-12T05:38:04Z", nu).ok, false);
  assert.equal(rapportensAlder("2026-10-12T06:16:00Z", nu).ok, false);
  assert.deepEqual(rapportensAlder(undefined, nu), { min: null, ok: false });
});
