// KUVÖSENS MOLN (kort #232, DECISIONS #441, #455): publish/moln.ts:s källa, men ur kuvösens SMHI-arkiv (`kuvos_ra.smhi_obs`,
// parameter 16, total molnmängd) i stället för SMHI:s API. API:ts `latest-months` når inte vintern 2024/25. Klassningen, radien och
// tidsfönstret är driftens (klassaMoln, MAX_MOLN_KM, MAX_MOLN_MIN); taket på antalet stationer finns bara för API-anropen och gäller
// inte här. Stationens läge är det som stod i arkivet för vintern (smhi-vinter.ts tar läget ur perioden som täcker raden).
import type { Molnkalla } from "../publish/moln.ts";

export const MOLN_PARAMETER = 16;

export function arkivetsMoln(q: (sql: string, p?: unknown[]) => Promise<any[]>): Molnkalla {
  return {
    namn: "kuvösens SMHI-arkiv",
    stationer: async () => (await q(
      `SELECT DISTINCT ON (station_id) station_id AS id, lon, lat FROM kuvos_ra.smhi_obs
       WHERE parameter = $1 AND lon IS NOT NULL ORDER BY station_id, tid DESC`, [MOLN_PARAMETER]))
      .map((r) => ({ id: String(r.id), lon: Number(r.lon), lat: Number(r.lat) })),
    serie: async (id) => {
      const m = new Map<number, number>();
      for (const r of await q(`SELECT extract(epoch FROM tid) / 60 AS t, varde FROM kuvos_ra.smhi_obs
          WHERE parameter = $1 AND station_id = $2 AND varde IS NOT NULL`, [MOLN_PARAMETER, id]))
        m.set(Number(r.t), Number(r.varde));
      return m;
    },
    tak: Infinity,
  };
}
