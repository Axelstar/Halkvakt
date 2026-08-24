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
   *Unblocked when David creates public repo `halkvakt-karta` + extends token scope (see STATUS). Waitlist per DECISIONS #10 included.*
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

## Questions for David
All seven answered 2026-08-24 → DECISIONS.md #8–11. No open questions.
