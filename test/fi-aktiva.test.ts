// Digitraffic v2 (ärende #1327): bara aktiva trafikmeddelanden når fi.deviations, som med v1:s inactiveHours=0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aktiva } from "../ingest/fi-aktiva.ts";

const NU = new Date("2026-11-04T16:30:00Z");
const m = (id: string, endTime?: string | null) => ({
  properties: { situationId: id, announcements: [{ timeAndDuration: { startTime: "2026-11-01T00:00:00.000Z", ...(endTime === undefined ? {} : { endTime }) } }] },
});

test("fi: v2:s avslutade trafikmeddelanden tas bort, de utan sluttid eller med sluttid framåt står kvar", () => {
  const ut = aktiva([
    m("utan"), m("null", null), m("fram", "2026-11-30T13:00:00.000Z"),
    m("slut", "2026-11-04T15:35:20.963Z"),   // ett av de tre avslutade som v2 gav 4/11
    m("precis", "2026-11-04T16:30:00.000Z"), // slutar just nu: inte längre aktivt
    { properties: { situationId: "tom", announcements: [] } },  // ingen annons: fi.ts hoppar över den själv
  ], NU);
  assert.deepEqual(ut.map((f) => f.properties.situationId), ["utan", "null", "fram", "tom"]);
});
