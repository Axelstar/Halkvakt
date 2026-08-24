// Trafikverket open API v2 client. One function, no framework.
// Docs: https://data.trafikverket.se/documentation

const ENDPOINT = "https://api.trafikinfo.trafikverket.se/v2/data.json";

export interface TvQuery {
  objecttype: string;
  schemaversion: string;
  namespace?: string; // e.g. "road.trafficinfo" (required for Situation)
  changeid?: string;  // "0" = full sync; LASTCHANGEID from previous run = delta
  limit?: number;
  filterXml?: string; // raw <FILTER>...</FILTER> body, optional
  includeDeleted?: boolean;
}

export interface TvResult<T> {
  items: T[];
  lastChangeId?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function tvFetch<T = unknown>(apiKey: string, q: TvQuery): Promise<TvResult<T>> {
  const attrs = [
    `objecttype="${esc(q.objecttype)}"`,
    `schemaversion="${esc(q.schemaversion)}"`,
    q.namespace ? `namespace="${esc(q.namespace)}"` : "",
    q.changeid !== undefined ? `changeid="${esc(q.changeid)}"` : "",
    q.limit !== undefined ? `limit="${q.limit}"` : "",
    q.includeDeleted ? `includedeletedobjects="true"` : "",
  ].filter(Boolean).join(" ");

  const body =
    `<REQUEST><LOGIN authenticationkey="${esc(apiKey)}" />` +
    `<QUERY ${attrs}>${q.filterXml ?? ""}</QUERY></REQUEST>`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  if (!res.ok) throw new Error(`Trafikverket HTTP ${res.status}`);

  const json = await res.json() as any;
  const result = json?.RESPONSE?.RESULT?.[0];
  if (result?.ERROR) {
    throw new Error(`Trafikverket API error [${result.ERROR.SOURCE}]: ${result.ERROR.MESSAGE}`);
  }
  return {
    items: (result?.[q.objecttype] ?? []) as T[],
    lastChangeId: result?.INFO?.LASTCHANGEID,
  };
}

// "POINT (18.04221 59.38437)" -> { lon, lat } | null
export function parseWgs84Point(wkt?: string): { lon: number; lat: number } | null {
  const m = wkt?.match(/POINT \(([-\d.]+) ([-\d.]+)\)/);
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}
