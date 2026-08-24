// SMHI impact-based warnings (öppna data, CC, no key). ~10-20 active areas at any time.
// Winter payoff: SNOW_ICE / icing events arrive with county polygons we can corridor-match.
// Policy: store ALL current warnings (tiny volume, replace-all per sync) + append-only
// history for the archive. Winter relevance is a flag, not a filter — we keep everything.

export interface SmhiWarningArea {
  areaId: number;
  warningId: number;
  eventCode: string;        // e.g. "SNOW_ICE", "WIND", "WATER_SHORTAGE"
  eventSv: string;          // "Snöfall och ishalka"
  levelCode: string;        // "MESSAGE" | "YELLOW" | "ORANGE" | "RED"
  levelSv: string;
  descriptionSv: string | null;
  areaName: string | null;  // "Skåne län" (may be null for drawn areas)
  affectedAreas: { id: number; sv: string }[];
  geometry: object | null;  // GeoJSON geometry (Polygon/MultiPolygon)
  approximateStart: string | null;
  approximateEnd: string | null;
  published: string;
}

const API = "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json";
const UA = "Halkvakt/0.1 (+https://axelstar.github.io/halkvakt-karta/; bot@halkvakt.dev)";

/** Events that matter for winter driving. Kept broad on the wind side: drifting snow. */
const WINTER_CODES = /SNOW|ICE|ICING|COLD|WIND/i;
export function isWinterRelevant(eventCode: string): boolean {
  return WINTER_CODES.test(eventCode);
}

interface RawWarning {
  id: number;
  event: { code: string; sv: string };
  warningAreas: {
    id: number;
    approximateStart?: string;
    approximateEnd?: string;
    published: string;
    areaName?: { sv?: string };
    warningLevel: { code: string; sv: string };
    eventDescription?: { sv?: string };
    affectedAreas?: { id: number; sv: string }[];
    area?: { geometry?: object };
  }[];
}

export function parseWarnings(raw: RawWarning[]): SmhiWarningArea[] {
  const out: SmhiWarningArea[] = [];
  for (const w of raw) {
    for (const a of w.warningAreas ?? []) {
      out.push({
        areaId: a.id,
        warningId: w.id,
        eventCode: w.event.code,
        eventSv: w.event.sv,
        levelCode: a.warningLevel.code,
        levelSv: a.warningLevel.sv,
        descriptionSv: a.eventDescription?.sv ?? null,
        areaName: a.areaName?.sv ?? null,
        affectedAreas: a.affectedAreas ?? [],
        geometry: a.area?.geometry ?? null,
        approximateStart: a.approximateStart ?? null,
        approximateEnd: a.approximateEnd ?? null,
        published: a.published,
      });
    }
  }
  return out;
}

export async function fetchSmhiWarnings(): Promise<{ items: SmhiWarningArea[] }> {
  const res = await fetch(API, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`SMHI HTTP ${res.status}`);
  return { items: parseWarnings(await res.json()) };
}
