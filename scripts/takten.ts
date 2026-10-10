// TAKTEN (Bengts val (a) 10/10, DECISIONS #515). Kartans procent är andelen av allt kartan känner, och kartan växer medan vi bygger:
// veckan 3–10/10 gav 56 klara steg men flyttade procenten från 64 till 66, eftersom 67 nya steg och 6 nya delar kom till. Takten visar
// arbetet självt: varje ändring av en del eller ett steg i docs/projektkartan.json de senaste sju dygnen, ur git-historiken, med sin
// commit, så att varje steg går att härleda till det arbete som flyttade det. projektkartan.ts skriver docs/takten.json och visar den
// överst på kartan; --check prövar sidan mot filen, inte filen mot historiken (en PR-körning bär inte main-historiken).
import { execFileSync } from "node:child_process";

export type Status = "klar" | "pagar" | "saknas" | "ej";
type KartDel = { id: string; namn: string; block: string; steg?: { namn: string; status: Status }[] };
type KartLik = { delar: KartDel[] };
export type Commit = { tid: string; sha: string; rubrik: string };
/** En ändring: en ny eller borttagen del, eller ett steg som tillkommit (fran null), tagits bort (till null), bytt status eller
 *  bytt namn (tidigare = det gamla namnet). */
export type Handelse = Commit & { art: "ny del" | "borttagen del" | "steg"; del: string; delnamn: string; block: string;
  steg: string | null; fran: Status | null; till: Status | null; tidigare?: string; flyttatFran?: string };
export type Takten = { fran: string; till: string; sha: string; procentFore: number; procent: number; handelser: Handelse[] };
export type Summa = { klara: number; klaraFanns: number; klaraNya: number; nyaSteg: number; nyaDelar: number; tillbaka: number; borttagna: number };

export const DYGN = 7;
const FIL = "docs/projektkartan.json";

/** Skillnaden mellan två versioner av kartan. Ett namnbyte känns igen som ett nytt steg på samma plats i delens lista som ett steg
 *  som försvunnit, i samma commit: det följer det gamla stegets läge och räknas bara om statusen ändrats. Ett steg som försvinner
 *  utan ett nytt på sin plats är borttaget. */
export function skillnad(fore: KartLik, efter: KartLik, c: Commit): Handelse[] {
  const ut: Handelse[] = [];
  const foreDel = new Map(fore.delar.map((d) => [d.id, d]));
  const efterId = new Set(efter.delar.map((d) => d.id));
  const h = (d: KartDel, art: Handelse["art"], steg: string | null, fran: Status | null, till: Status | null, tidigare?: string) =>
    ut.push({ ...c, art, del: d.id, delnamn: d.namn, block: d.block, steg, fran, till, ...(tidigare ? { tidigare } : {}) });
  for (const d of efter.delar) {
    const f = foreDel.get(d.id);
    if (!f) h(d, "ny del", null, null, null);
    const foreSteg = f?.steg ?? [], nu = d.steg ?? [];
    const fs = new Map(foreSteg.map((s) => [s.namn, s.status]));
    const kvar = new Set(nu.map((s) => s.namn));
    const bytt = new Map<string, { namn: string; status: Status }>();
    nu.forEach((s, i) => { const g = foreSteg[i]; if (!fs.has(s.namn) && g && !kvar.has(g.namn)) bytt.set(s.namn, g); });
    const byttFran = new Set([...bytt.values()].map((g) => g.namn));
    for (const s of nu) {
      const g = bytt.get(s.namn);
      if (g) { h(d, "steg", s.namn, g.status, s.status, g.namn); continue; }
      const fran = fs.get(s.namn) ?? null;
      if (fran !== s.status) h(d, "steg", s.namn, fran, s.status);
    }
    for (const [namn, st] of fs) if (!kvar.has(namn) && !byttFran.has(namn)) h(d, "steg", namn, st, null);
  }
  for (const d of fore.delar) if (!efterId.has(d.id)) h(d, "borttagen del", null, null, null);
  // En flytt: ett steg som försvinner ur en del och dyker upp med samma namn i en annan, i samma commit. Det följer sitt läge.
  const borta = new Map(ut.filter((x) => x.art === "steg" && x.till === null).map((x) => [x.steg!, x]));
  const parade = new Set<Handelse>();
  for (const x of ut) {
    const b = x.art === "steg" && x.fran === null ? borta.get(x.steg!) : undefined;
    if (!b || b.del === x.del) continue;
    x.fran = b.fran;
    x.flyttatFran = b.delnamn;
    borta.delete(x.steg!);
    parade.add(b);
  }
  return ut.filter((x) => !parade.has(x));
}

export function summera(h: Handelse[]): Summa {
  const steg = h.filter((x) => x.art === "steg");
  const klara = steg.filter((x) => x.till === "klar" && x.fran !== "klar");
  return {
    klara: klara.length, klaraFanns: klara.filter((x) => x.fran !== null).length, klaraNya: klara.filter((x) => x.fran === null).length,
    nyaSteg: steg.filter((x) => x.fran === null).length, nyaDelar: h.filter((x) => x.art === "ny del").length,
    tillbaka: steg.filter((x) => x.fran === "klar" && x.till !== null && x.till !== "klar").length,
    borttagna: steg.filter((x) => x.till === null).length,
  };
}

/** Takten ur git-historiken: de DYGN dygnen före HEAD:s commit-tid. null när historiken saknas (grund klon). */
export function lasTakten(rot: string, procent: (k: any) => number): Takten | null {
  const git = (...a: string[]) => execFileSync("git", ["-C", rot, ...a], { encoding: "utf8", maxBuffer: 256 << 20 });
  if (git("rev-parse", "--is-shallow-repository").trim() === "true") return null;
  const sha = git("rev-parse", "HEAD").trim();
  const till = new Date(git("log", "-1", "--format=%cI", "HEAD").trim()).toISOString();
  const fran = new Date(Date.parse(till) - DYGN * 86_400_000).toISOString();
  const commits = git("log", "--reverse", "--format=%H%x09%cI%x09%s", `--since=${fran}`, "HEAD", "--", FIL)
    .split("\n").filter(Boolean).map((r) => { const [s, t, ...rub] = r.split("\t"); return { sha: s, tid: new Date(t).toISOString(), rubrik: rub.join("\t") }; });
  const visa = (ref: string) => { try { return JSON.parse(git("show", `${ref}:${FIL}`)); } catch { return null; } };
  const nu = visa("HEAD");
  let fore = commits.length ? (visa(`${commits[0].sha}^`) ?? { delar: [] }) : nu;
  const procentFore = procent(fore);
  const handelser: Handelse[] = [];
  for (const c of commits) {
    const efter = visa(c.sha);
    if (!efter) continue;
    handelser.push(...skillnad(fore, efter, c));
    fore = efter;
  }
  return { fran, till, sha, procentFore, procent: procent(nu), handelser };
}
