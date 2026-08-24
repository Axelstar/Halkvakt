// Polisen öppna händelse-API — viltolyckor ("Trafikolycka, vilt"). No key required.
// HONESTY NOTE (DECISIONS #13): location.gps is the COUNTY CENTROID, not the crash site.
// These events must never drive point-precision voice warnings. Their value:
//   1. Archive from day one — the free-text summaries name road + species + locality
//      ("...en älg på E45, Sänna") in ~2/3 of events. Months of this = our own
//      road-level hotspot dataset that no competitor can backfill.
//   2. County-level freshness stats for the public map ticker.
// The A4 voice alert stays dormant until extracted hotspots reach segment quality.

export interface WildlifeEvent {
  eventId: number;
  datetime: string;        // ISO 8601
  countyName: string;      // "Jämtlands län"
  lon: number;             // county centroid — see honesty note
  lat: number;
  summary: string;
  url: string;
  roadNumber: string | null;  // extracted: "E45", "395", "108"
  species: string | null;     // extracted: "älg", "rådjur", "ren", ...
  placeHint: string | null;   // extracted locality after the road mention
}

const API = "https://polisen.se/api/events?type=Trafikolycka%2C%20vilt";
const UA = "Halkvakt/0.1 (+https://axelstar.github.io/halkvakt-karta/; bot@halkvakt.dev)";

const SPECIES =
  /(?<![a-zåäö])(älg(?:ar|en)?|rådjur(?:et)?|vildsvin(?:et)?|kronhjort(?:en)?|dovhjort(?:en)?|hjort(?:en|ar)?|ren(?:en|ar)?|mufflonf?år|björn(?:en)?|varg(?:en)?|lodjur(?:et)?|utter(?:n)?)(?![a-zåäö])/i;

const ROAD =
  /(?:\bE\s?(\d{1,3})\b|\b(?:läns|riks)?väg(?:en)?\s+(\d{1,4})\b|\bR[Vv]\s?(\d{1,3})\b)/;

/** Normalize species to base form (älgen → älg). */
function baseSpecies(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/(ar|en|et|n)$/u, (m, _o, s: string) => {
      const stem = raw.toLowerCase().slice(0, -m.length);
      return ["älg", "rådjur", "vildsvin", "hjort", "kronhjort", "dovhjort", "ren", "björn", "varg", "lodjur", "utter"]
        .includes(stem) ? "" : m;
    });
}

export function extract(summary: string): Pick<WildlifeEvent, "roadNumber" | "species" | "placeHint"> {
  const sp = SPECIES.exec(summary);
  const rd = ROAD.exec(summary);
  const roadNumber = rd ? (rd[1] ? `E${rd[1]}` : (rd[2] ?? rd[3])) : null;
  let placeHint: string | null = null;
  if (rd) {
    // "...på E45, Sänna." / "...länsväg 340 söder om Rötviken."
    const tail = summary.slice(rd.index + rd[0].length);
    const m = /^[,\s]*((?:i höjd med|söder om|norr om|öster om|väster om|vid|utanför|mellan)?\s*[A-ZÅÄÖ][\wåäöÅÄÖ-]+(?:\s+och\s+[A-ZÅÄÖ][\wåäöÅÄÖ-]+)?)/u.exec(tail);
    if (m) placeHint = m[1].trim();
  }
  return { roadNumber, species: sp ? baseSpecies(sp[1]) : null, placeHint };
}

interface RawEvent {
  id: number; datetime: string; summary: string; url: string; type: string;
  location: { name: string; gps: string };
}

export function parseEvents(raw: RawEvent[]): WildlifeEvent[] {
  const out: WildlifeEvent[] = [];
  for (const e of raw) {
    if (e.type !== "Trafikolycka, vilt") continue; // defensive: API filter has surprised us before
    const [latS, lonS] = e.location.gps.split(",");
    const lat = Number(latS), lon = Number(lonS);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    // "2026-08-23 9:43:26 +02:00" — note SINGLE-digit hours; zero-pad to valid ISO.
    const dm = /^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2}):(\d{2}) ([+-]\d{2}:\d{2})$/.exec(e.datetime);
    if (!dm) continue;
    const iso = `${dm[1]}T${dm[2].padStart(2, "0")}:${dm[3]}:${dm[4]}${dm[5]}`;
    out.push({
      eventId: e.id,
      datetime: iso,
      countyName: e.location.name,
      lon, lat,
      summary: e.summary,
      url: `https://polisen.se${e.url}`,
      ...extract(e.summary),
    });
  }
  return out;
}

export async function fetchWildlifeEvents(): Promise<{ items: WildlifeEvent[] }> {
  const res = await fetch(API, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`polisen.se HTTP ${res.status}`);
  return { items: parseEvents(await res.json()) };
}
