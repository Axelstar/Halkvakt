// Ordlistan för halkolyckorna (FORREGISTRERING-OLYCKOR-2024-25 §2, DECISIONS #697): skuggfacitets Postgres-mönster
// (HANDELSE_SQL, `~*` med \m och \M) översatt till JavaScript i kuvos/olyckor-trv.ts. Provet kör samma påhittade meningar genom
// Postgres och genom översättningen, hela listan och ord för ord, och kräver samma svar. Hoppas över utan TEST_DATABASE_URL
// (lokalt utan Docker); i ci körs det mot tjänstens PostGIS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDLISTA, ORD, HALK, ORD_RE, PROVMENINGAR } from "../kuvos/olyckor-trv.ts";

const url = process.env.TEST_DATABASE_URL;

test("ordlistan: översättningen ger förregistreringens svar på de påhittade meningarna", () => {
  for (const [mening, hela, ord] of PROVMENINGAR) {
    assert.equal(HALK.test(mening), hela, mening);
    assert.deepEqual(ORD.filter((_, i) => ORD_RE[i].test(mening)), ord, mening);
  }
});

test("ordlistan: Postgres ~* och översättningen ger samma träffar", { skip: !url }, async () => {
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const [{ ctype }] = (await db.query("SELECT current_setting('lc_ctype') AS ctype")).rows;
    for (const [mening] of PROVMENINGAR) {
      const { rows } = await db.query("SELECT $1 ~* $2 AS hela, array(SELECT $1 ~* o FROM unnest($3::text[]) WITH ORDINALITY AS u(o, i) ORDER BY i) AS ord",
        [mening, ORDLISTA, ORD]);
      assert.equal(HALK.test(mening), rows[0].hela, `${mening} (lc_ctype ${ctype})`);
      assert.deepEqual(ORD_RE.map((re) => re.test(mening)), rows[0].ord, `${mening} (lc_ctype ${ctype})`);
    }
  } finally {
    await db.end();
  }
});
