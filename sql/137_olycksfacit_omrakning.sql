-- 137: olyckorna 5–12/11 räknas om med dagens klassning (Bengt 21/11: "gör c", förslag 1 för de oklara; DECISIONS #939).
--
-- Olyckorna som kontrollerades före sql/110 (13/11, DECISIONS #852) saknar olycksart och klassades med den gamla regeln för TROLIG
-- (texten säger singel…). 197 av dem står som OKLAR, och 24 av de 197 hade frusen yta och fukt eller rimfrost.
-- Den här filen ger dem arten och klassen enligt tröskeldokumentet §4 och §11.2, räknade på de mått som sparades vid kontrollen:
-- text_efter, yta_min, fukt_efter och rimfrost_efter läses inte om. Väderraderna från 5–7/11 är redan raderade (golvet 14 dygn,
-- sql/072), så en ny efterkontroll skulle ge "ingen station" i stället. Måtten står alltså kvar med det gamla fönstret
-- (två timmar före till två timmar efter starten, §3 före #852 D1).
--
-- CASE nedan är olycksfacit_efterkontroll() i sql/110 ordagrant, med de sparade måtten i stället för variablerna.
-- Bara rader utan art och med en klass rörs, så filen kan köras igen utan att ändra något mer. TILLBAKA: inte möjligt ur filen;
-- den gamla klassen står i dbknapp-körningens bevisrader före ändringen.

UPDATE olycksfacit f SET
  art = x.ar,
  klass = x.kl,
  klass_skal = CASE x.kl
    WHEN 'TYDLIG' THEN 'halkord i texten och yta ≤ +1 °C'
    WHEN 'TROLIG' THEN CASE WHEN x.ar = 'flera fordon' THEN 'kollision' ELSE 'singelolycka' END || ', yta ≤ 0 °C och ' ||
                       CASE WHEN f.fukt_efter THEN 'fukt' ELSE 'rimfrost' END
    WHEN 'INTE' THEN CASE WHEN f.yta_min > 3 AND x.alla !~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)'
                          THEN 'yta över +3 °C' ELSE 'vilt' END
    ELSE CASE WHEN f.yta_min IS NULL THEN 'ingen vaktad station inom 15 km' ELSE 'övrigt i kallt väder' END END
FROM (
  SELECT g.deviation_id, g.alla, g.ar, CASE
      WHEN g.alla ~* '(^|[^a-zåäö])(vilt[a-zåäö]*|älg[a-zåäö]*|rådjur[a-zåäö]*|hjort[a-zåäö]*|vildsvin[a-zåäö]*|ren|renar|renen|djur[a-zåäö]*)([^a-zåäö]|$)' THEN 'INTE'
      WHEN g.alla ~* '(^|[^a-zåäö])(hal|halt|halk[a-zåäö]*|is|isen|isig[a-zåäö]*|ishalk[a-zåäö]*|sladd[a-zåäö]*|glashal[a-zåäö]*|blixthalk[a-zåäö]*)([^a-zåäö]|$)'
           AND g.yta_min <= 1 THEN 'TYDLIG'
      WHEN g.ar IN ('ett fordon', 'flera fordon') AND g.yta_min <= 0 AND (g.fukt_efter OR g.rimfrost_efter) THEN 'TROLIG'
      WHEN g.yta_min > 3 THEN 'INTE'
      ELSE 'OKLAR' END AS kl
  FROM (SELECT o.deviation_id, o.yta_min, o.fukt_efter, o.rimfrost_efter, h.alla, olycksart(h.alla) AS ar
        FROM olycksfacit o, LATERAL (SELECT coalesce(o.message, '') || ' | ' || coalesce(o.text_efter, '') AS alla) h
        WHERE o.art IS NULL AND o.klass IS NOT NULL AND o.kontrollerad_at IS NOT NULL) g
) x
WHERE f.deviation_id = x.deviation_id;
