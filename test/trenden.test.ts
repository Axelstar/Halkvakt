import { test } from "node:test";
import assert from "node:assert/strict";
import { FONSTER, LUTNING, DAGGGAP, STARTBAND, BREDASTE_BAND, MINSTA_LUTNING, fyrar, lutning, type Rad, type Param }
  from "../publish/trenden.ts";
import { arKandidat, utfall } from "../publish/trendkandidat.ts";

/** En fallande natt: ytan går från 5,0 till 0,6 på en timme, mätning var femte minut. */
const natt = (): Rad[] => {
  const ut: Rad[] = [];
  for (let k = 0; k <= 12; k++) {
    const yta = 5 - k * 0.4;
    ut.push({ t: k * 5, yta, dagg: yta - 0.3, rh: 95, luft: yta + 1, brott: 0 });
  }
  return ut;
};

test("svepet är TROSKLAR-TRENDEN §2:s, oförändrat", () => {
  assert.deepEqual(FONSTER, [15, 30, 60]);
  assert.deepEqual(LUTNING, [0.4, 0.6, 0.8, 1.2]);
  assert.deepEqual(DAGGGAP, [0, 0.5, 1.0, 2.0]);
  assert.deepEqual(STARTBAND, [[1, 3], [1, 4], [1, 6]]);
});

test("supersetet härleds ur svepet, inte skrivet för hand", () => {
  assert.deepEqual(BREDASTE_BAND, [1, 6]);
  assert.equal(MINSTA_LUTNING, 0.4);
});

// DEN BÄRANDE INVARIANTEN. Faller den sparar arkivet bort just de rader T-B behöver — tyst.
test("SUPERSET: fyrar någon kombination på en rad så är raden kandidat", () => {
  const rader = natt();
  let provade = 0, fyrade = 0;
  for (let i = 0; i < rader.length; i++) {
    for (const fonster of FONSTER) {
      for (const lut of LUTNING) {
        for (const gap of DAGGGAP) {
          for (const band of STARTBAND) {
            provade++;
            const p: Param = { fonster, lut, gap, band };
            // fyrar() prövar hela natten; här prövas raden i isolering fram till i.
            const tillOchMed = rader.slice(0, i + 1);
            if (!fyrar(tillOchMed, p)) continue;
            fyrade++;
            // Någon rad i prefixet fyrade — minst en av dem måste vara kandidat.
            const nagon = tillOchMed.some((_, j) => arKandidat(tillOchMed, j) !== null);
            assert.ok(nagon, `kombination ${JSON.stringify(p)} fyrade utan kandidat vid i=${i}`);
          }
        }
      }
    }
  }
  assert.ok(provade > 1000, "svepet ska ha prövats i sin helhet");
  assert.ok(fyrade > 0, "provet är meningslöst om ingen kombination fyrar");
});

test("kandidat kräver att ytan ligger i bredaste bandet", () => {
  const rader = natt().map((r) => ({ ...r, yta: r.yta + 20, dagg: r.yta + 19.7, luft: r.yta + 21 }));
  assert.equal(rader.every((_, i) => arKandidat(rader, i) === null), true);
});

test("kandidat kräver att någon lutning når svepets lägsta steg", () => {
  // Platt natt mitt i bandet: rätt temperatur, ingen lutning.
  const platt: Rad[] = Array.from({ length: 13 }, (_, k) => ({ t: k * 5, yta: 3, dagg: 2.8, rh: 95, luft: 4, brott: 0 }));
  assert.equal(platt.every((_, i) => arKandidat(platt, i) === null), true);
});

test("en fallen givarvakt gör raden till icke-kandidat, inte till ett utfall", () => {
  const rader = natt().map((r) => ({ ...r, luft: r.yta + 20 }));   // #75: ytan 20 ° under luften
  assert.equal(rader.every((_, i) => arKandidat(rader, i) === null), true);
});

test("kort #234 (DECISIONS #299): radvakten och karantänen gör raden till icke-kandidat — men blixthalkan får tala", () => {
  // Ö Ljungby 1106 som det såg ut 19–21/9: ytan faller vackert i bandet, men luften ligger 12 ° över — givarfel, inte kyla.
  // #75 släpper (gapet är exakt 12), så det är ENBART radvakten som tar raderna.
  const ljungby = natt().map((r) => ({ ...r, luft: r.yta + 12 }));
  assert.equal(ljungby.every((_, i) => arKandidat(ljungby, i) === null), true, "radvakten");
  // Ett äkta gap på 7 ° (varmfronten över frusen väg) rör radvakten inte — gapet är under 8, och under +10 °C gäller den inte alls.
  const blixt = natt().map((r) => ({ ...r, luft: r.yta + 7 }));
  assert.equal(blixt.some((_, i) => arKandidat(blixt, i) !== null), true, "det äkta gapet får tala");
  // Tre brott mot #75 de sju dygnen före raden tystar stationen; två gör det inte.
  const tre = natt().map((r) => ({ ...r, brott: 3 })), tva = natt().map((r) => ({ ...r, brott: 2 }));
  assert.equal(tre.every((_, i) => arKandidat(tre, i) === null), true, "karantänen");
  assert.equal(tva.some((_, i) => arKandidat(tva, i) !== null), true, "två brott räcker inte");
});

test("utfallet räknar bara framåt, och noll rader är OKÄNT — aldrig 'blev inte kallare'", () => {
  const rader = natt();
  const u = utfall(rader, 0, 90);
  assert.equal(u.n, 12);
  assert.ok(Math.abs((u.min ?? 9) - 0.2) < 1e-9);     // sista raden, 5 − 12·0,4 = 0,2
  const sista = utfall(rader, rader.length - 1, 90);
  assert.equal(sista.n, 0);
  assert.equal(sista.min, null);                      // ingen mätning efter ⇒ null, inte ytan själv
});

test("kandidatens lutningar kommer i svepets ordning", () => {
  const rader = natt();
  // Index 10, alltså yta 1,0 °C — sista raden som ryms i bredaste bandet [1, 6].
  // Rad 11 och 12 (0,6 och 0,2) är INTE kandidater, och det är rätt: under bandets
  // golv har trenden redan passerat det den skulle varna för.
  assert.equal(arKandidat(rader, 12), null);
  const k = arKandidat(rader, 10);
  assert.ok(k);
  assert.equal(k.lutningar.length, FONSTER.length);
  // 60-minutersfönstret ska se hela fallet 5,0 → 1,0 = 4,0 °C.
  assert.ok(Math.abs((k.lutningar[2] ?? 0) - 4.0) < 1e-9);
  // 15-minutersfönstret ser tre steg à 0,4.
  assert.ok(Math.abs((k.lutningar[0] ?? 0) - 1.2) < 1e-9);
});

// Uppmätt 13/9 på station 2004: driftens SQL valde raden, knappens TypeScript inte, och
// skillnaden var ren representation. 862 av 4 713 kandidater föll på det.
test("4,8 − 4,4 är 0,4 och inte 0,39999999999999947 — annars glider SQL och TypeScript isär", () => {
  const rader: Rad[] = [
    { t: 0, yta: 4.8, dagg: 2.0, rh: 95, luft: 2.6 },
    { t: 5, yta: 4.9, dagg: 2.2, rh: 97, luft: 2.4 },
    { t: 55, yta: 4.2, dagg: 3.2, rh: 97, luft: 3.6 },
    { t: 60, yta: 4.4, dagg: 2.9, rh: 98, luft: 3.2 },
  ];
  const l = lutning(rader, 3, 60);
  assert.equal(l, 0.4);
  assert.ok((l ?? 0) >= MINSTA_LUTNING, "exakt tröskelvärde ska räknas som uppnått");
  assert.ok(arKandidat(rader, 3) !== null, "raden ÄR kandidat, precis som SQL räknar den");
});
