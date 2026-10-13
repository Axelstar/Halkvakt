// VAD RAPPORTFILEN VÄGER (DECISIONS #530, Bengt 11/10: "gör 1"). LÄS-ONLY mot favoritprovets publika hink: den snabba delens storlek
// packad, och vad den blir utan varje fält, med kortare texter, och med hastigheterna lagda på det vägarbete de sitter vid — underlaget
// för bantningen. Inga data sparas. Kör: node --experimental-strip-types scripts/matningar/rapportfilen-vikt-2026-10-11.ts
import { gzipSync } from "node:zlib";

const HINK = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/favoritprov/";
const gz = (o: unknown) => gzipSync(Buffer.from(JSON.stringify(o)), { level: 9 }).length;
const kb = (b: number) => `${(b / 1000).toFixed(1)} kB`;
const s = await fetch(HINK + "rapport-snabb.json?t=" + Date.now()).then((r) => r.json());
const lang = await fetch(HINK + "rapport-lang.json?t=" + Date.now()).then((r) => r.json());
const bas = gz(s);
console.log(`mätt: rapport-snabb ${s.generated_at}: ${s.poster.length} poster, ${kb(JSON.stringify(s).length)} rå, ${kb(bas)} packad`);
console.log(`mätt: stationerna ensamma ${kb(gz(s.stationer))} packade (${Object.keys(s.stationer).length})`);
const falt = new Set<string>(); for (const p of s.poster) for (const k of Object.keys(p)) falt.add(k);
for (const f of falt) {
  const utan = { ...s, poster: s.poster.map((p: any) => { const { [f]: _, ...x } = p; return x; }) };
  console.log(`mätt:   utan ${f.padEnd(12)} ${kb(gz(utan))} (−${kb(bas - gz(utan))})`);
}
for (const n of [80, 60, 40]) {
  const kort = { ...s, poster: s.poster.map((p: any) => ({ ...p, text: String(p.text).slice(0, n) })) };
  console.log(`mätt:   texten högst ${n} tecken: ${kb(gz(kort))}`);
}
const perSlag = new Map<string, number[]>();
for (const p of s.poster) { const l = perSlag.get(p.slag) ?? []; l.push(gz([p])); perSlag.set(p.slag, l); }
for (const [slag, l] of perSlag) console.log(`mätt:   ${slag.padEnd(10)} ${String(l.length).padStart(5)} poster`);
// Hastigheterna vid ett vägarbete: inom 100 m av vägarbetets punkt eller linje (plant, grovt).
const m = (a: number[], b: number[]) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110574);
const vaPunkter = s.poster.filter((p: any) => p.slag === "vagarbete").flatMap((p: any) => [...(p.p ? [p.p] : []), ...(p.l ? (lang.linjer[p.l] ?? []).flat() : [])]);
const hast = s.poster.filter((p: any) => p.slag === "hastighet");
const vid = hast.filter((h: any) => { const pts = h.p ? [h.p] : (lang.linjer[h.l] ?? []).flat(); return pts.some((q: number[]) => vaPunkter.some((v: number[]) => m(q, v) < 100)); });
console.log(`mätt: hastigheter inom 100 m av ett vägarbete: ${vid.length} av ${hast.length}`);
const utanVid = { ...s, poster: s.poster.filter((p: any) => !vid.includes(p)) };
console.log(`mätt: utan de hastigheterna (lagda på vägarbetet i stället): ${kb(gz(utanVid))}`);
const lika = new Map<string, number>(); for (const p of s.poster) lika.set(p.text, (lika.get(p.text) ?? 0) + 1);
console.log(`mätt: olika texter ${lika.size} av ${s.poster.length}; vanligast: ${[...lika].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${n}× "${String(t).slice(0, 50)}"`).join(" · ")}`);
