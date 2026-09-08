// VAKTHUNDEN — självövervakning som INTE kräver GitHub Actions (#73, 8/9 2026).
//
// Bakgrund: healthcheck.yml låg i Actions. När minuterna tog slut 5/9 tystnade vakthunden
// samtidigt som kedjan gick sönder, och att live.json var 66 timmar gammal upptäcktes bara
// för att en människa råkade titta. En vakthund som dör med det den vaktar är ingen vakthund.
//
// Kollar tre led, i den ordning de kan gå sönder:
//   1. Hämtar vi?      sync_state per källa
//   2. Sparar vi?      nyaste väderobservationen
//   3. Når det appen?  live.json på CDN — det led som faktiskt fallerade
// Larmar via GitHub-issue (API-anrop, inga Actions-minuter). En issue åt gången: öppnas när
// något är fel, uppdateras medan det består, stängs när allt är grönt igen.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const REPO = "Axelstar/Halkvakt";
const token = Deno.env.get("PUBLISH_TOKEN")!;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/live.json";
const MARK = "<!-- vakthund -->";   // hittar vår egen issue igen

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });

  const problem: string[] = [];
  const rad: string[] = [];
  try {
    // 1. Hämtar vi? Livemotorns källor har hård tröskel, GitHub-flödets mjuk (de väntar
    //    på kvotnollställningen 1/10 och SKA inte larma under september).
    const HÅRD: Record<string, number> = { deviations: 15, road_conditions: 15, weather: 60 };
    for (const r of await sql`SELECT source, synced_at FROM sync_state ORDER BY source`) {
      const min = (Date.now() - new Date(r.synced_at).getTime()) / 60000;
      const gräns = HÅRD[r.source];
      rad.push(`${r.source}: ${min.toFixed(0)} min${gräns ? ` (gräns ${gräns})` : " (GitHub-flödet, vilar)"}`);
      if (gräns && min > gräns) problem.push(`**${r.source}** hämtas inte: ${min.toFixed(0)} min sedan (gräns ${gräns})`);
    }
    // 2. Sparar vi?
    const [w] = await sql`SELECT max(sample_time) t FROM weather_observations`;
    const wMin = w.t ? (Date.now() - new Date(w.t).getTime()) / 60000 : Infinity;
    rad.push(`nyaste väderobservation: ${wMin.toFixed(0)} min`);
    if (wMin > 90) problem.push(`**Väderdatan står stilla**: nyaste mätning ${wMin.toFixed(0)} min gammal`);

    // 3. Når det APPEN? Inte "ligger filen på CDN" — apparna hämtar manifest.json och
    //    FÖRKASTAR en fil vars sha256 inte stämmer, och behåller den förra. 8/9 skrev den
    //    första publicera-versionen ingen manifest.json alls: CDN såg färsk ut, telefonerna
    //    stod kvar på 5/9-snapshoten, och en vakthund som bara mätte live.json:s ålder sa
    //    grönt. Bengts granskning fångade det (#76). Mät det appen faktiskt gör.
    const [mRes, lRes] = await Promise.all([
      fetch(CDN.replace("live.json", "manifest.json"), { cache: "no-store" }),
      fetch(CDN, { cache: "no-store" }),
    ]);
    if (!mRes.ok) problem.push(`**manifest.json svarar ${mRes.status}** — apparna kan inte verifiera och behåller gammal data`);
    else if (!lRes.ok) problem.push(`**live.json svarar ${lRes.status}** — appen får ingen snapshot`);
    else {
      const manifest = await mRes.json();
      const rå = new Uint8Array(await lRes.clone().arrayBuffer());
      const sum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", rå))]
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const väntad = manifest?.files?.live?.sha256;
      const cdnMin = (Date.now() - new Date(manifest.generated_at).getTime()) / 60000;
      rad.push(`manifest: ${cdnMin.toFixed(0)} min | sha ${sum === väntad ? "stämmer" : "MISMATCH"}`);
      if (sum !== väntad)
        problem.push(`**Manifestets sha256 stämmer inte med live.json** — apparna förkastar filen och kör vidare på förra snapshoten. Det här är felet som INTE syns på CDN.`);
      if (cdnMin > 45)
        problem.push(`**Appen får gammal data**: manifestet ${cdnMin.toFixed(0)} min gammalt (publiceras var 10:e min)`);
    }
  } catch (e) {
    problem.push(`Vakthunden kunde inte slutföra kontrollen: ${String(e)}`);
  }

  // Larm via issue — en åt gången.
  const öppna = await gh(`/issues?state=open&labels=vakthund`);
  const min = öppna.find((i: any) => (i.body ?? "").includes(MARK));
  const kropp = `${MARK}\n**Kontroll ${new Date().toISOString()}**\n\n` +
    (problem.length ? problem.map((p) => `- ❌ ${p}`).join("\n") : "- ✅ allt grönt") +
    `\n\n<details><summary>mätvärden</summary>\n\n\`\`\`\n${rad.join("\n")}\n\`\`\`\n</details>`;

  if (problem.length) {
    if (min) await gh(`/issues/${min.number}/comments`, "POST", { body: kropp });
    else await gh(`/issues`, "POST", { title: "🔴 Vakthunden: kedjan är bruten", body: kropp, labels: ["vakthund"] });
  } else if (min) {
    await gh(`/issues/${min.number}/comments`, "POST", { body: `${kropp}\n\nStänger — allt grönt igen.` });
    await gh(`/issues/${min.number}`, "PATCH", { state: "closed" });
  }
  return new Response(JSON.stringify({ ok: problem.length === 0, problem, rad }),
    { headers: { "Content-Type": "application/json" } });
});
