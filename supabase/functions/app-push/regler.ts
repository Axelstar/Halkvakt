// APP-PUSH, reglerna (DECISIONS #924). Ren kod utan import, så att den prövas i test/app-push.test.ts.
export type Utskick = { slag: "prov" | "varning" | "erbjudande"; rubrik: string; text: string };

// Det Apple tar emot. Ingenting om föraren: bara rubriken och texten, som är desamma för alla i utskicket.
export function apnsKropp(u: Utskick): string {
  return JSON.stringify({ aps: { alert: { title: u.rubrik, body: u.text }, "thread-id": `halkvakt.${u.slag}` } });
}

// En notisadress som Apple säger är död tas bort ur app_enhet. Allt annat är ett fel hos oss eller hos Apple, och adressen står kvar.
export function dodAdress(status: number, reason: string | undefined): boolean {
  return status === 410 || (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
}

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));
export const b64urlBytes = b64url;

// Nyckelfilens innehåll (PEM) till de råa byten som WebCrypto vill ha.
export function pemTillDer(pem: string): Uint8Array {
  const b = atob(pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, ""));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
