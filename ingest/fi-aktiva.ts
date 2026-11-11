// Digitraffics trafikmeddelanden v2 (/traffic-message/v2/traffic-announcements, ärende #1327). v1:s inactiveHours=0 finns inte
// längre, och v2 tar med meddelanden som redan har avslutats. Ett meddelande är aktivt när dess första annons saknar sluttid eller
// slutar efter `nu` — samma annons som ingest/fi.ts läser. Läst 4/11: v2 gav 11, varav 3 avslutade samma dag; de 8 andra var v1:s.
type Meddelande = { properties?: { announcements?: { timeAndDuration?: { endTime?: string | null } }[] } };

export function aktiva<T extends Meddelande>(features: T[], nu: Date): T[] {
  return features.filter((f) => {
    const slut = f.properties?.announcements?.[0]?.timeAndDuration?.endTime;
    return !slut || Date.parse(slut) > nu.getTime();
  });
}
