// BATTERISKATTNINGEN — hur mycket batteri drar appen under en resa med fas 2? (DECISIONS #741 punkt 6 och tillägget
// 29/10, Bengts "kan man inte göra någon form av beräkning hur mycket appen egentligen kan dra" 29/10). Resultatet står i
// docs/BATTERISKATTNINGEN-2026-10-29.md.
//
// Kör: node --experimental-strip-types scripts/matningar/batteriskattningen-2026-10-29.ts
//
// METODEN. Förankrad i mätningen 27/9 (DECISIONS #382: iPhone, 0.3.9 (14), skärmen av, 7 %/h, sant värde 6–8 %/h). Det
// bygget hämtade vägdatan bara vid start (omladdningen var 30:e minut, #371, kom senare). Fas 2 kollar hinken omkring 30
// gånger i timmen (Kolltakten.swift: en koll per publicering, var 120:e sekund). Skattningen lägger till vad de kollarna
// kostar. Allt annat i appen (GPS, motorn) antas kosta som 27/9.

const kapacitetWh = { liten: 11, mellan: 13, stor: 17 };   // ANTAGANDE: vanliga iPhones; Bengts modell är okänd
const kollarPerTimme = { normal: 30, omkoll: 35, fel: 60 }; // Kolltakten: publiceringen 120 s, omkoll +30 s, fel +60 s
const joulePerKoll = {                                     // radion vaknar, skickar och ligger kvar uppe en stund
  redanVaken: 0,      // musik eller navigering håller radion uppe ändå
  nyTelefon: 3,       // ANTAGANDE: nyare modem och nät med kortare väntetid; ingen källa
  lte2012: 12.8,      // Huang m.fl., MobiSys 2012, per överföring på LTE, citerat i andra hand (artikeln inte läst)
};
const filKB = { manifest: 0.25, live: 31.7 };              // uppmätt 29/10 med gzip ur hinken app/v1/

const procent = (joule: number, wh: number) => (joule / (wh * 3600)) * 100;
const r = (x: number) => x.toFixed(2).replace(".", ",");

console.log("Tillägg från fas 2 i %/h (rad: joule per koll, kolumn: kapacitet), 30 kollar i timmen:");
for (const [namn, j] of Object.entries(joulePerKoll)) {
  const rad = Object.entries(kapacitetWh).map(([k, wh]) => `${k} ${wh} Wh: ${r(procent(j * kollarPerTimme.normal, wh))}`);
  console.log(`  ${namn.padEnd(11)} ${j} J  →  ${rad.join("   ")}`);
}

const scenarier = [
  { namn: "Lågt", matt: 6, kollar: kollarPerTimme.normal, j: joulePerKoll.redanVaken, wh: kapacitetWh.stor },
  { namn: "Troligt", matt: 7, kollar: kollarPerTimme.normal, j: joulePerKoll.nyTelefon, wh: kapacitetWh.mellan },
  { namn: "Högt", matt: 8, kollar: kollarPerTimme.omkoll, j: joulePerKoll.lte2012, wh: kapacitetWh.liten },
  { namn: "Felläget", matt: 8, kollar: kollarPerTimme.fel, j: joulePerKoll.lte2012, wh: kapacitetWh.liten },
];
console.log("\nTotalt under resan, skärmen av:");
for (const s of scenarier) {
  const till = procent(s.kollar * s.j, s.wh);
  console.log(`  ${s.namn.padEnd(9)} 27/9 ${s.matt} %/h + fas 2 ${r(till)} %/h = ${r(s.matt + till)} %/h` +
    `   (${s.kollar} kollar à ${s.j} J, ${s.wh} Wh)`);
}

const mbPerTimme = (kollarPerTimme.normal * (filKB.manifest + filKB.live)) / 1024;
console.log(`\nData: högst ${r(mbPerTimme)} MB i timmen (manifestet och live.json vid varje koll).`);

// Rimlighetskontroll: vad är 7 %/h i watt, och hur stor del kan GPS-mottagaren själv vara?
for (const [k, wh] of Object.entries(kapacitetWh)) {
  const watt = 0.07 * wh;
  console.log(`7 %/h på ${wh} Wh = ${r(watt)} W i snitt; en GPS-mottagare på 0,12–0,17 W är ${r((0.12 / watt) * 100)}–${r((0.17 / watt) * 100)} % av det (${k})`);
}
