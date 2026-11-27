// KAMERORNAS ÖPPNA HALVA (docs/TROSKLAR-KVALITETSTAVLAN.md §10, DECISIONS #973). Väljer nästa oklassade bilder i den öppna halvan,
// i hashordningen, och hämtar dem ur facit-hinken genom arkivdump ?lage=kamera_hamta (som själv vägrar den blinda halvan).
// Flödet kamerahalvan.yml lägger dem sedan på kontaktark (scripts/kontaktark.py halvan) och skriver allt till kuvösen.
// Repot är publikt: skriptet skriver bara antal, aldrig en bild, en adress eller en nyckel.
//
//   node --experimental-strip-types scripts/kamerahalvan.ts --alla <namn.txt> --klassade <bild.txt> --antal 400 --ut <mapp>
//   node --experimental-strip-types scripts/kamerahalvan.ts --sjalvtest
// FN och KEY i miljön: arkivdumpens adress och nyckeln, som i kvalitetstavlan.yml.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BILDNAMN, kameraId, oppenHalva, ordning } from "../supabase/functions/_shared/kamerahalvor.ts";

export const PER_ANROP = 50;

/** Nästa `antal` bilder: i den öppna halvan, inte klassade, i hashordningen. */
export function urval(alla: string[], klassade: Set<string>, antal: number): string[] {
  return alla.filter((b) => BILDNAMN.test(b) && oppenHalva(kameraId(b)) && !klassade.has(b))
    .map((b) => [ordning(b), b] as const).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, antal).map((x) => x[1]);
}

async function hamta(bilder: string[], ut: string): Promise<string[]> {
  const { FN, KEY } = process.env;
  if (!FN || !KEY) throw new Error("FN och KEY saknas");
  const ok: string[] = [];
  for (let i = 0; i < bilder.length; i += PER_ANROP) {
    const r = await fetch(`${FN}?lage=kamera_hamta`, { method: "POST", headers: { "x-halkvakt-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ bilder: bilder.slice(i, i + PER_ANROP) }) });
    if (!r.ok) throw new Error(`kamera_hamta ${r.status}`);   // svaret kan bära adresser: bara statusen
    for (const { bild, url } of (await r.json()).filer as { bild: string; url: string }[]) {
      const b = await fetch(url);
      if (!b.ok) continue;
      const fil = join(ut, bild); mkdirSync(dirname(fil), { recursive: true });
      writeFileSync(fil, Buffer.from(await b.arrayBuffer())); ok.push(bild);
    }
  }
  return ok;
}

function sjalvtest() {
  let fel = 0;
  const k = (namn: string, fatt: unknown, vant: unknown) => {
    const ok = JSON.stringify(fatt) === JSON.stringify(vant); if (!ok) fel++;
    console.log(`${ok ? "ok " : "FEL"} ${namn}${ok ? "" : `: fick ${JSON.stringify(fatt)}, väntade ${JSON.stringify(vant)}`}`);
  };
  const ids = Array.from({ length: 40 }, (_, i) => `SE_STA_CAMERA_VViS_${i}_K1`);
  const alla = ids.flatMap((id, i) => [`v2/2026-11-0${(i % 9) + 1}/${id}-h${494000 + i}.jpg`, `v3/2026-10-01/${id}-h${493000 + i}.jpg`]);
  const valda = urval(alla, new Set(), 1000);
  k("bara den öppna halvan", valda.every((b) => oppenHalva(kameraId(b))), true);
  k("hela den öppna halvan", valda.length, alla.filter((b) => oppenHalva(kameraId(b))).length);
  k("ingen ur den blinda", alla.filter((b) => !oppenHalva(kameraId(b))).some((b) => valda.includes(b)), false);
  k("i hashordningen", valda.map(ordning), [...valda.map(ordning)].sort());
  k("början av ordningen", urval(alla, new Set(), 5), valda.slice(0, 5));
  k("de klassade hoppas över", urval(alla, new Set(valda.slice(0, 3)), 2), valda.slice(3, 5));
  k("namn utanför mönstret", urval(["v2/../x-h1.jpg", "docs/a-1.jpg", "v4/2026-11-01/a-h1.jpg"], new Set(), 10), []);
  if (fel) { console.log(`självtestet: ${fel} fel`); process.exit(1); }
  console.log("självtestet: klart");
}

async function huvud() {
  const a = process.argv.slice(2), arg = (n: string) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  if (a.includes("--sjalvtest")) return sjalvtest();
  const las = (f: string | undefined) => (f ? readFileSync(f, "utf8").split("\n").map((x) => x.trim()).filter(Boolean) : []);
  const antal = Number(arg("--antal") ?? 400), ut = arg("--ut");
  if (!ut || !Number.isInteger(antal) || antal < 1 || antal > 1000) throw new Error("--ut och --antal 1–1000 krävs");
  const valda = urval(las(arg("--alla")), new Set(las(arg("--klassade"))), antal);
  mkdirSync(ut, { recursive: true });
  const hamtade = await hamta(valda, ut);
  writeFileSync(join(ut, "lista.json"), JSON.stringify(hamtade, null, 0));   // i hashordningen: ordningen i valda
  console.log(`kamerahalvan: ${hamtade.length} av ${valda.length} bilder hämtade`);
}

huvud().catch((e) => { console.log(`fel: ${String(e instanceof Error ? e.message : e).split("\n")[0]}`); process.exit(1); });
