// APP-ENHET, reglerna (DECISIONS #917). Ren kod utan import, så att samma regler prövas i test/app-enhet.test.ts.
// Det enda appen får skicka: {id, app, kommun, token?, erbj?}. Allt annat avvisas, så att formen är skyddet (som app-raknare).
export const MAX_BYTES = 768;
// Länskoderna (kommunkodens två första siffror). 02, 11, 15 och 16 finns inte.
const LAN = new Set(["01", "03", "04", "05", "06", "07", "08", "09", "10", "12", "13", "14", "17", "18", "19", "20", "21", "22", "23", "24", "25"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = /^[A-Za-z0-9:_-]{32,512}$/;   // APNs: 64 hex; FCM: omkring 160 tecken med kolon, streck och understreck

export type Enhet = { id: string; app: "ios" | "android"; kommun: string; token: string | null; erbj: boolean };

export function lasId(d: unknown): string | null {
  const id = (d as { id?: unknown })?.id;
  return typeof id === "string" && UUID.test(id.toLowerCase()) ? id.toLowerCase() : null;
}

// Null när något inte stämmer. Ett okänt fält fäller anropet: appen ska inte kunna skicka mer än beslutet säger.
export function lasEnhet(d: unknown): Enhet | null {
  if (typeof d !== "object" || d === null || Array.isArray(d)) return null;
  const o = d as Record<string, unknown>;
  if (Object.keys(o).some((k) => !["id", "app", "kommun", "token", "erbj"].includes(k))) return null;
  const id = lasId(o);
  const app = o.app === "ios" || o.app === "android" ? o.app : null;
  const kommun = typeof o.kommun === "string" && /^[0-9]{4}$/.test(o.kommun) && LAN.has(o.kommun.slice(0, 2)) ? o.kommun : null;
  if (!id || !app || !kommun) return null;
  if (o.token !== undefined && o.token !== null && !(typeof o.token === "string" && TOKEN.test(o.token))) return null;
  if (o.erbj !== undefined && typeof o.erbj !== "boolean") return null;
  return { id, app, kommun, token: (o.token as string | null | undefined) ?? null, erbj: o.erbj === true };
}
