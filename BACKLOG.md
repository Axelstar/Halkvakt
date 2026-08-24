# BACKLOG — ordered. Any session: take the top unblocked item, build, verify, commit, update STATUS.md.

1. ~~Self-steering layer~~ (this commit): CI integration tests vs throwaway PostGIS,
   hourly health check → auto GitHub Issue, docs, session protocol.
   *Verify: ci.yml green; healthcheck dispatch green; issue created on simulated failure.*
2. **Public map** (marketing engine, PLAN §8.1): new PUBLIC repo `halkvakt-karta`
   (GitHub Pages is free only on public repos; main repo stays private). MapLibre +
   OSM, layers from a small read-only JSON published by a new `publish-map-data`
   workflow (writes latest state to the public repo every 30 min; service-role key
   NOT exposed — static JSON only). Swedish UI, "Appen kommer i november" banner.
   *Verify: page loads on phone; all 4 layers render; data ≤ 35 min old; no secrets in public repo.*
   *Blocked on: David Q2 (public repo ok) — Q1 (domain) can follow later, Pages URL works meanwhile.*
3. **Alert engine v0 + replay harness**: pure TS module, corridor matching,
   discipline rules (PLAN §1) as JSON test vectors in engine/vectors/.
   *Verify: replay of synthetic + recorded traces gives byte-identical alert logs on rerun; all vectors green.*
4. **Wildlife layer**: polisen.se events ingester (Viltolycka) + NVR historical
   hotspot model (static seasonal/hourly risk scores).
   *Verify: polisen events land in DB with geometry; risk table covers top roads; vectors for A4 timing.*
5. **SMHI warnings ingester** (county-level halka warnings). *Verify: fixture test + rows in DB.*
6. **Snapshot builder**: per-län gzipped JSON (static + live), manifest w/ checksums,
   published via workflow. *Verify: <3 MB/län gzipped; freshness ≤6 min; checksum validation test.*
7. **Android app skeleton** (needs Play account ~w40): foreground service, auto
   start/stop, TTS, engine integration. *Verify: PLAN §4 Phase 2 road-test checklist.*

## Questions for David (answer in chat; I log answers in DECISIONS.md)
Q1. Buy **halkvakt.se** now (~150 kr/yr)? Registrar suggestion: Loopia or one.com.
Q2. OK to create a separate **public** repo `halkvakt-karta` for the map site?
    (Contains only map code + open data — no plan/strategy docs.)
Q3. Map goes public in September, before the app — confirmed? (build-in-public)
Q4. Google Play account as **privatperson** or **företag**? (Company needs org.nr;
    affects the developer name shown in the store.)
Q5. Will you front the beta-recruitment posts in Oct (I draft, you post)?
Q6. Email capture on the map: I pick a free form service; you create the account
    when I ask (~5 min) — OK?
Q7. Standing mandate confirmed? = I decide + log everything that doesn't touch
    money, law, or brand, without asking. (Already PLAN §7; confirming explicitly.)
