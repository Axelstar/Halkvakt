// Kamerornas två halvor (docs/TROSKLAR-KVALITETSTAVLAN.md §10, DECISIONS #973, ändrar #335). Delningen är skriven före öppningen:
// en kamera hör till den öppna halvan när den första byten i sha256("halkvakt-kamerahalvor-2026-11-27/" + kamerans id) är jämn.
// Den blinda halvan läses inte förrän kandidatens marsdom. Ordningen inom den öppna halvan är sha256 av ORDNING_TEXT och bildens
// sökväg, så att varje början av ordningen är ett slumpmässigt urval. Används av räkningen (scripts/kvalitetstavlan.ts), av
// hämtningen (arkivdump ?lage=kamera_hamta) och av arken (scripts/kamerahalvan.ts): en enda kopia av regeln.
import { createHash } from "node:crypto";

export const HALVOR_TEXT = "halkvakt-kamerahalvor-2026-11-27/";
export const ORDNING_TEXT = "halkvakt-kameraordning-2026-11-27/";
/** En bild i facit-hinken (kamerafacit/urval.ts, vag()): v2 eller v3, dygnet och kamerans id med timmen. */
export const BILDNAMN = /^v[23]\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_.-]+-h\d+\.jpg$/;

/** Kamerans id ur bildens sökväg: filnamnet före det sista bindestrecket. */
export function kameraId(bild: string): string {
  const fil = bild.split("/").pop() ?? "";
  const i = fil.lastIndexOf("-");
  return i > 0 ? fil.slice(0, i) : fil.replace(/\.jpg$/i, "");
}
export const oppenHalva = (kamera: string) => createHash("sha256").update(HALVOR_TEXT + kamera).digest()[0] % 2 === 0;
export const ordning = (bild: string) => createHash("sha256").update(ORDNING_TEXT + bild).digest("hex");
