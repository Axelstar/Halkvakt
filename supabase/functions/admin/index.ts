// admin — API:t bakom admin.halkvakt.se (DECISIONS #913). Sidorna ligger på GitHub Pages (Axelstar/halkvakt-admin);
// den här funktionen är det enda som lämnar ut något, och den prövar varje anrop.
// Inloggningen är Supabase Auth: sidan loggar in mot /auth/v1/token och skickar sin åtkomstnyckel som Authorization: Bearer.
// Funktionen frågar Auth vem nyckeln tillhör och läser användarens menyval ur admin_behorighet. Utan rad där: 403.
// Ett menyval som saknas ger 403 på delens data, så en dold meny är också stängd data.
//
// GET  ?del=jag                         → {epost, menyval}
// GET  ?del=statistik&fran=&till= | &dagar=   (menyval statistik) → samma svar som besok ger statistiksidan
// GET  ?del=olyckor                     (menyval olyckor) → sidan Olyckor, olycksfacit/vyn.ts (DECISIONS #936)
// GET  ?del=olyckor&vy=kvalitet         (menyval olyckor) → sidan Kvalitet, kvalitetstavlan ur kvalitet_dag (DECISIONS #973)
// GET  ?del=anvandare                   (menyval anvandare) → [{id, epost, menyval, skapad}]
// POST {del:"anvandare", gor:"skapa", epost, losen, menyval}
// POST {del:"anvandare", gor:"andra", id, menyval?, losen?}
// POST {del:"anvandare", gor:"tabort", id}
// GET  ?del=mallar                      (menyval mallar) → [{slug, grupp, rubrik, ordning, andrad, andrad_av}]
// GET  ?del=mallar&slug=…               → dokumentet med sin text
// POST {del:"mallar", gor:"spara", slug, grupp, rubrik, text}
// POST {del:"mallar", gor:"tabort", slug}
// GET  ?del=social                     (menyval social) → [{namn, typ, pass, postas, antal, text, text_ig, status, andrad, andrad_av}]
//                                       utkasten som väntar eller är slängda och inte har postats (Halkvakt sql/134, DECISIONS #937)
// POST {del:"social", gor:"spara", namn, text, textIg} → ändrar texten i ett utkast som väntar
// POST {del:"social", gor:"slang" | "angra", namn}     → slänger utkastet, eller tar tillbaka det, fram till passet
// POST {del:"start", kod, epost, losen} → det första kontot, en gång, mot engångskoden i admin_start. Kräver ingen inloggning.
import { olycksfacitSvar } from "./olycksfacit.ts";
import { kvalitetSvar } from "./kvalitet.ts";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" };
const URSPRUNG = "https://admin.halkvakt.se";
const CORS = {
  "Access-Control-Allow-Origin": URSPRUNG,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Vary": "Origin",
};
const MENYVAL = ["statistik", "olyckor", "social", "mallar", "prioriteringar", "anvandare"];
const SLUG = /^[a-z0-9-]{1,60}$/;
const MINST_LOSEN = 12;

const svar = (kropp: unknown, status = 200) =>
  new Response(JSON.stringify(kropp), {
    status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const fel = (text: string, status: number) => svar({ fel: text }, status);

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const arDatum = (s: string) => DATUM.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) &&
  new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const renaMenyval = (v: unknown) =>
  Array.isArray(v) ? MENYVAL.filter((m) => v.includes(m)) : null;

type Jag = { id: string; epost: string; menyval: string[] };

async function vemAr(req: Request): Promise<Jag | null> {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const ur = await fetch(`${SB}/auth/v1/user`, { headers: { Authorization: `Bearer ${m[1]}`, apikey: SRK } });
  if (!ur.ok) return null;
  const u = await ur.json();
  if (!u?.id || !UUID.test(u.id)) return null;
  const br = await fetch(`${SB}/rest/v1/admin_behorighet?select=epost,menyval&anvandare=eq.${u.id}`, { headers: H });
  if (!br.ok) return null;
  const [rad] = await br.json();
  if (!rad) return null;
  return { id: u.id, epost: rad.epost, menyval: rad.menyval ?? [] };
}

async function skapaKonto(epost: string, losen: string): Promise<{ id?: string; fel?: string }> {
  const r = await fetch(`${SB}/auth/v1/admin/users`, {
    method: "POST", headers: H, body: JSON.stringify({ email: epost, password: losen, email_confirm: true }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.id) return { fel: r.status === 422 ? "adressen finns redan" : "kontot kunde inte skapas" };
  return { id: d.id };
}

async function sattBehorighet(id: string, epost: string, menyval: string[]) {
  const r = await fetch(`${SB}/rest/v1/admin_behorighet`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ anvandare: id, epost, menyval }),
  });
  return r.ok;
}

async function start(d: Record<string, unknown>) {
  const kod = typeof d.kod === "string" ? d.kod : "";
  const epost = typeof d.epost === "string" ? d.epost.trim().toLowerCase() : "";
  const losen = typeof d.losen === "string" ? d.losen : "";
  if (!kod || !EPOST.test(epost)) return fel("fel uppgifter", 400);
  if (losen.length < MINST_LOSEN) return fel(`lösenordet ska vara minst ${MINST_LOSEN} tecken`, 400);
  // The code is claimed by deleting its row; only one request can get the row back.
  const hash = await sha256(kod);
  const tr = await fetch(`${SB}/rest/v1/admin_start?id=eq.1&hash=eq.${hash}`, {
    method: "DELETE", headers: { ...H, Prefer: "return=representation" },
  });
  const tagna = tr.ok ? await tr.json() : [];
  if (!tagna.length) return fel("koden gäller inte", 401);
  const k = await skapaKonto(epost, losen);
  if (!k.id || !(await sattBehorighet(k.id, epost, MENYVAL))) {
    await fetch(`${SB}/rest/v1/admin_start`, {
      method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ id: 1, hash }),
    });
    return fel(k.fel ?? "kontot kunde inte skapas", 400);
  }
  return svar({ klart: true });
}

async function statistik(u: URL) {
  const fran = u.searchParams.get("fran") ?? "";
  const till = u.searchParams.get("till") ?? "";
  let sr: Response;
  if (fran || till) {
    const spann = (Date.parse(till + "T00:00:00Z") - Date.parse(fran + "T00:00:00Z")) / 86400000;
    if (!arDatum(fran) || !arDatum(till) || spann < 0 || spann > 400) return fel("fel datum", 400);
    sr = await fetch(`${SB}/rest/v1/rpc/besok_stat_period`, { method: "POST", headers: H, body: JSON.stringify({ fran, till }) });
  } else {
    const dagar = Math.min(365, Math.max(1, Number(u.searchParams.get("dagar")) || 30));
    sr = await fetch(`${SB}/rest/v1/rpc/besok_stat`, { method: "POST", headers: H, body: JSON.stringify({ dagar }) });
  }
  return new Response(await sr.text(), {
    status: sr.status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function listaAnvandare() {
  const r = await fetch(`${SB}/rest/v1/admin_behorighet?select=id:anvandare,epost,menyval,skapad&order=skapad.asc`, { headers: H });
  return new Response(await r.text(), {
    status: r.status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function andraAnvandare(jag: Jag, d: Record<string, unknown>) {
  if (d.gor === "skapa") {
    const epost = typeof d.epost === "string" ? d.epost.trim().toLowerCase() : "";
    const losen = typeof d.losen === "string" ? d.losen : "";
    const menyval = renaMenyval(d.menyval);
    if (!EPOST.test(epost) || !menyval) return fel("fel uppgifter", 400);
    if (losen.length < MINST_LOSEN) return fel(`lösenordet ska vara minst ${MINST_LOSEN} tecken`, 400);
    const k = await skapaKonto(epost, losen);
    if (!k.id) return fel(k.fel ?? "kontot kunde inte skapas", 400);
    if (!(await sattBehorighet(k.id, epost, menyval))) {
      await fetch(`${SB}/auth/v1/admin/users/${k.id}`, { method: "DELETE", headers: H });
      return fel("behörigheten kunde inte sparas", 500);
    }
    return svar({ id: k.id });
  }
  const id = typeof d.id === "string" && UUID.test(d.id) ? d.id.toLowerCase() : "";
  if (!id) return fel("fel uppgifter", 400);
  const finns = await fetch(`${SB}/rest/v1/admin_behorighet?select=epost&anvandare=eq.${id}`, { headers: H });
  const [rad] = finns.ok ? await finns.json() : [];
  if (!rad) return fel("användaren finns inte", 404);
  const jagSjalv = id === jag.id.toLowerCase();

  if (d.gor === "andra") {
    if (d.menyval !== undefined) {
      const menyval = renaMenyval(d.menyval);
      if (!menyval) return fel("fel uppgifter", 400);
      // Nobody removes their own way in to this page, so there is always someone who can manage users.
      if (jagSjalv && !menyval.includes("anvandare")) return fel("du kan inte ta bort din egen rätt till Användare", 400);
      const r = await fetch(`${SB}/rest/v1/admin_behorighet?anvandare=eq.${id}`, {
        method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ menyval }),
      });
      if (!r.ok) return fel("behörigheten kunde inte sparas", 500);
    }
    if (d.losen !== undefined) {
      const losen = typeof d.losen === "string" ? d.losen : "";
      if (losen.length < MINST_LOSEN) return fel(`lösenordet ska vara minst ${MINST_LOSEN} tecken`, 400);
      const r = await fetch(`${SB}/auth/v1/admin/users/${id}`, { method: "PUT", headers: H, body: JSON.stringify({ password: losen }) });
      if (!r.ok) return fel("lösenordet kunde inte bytas", 500);
    }
    return svar({ klart: true });
  }
  if (d.gor === "tabort") {
    if (jagSjalv) return fel("du kan inte ta bort dig själv", 400);
    const r = await fetch(`${SB}/rest/v1/admin_behorighet?anvandare=eq.${id}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
    if (!r.ok) return fel("användaren kunde inte tas bort", 500);
    await fetch(`${SB}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: H });
    return svar({ klart: true });
  }
  return fel("okänd åtgärd", 400);
}

async function lasMallar(u: URL) {
  const slug = u.searchParams.get("slug") ?? "";
  if (slug && !SLUG.test(slug)) return fel("fel uppgifter", 400);
  const q = slug
    ? `select=slug,grupp,rubrik,text,ordning,andrad,andrad_av&slug=eq.${slug}`
    : "select=slug,grupp,rubrik,ordning,andrad,andrad_av&order=grupp.asc,ordning.asc,rubrik.asc";
  const r = await fetch(`${SB}/rest/v1/admin_dokument?${q}`, { headers: H });
  if (!r.ok) return fel("kunde inte läsa", 500);
  const rader = await r.json();
  if (!slug) return svar(rader);
  return rader[0] ? svar(rader[0]) : fel("dokumentet finns inte", 404);
}

async function andraMallar(jag: Jag, d: Record<string, unknown>) {
  const slug = typeof d.slug === "string" && SLUG.test(d.slug) ? d.slug : "";
  if (!slug) return fel("fel uppgifter", 400);
  if (d.gor === "spara") {
    const grupp = typeof d.grupp === "string" ? d.grupp.trim().slice(0, 60) : "";
    const rubrik = typeof d.rubrik === "string" ? d.rubrik.trim().slice(0, 120) : "";
    const text = typeof d.text === "string" ? d.text.slice(0, 60000) : "";
    if (!grupp || !rubrik) return fel("grupp och rubrik behövs", 400);
    const r = await fetch(`${SB}/rest/v1/admin_dokument`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ slug, grupp, rubrik, text, andrad: new Date().toISOString(), andrad_av: jag.epost }),
    });
    return r.ok ? svar({ klart: true }) : fel("kunde inte spara", 500);
  }
  if (d.gor === "tabort") {
    const r = await fetch(`${SB}/rest/v1/admin_dokument?slug=eq.${slug}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
    return r.ok ? svar({ klart: true }) : fel("kunde inte ta bort", 500);
  }
  return fel("okänd åtgärd", 400);
}

// Halkvakt live's day posts wait 30 minutes as drafts (Halkvakt sql/134, DECISIONS #937). Only a draft whose time has not
// come can change; once posta.mjs has posted it, the row says postad and is left alone.
const UTKASTNAMN = /^\d{4}-\d{2}-\d{2}-(morgon|lunch|kvall)$/;
const MAX_TEXT = 2200;   // Instagram's caption limit; Facebook takes more, but one limit for both keeps them comparable.

async function lasUtkast() {
  const r = await fetch(`${SB}/rest/v1/social_utkast?select=namn,typ,pass,postas,antal,text,text_ig,status,andrad,andrad_av&status=neq.postad&postas=gt.${new Date(Date.now() - 36e5).toISOString()}&order=postas.asc`, { headers: H });
  return r.ok ? svar(await r.json()) : fel("kunde inte läsa utkasten", 500);
}

async function andraUtkast(jag: Jag, d: Record<string, unknown>) {
  const namn = typeof d.namn === "string" && UTKASTNAMN.test(d.namn) ? d.namn : "";
  if (!namn) return fel("fel uppgifter", 400);
  const nu = new Date().toISOString();
  let andring: Record<string, unknown>, villkor: string;
  if (d.gor === "spara") {
    const text = typeof d.text === "string" ? d.text.trim() : "", textIg = typeof d.textIg === "string" ? d.textIg.trim() : "";
    if (!text || !textIg) return fel("båda texterna behövs", 400);
    if (text.length > MAX_TEXT || textIg.length > MAX_TEXT) return fel(`högst ${MAX_TEXT} tecken`, 400);
    andring = { text, text_ig: textIg }; villkor = "status=eq.vantar";
  } else if (d.gor === "slang") {
    andring = { status: "slangd" }; villkor = "status=eq.vantar";
  } else if (d.gor === "angra") {
    andring = { status: "vantar" }; villkor = "status=eq.slangd";
  } else return fel("okänd åtgärd", 400);
  const r = await fetch(`${SB}/rest/v1/social_utkast?namn=eq.${namn}&${villkor}&postas=gt.${nu}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ ...andring, andrad: nu, andrad_av: jag.epost }),
  });
  if (!r.ok) return fel("kunde inte spara", 500);
  const [rad] = await r.json();
  return rad ? svar({ klart: true }) : fel("utkastet går inte att ändra längre", 409);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const u = new URL(req.url);
    let d: Record<string, unknown> = {};
    if (req.method === "POST") {
      d = JSON.parse((await req.text()).slice(0, 200000) || "{}");
      if (d.del === "start") return await start(d);
    } else if (req.method !== "GET") {
      return fel("fel metod", 405);
    }
    const jag = await vemAr(req);
    if (!jag) return fel("inte inloggad", 401);
    const del = req.method === "POST" ? String(d.del ?? "") : (u.searchParams.get("del") ?? "");
    if (del === "jag" && req.method === "GET") return svar({ epost: jag.epost, menyval: jag.menyval });
    if (!MENYVAL.includes(del)) return fel("okänd del", 400);
    if (!jag.menyval.includes(del)) return fel("saknar behörighet", 403);
    if (del === "statistik" && req.method === "GET") return await statistik(u);
    if (del === "olyckor" && req.method === "GET") {   // menyvalet Olyckor (DECISIONS #936), och kvalitetstavlan under det (DECISIONS #973)
      return svar(u.searchParams.get("vy") === "kvalitet" ? await kvalitetSvar() : await olycksfacitSvar());
    }
    if (del === "anvandare") return req.method === "GET" ? await listaAnvandare() : await andraAnvandare(jag, d);
    if (del === "social") return req.method === "GET" ? await lasUtkast() : await andraUtkast(jag, d);
    if (del === "mallar") return req.method === "GET" ? await lasMallar(u) : await andraMallar(jag, d);
    return fel("delen är inte byggd än", 404);
  } catch (_e) {
    return fel("internt fel", 500);
  }
});
