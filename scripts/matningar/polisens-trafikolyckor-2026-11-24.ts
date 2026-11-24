// Polisens händelser "Trafikolycka" 6/11 till i dag (Bengt 24/11: utomstående uppgifter som bekräftar eller motsäger cirka 1000
// olyckor). A one-off read of the police's public events API (polisen.se/api/events), one Swedish day at a time, counting the events
// whose type starts with "Trafikolycka". Prints counts per day and per type only — no summaries, no places. No database, no key.
// Run (CI): olyckor-trv-kontroll.yml on the working branch.
const FRAN = "2026-11-06";
const dagar: string[] = [];
for (let t = Date.parse(FRAN + "T12:00:00Z"); t <= Date.now(); t += 86_400_000) dagar.push(new Date(t).toISOString().slice(0, 10));
const vila = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hamta(q: string): Promise<{ status: number; rows: any[] }> {
  const r = await fetch(`https://polisen.se/api/events?${q}`, { headers: { "User-Agent": "halkvakt-kontroll", Accept: "application/json" } });
  if (!r.ok) return { status: r.status, rows: [] };
  return { status: r.status, rows: await r.json() };
}

const typer = new Map<string, number>();
let summa = 0, tidigast = "", senast = "";
for (const d of dagar) {
  let { status, rows } = await hamta(`DateTime=${d}`);
  let kalla = "alla händelser";
  if (rows.length >= 500) {   // the API returns at most 500: ask for the accident types only
    await vila(6000);
    ({ status, rows } = await hamta(`DateTime=${d}&type=${encodeURIComponent("Trafikolycka;Trafikolycka, personskada;Trafikolycka, singel;Trafikolycka, smitning;Trafikolycka, vilt")}`));
    kalla = "bara olyckstyperna (dygnet hade 500+ händelser)";
  }
  const olyckor = rows.filter((e) => String(e.type ?? "").startsWith("Trafikolycka"));
  const perTyp: Record<string, number> = {};
  for (const e of olyckor) { perTyp[e.type] = (perTyp[e.type] ?? 0) + 1; typer.set(e.type, (typer.get(e.type) ?? 0) + 1); }
  for (const e of olyckor) { const t = String(e.datetime ?? ""); if (!tidigast || t < tidigast) tidigast = t; if (t > senast) senast = t; }
  summa += olyckor.length;
  console.log(`${d}: HTTP ${status}, ${rows.length} händelser (${kalla}), trafikolyckor ${olyckor.length} ${JSON.stringify(perTyp)}`);
  await vila(6000);
}
console.log(`\nSumma trafikolyckor ${FRAN}–${dagar.at(-1)}: ${summa}`);
console.log(`Per typ: ${JSON.stringify(Object.fromEntries([...typer.entries()].sort((a, b) => b[1] - a[1])))}`);
console.log(`Tidigaste och senaste händelsetid: ${tidigast} – ${senast}`);
