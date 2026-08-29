# Project Plan — Nordic Winter Driving Safety App
**Working title: "Halkvakt" (see Naming, §10). Codename used below: HV.**
**Version 1.0 — 2026-08-24. Owner of execution: Claude. Overseer: Axel.**

---

## 1. Product definition

**Positioning:** The winter-conditions layer Google Maps doesn't have. A background companion
app for Swedish drivers that speaks up — over the car speakers — when the road ahead is icy,
when wildlife risk is high, and (as a free bundled extra) when a speed camera is coming up.

**One-line pitch (Swedish, for the store listing):**
"Appen som varnar för halka, vilt och fartkameror — medan du kör med Google Maps."

**Core mechanic:** Install once. The app auto-detects driving (activity recognition +
car Bluetooth connection), runs silently in the background, matches GPS position against an
on-device copy of national road data, and fires short spoken warnings that duck whatever
audio is playing. The user never has to open it.

**What is deliberately NOT in v1:** navigation, maps in the app beyond a status screen,
iOS, Norway/Finland, crowdsourced reports, accounts/login, any paid tier. v1 is free.
Monetization begins Phase 4 — trust and installed base first.

### Alert taxonomy (v1)

| # | Alert | Source | Trigger logic | Voice line (SV) |
|---|-------|--------|---------------|-----------------|
| A1 | Slippery segment | Trafikverket `RoadCondition` (operator-classified segments: halka, is/snö, snötäckt) | Route corridor intersects an active segment; warn ~30 s before entry, speed-scaled | "Varning: halka rapporterad på vägen framför dig." |
| A2 | Icing risk (point) | `WeatherMeasurepoint` (road surface temp ≤ +1 °C AND moisture/precip) | Approaching a station in corridor showing icing conditions | "Isrisk framöver — vägbanan nära noll grader." |
| A3 | Accident / incident ahead | `Situation` (accident, stopped vehicle, roadwork with lane closure) | Corridor intersects situation geometry, ≤ 10 km ahead | "Olycka rapporterad X kilometer framför dig." |
| A4 | Wildlife risk zone | Historical collision hotspots (NVR stats) × month × hour-of-day + Polisen events API ("viltolycka") for fresh collisions | Entering top-decile risk segment during elevated hours (dawn/dusk, Sep–Jan peak) | "Viltrisk — vanlig olycksplats för älg den här tiden." |
| A5 | Speed camera (free extra) | `TrafficSafetyCamera` (CC0, 2 771 sites) | 500 m before site in direction of travel; suppress if user below limit? No — v1 always announces, keep it simple | "Fartkamera om 500 meter. Gränsen är 80." |

**Alert discipline rules (hard requirements, tested):**
- Max 1 spoken alert per 45 s; priority order A3 > A1 > A2 > A4 > A5; lower priority dropped, not queued.
- Same alert never repeats within 10 min / 5 km.
- Warning copy states what the data supports. Never "black ice 400 m ahead" from a station
  12 km away. Segment alerts may say "on the road ahead"; point alerts say "framöver".
- Silence is the default. A drive with no hazards is a silent drive. The product's
  credibility = precision, not volume.

---

## 2. Architecture

**Principle: on-device matching against CDN-served snapshot files. No per-user server traffic.**

```
Trafikverket API ─┐
Polisen events ───┤   Ingesters (cron, every 5 min)          Phone (Android, Kotlin)
SMHI warnings ────┘        │                                  ┌──────────────────────┐
                     PostGIS (Supabase free)                  │ Snapshot sync (5 min │
                           │                                  │  when driving, wifi/ │
                     Snapshot builder                         │  cellular, ~1–3 MB)  │
                           │                                  │ Foreground service:  │
                     Versioned files on                       │  fused location,     │
                     Cloudflare R2/Pages CDN  ───────────────▶│  corridor matcher,   │
                     (static, cache 5 min)                    │  alert engine, TTS   │
                                                              └──────────────────────┘
```

Why this shape:
- **Cost:** serving a static file scales to any user count at 0 kr. No API per GPS ping.
- **Coverage:** works offline through Norrland dead zones (last snapshot stays valid;
  static layers — cameras, wildlife — never expire).
- **Privacy:** no location ever leaves the phone. This is both the GDPR posture and a
  headline marketing claim. The backend cannot know where any user is, by construction.

### Backend components
- **Ingesters** (TypeScript, run on GitHub Actions schedule, later Supabase Edge Functions
  if Actions cadence is too coarse): one module per source, delta-sync via Trafikverket
  `changeid`, idempotent upserts.
- **PostGIS schema:** `cameras`, `weather_points`, `road_conditions` (linestrings),
  `situations`, `wildlife_risk` (precomputed segment scores), `snapshots` (audit log).
  All geometry in SWEREF99 internally? No — WGS84 throughout; simplicity first.
- **Snapshot builder:** emits per-region (län-level, 21 files) gzipped JSON:
  static layer (cameras, wildlife — daily) + live layer (conditions, weather, situations —
  every 5 min). Target < 3 MB gzipped per län live file. Version + checksum in manifest.

### Android app (native Kotlin)
Decision: **native Kotlin, not React Native/Expo.** Rationale: the hard 20 % of this app
(foreground location service, activity-recognition auto-start, audio focus, Bluetooth
routing, Doze/OEM battery-killer survival) is all platform-specific anyway; the UI is
three screens. Native removes a whole class of background-reliability bugs. Cost: the
future iOS app is a separate Swift build — mitigated by writing the **alert engine as a
pure, platform-free module with a shared JSON test-vector suite** (input: GPS trace +
snapshot; output: expected alert sequence). Both platforms must pass identical vectors.

Key implementation points:
- Foreground service with `type=location`, persistent low-key notification ("Halkvakt
  aktiv — inga varningar just nu"). Required by Android; also our reassurance UI.
- **Auto start/stop:** Activity Recognition (IN_VEHICLE) OR connection to a user-designated
  car Bluetooth device starts the service; 10 min stationary/on-foot stops it. Manual
  override in app. This is the "install once, forget it" UX and a differentiator —
  competitors make you remember to launch.
- Adaptive sampling: GPS at 1 Hz above 30 km/h, drop to significant-motion below.
  Battery budget: **< 8 %/h screen-off, verified in Phase 2.**
- Audio: `AudioFocusRequest GAIN_TRANSIENT_MAY_DUCK`, Swedish `TextToSpeech`, output
  follows the active Bluetooth route so it ducks Google Maps / Spotify cleanly.
- Permissions flow: prominent-disclosure screen → while-in-use → background upgrade,
  per Play policy; record the demo video Play requires for `ACCESS_BACKGROUND_LOCATION`.

---

## 3. Data sources (all free)

| Source | What we take | Cadence | Licence / access |
|---|---|---|---|
| Trafikverket open API v2 | RoadCondition, WeatherMeasurepoint, Situation, TrafficSafetyCamera, Camera | changeid delta, 5 min | Free key (Axel registers); camera & weather data CC0 |
| Polisen öppna data (polisen.se events API) | Events typed "Viltolycka", "Trafikolycka" | 10 min poll | Open, no key |
| Nationella Viltolycksrådet (viltolycka.se) | Historical wildlife-collision statistics → static risk model | One-time + yearly refresh | Public statistics |
| SMHI open data API | County-level warnings (incl. halka/ice) | 15 min | CC-licensed, no key |
| Later (Phase 5): Statens Vegvesen DATEX II (NO), Fintraffic Digitraffic (FI) | Same categories | — | Free, registration (NO) |

Attribution page in-app listing all sources. Even where CC0, we attribute — it's also
credibility ("data direkt från Trafikverket").

---

## 4. Phases — tasks, verification, exit criteria

Timeline assumes start week 35 (now). Winter is the deadline that matters.

### Phase 0 — Pipeline + truth check (W35–36 build; verdict matures W41–44)
*Goal: working data pipeline and an honest answer to "are the alerts any good?"*

Tasks (all Claude):
1. Repo scaffold, CI, CLAUDE.md (Karpathy + project rules), decision log.
2. Ingesters for all five sources → PostGIS on Supabase free tier.
3. **Recorder:** archive every snapshot from day one (we cannot fetch history retroactively;
   our own archive becomes the replay corpus — and later, a proprietary dataset nobody
   else has).
4. Replay harness: feed a GPS trace + archived snapshots through the alert engine,
   emit the alert log. Fixture traces: E4 Sthlm–Sundsvall, E14 Sundsvall–Östersund,
   Rv45 inland, one urban commute.
5. Public web map (MapLibre + free OSM tiles): live väglag, weather points, cameras,
   wildlife hotspots. This doubles as the marketing asset (§8).

Verify: ingesters green 7 days straight; replay produces deterministic alert logs;
map renders all layers.

**Kill criterion (evaluated on first real ice events — Norrland frosts typically arrive
late Sep/Oct):** across fixture routes during genuine winter conditions, < 1 useful
warning per 100 km that Google Maps would not have given → stop, total sunk cost ≈ 420 kr
and some weeks. Note: A5 cameras and A4 wildlife are testable immediately in August;
only A1/A2 need real cold.

### Phase 1 — Snapshot production (W36–37)
Builder + manifest + Cloudflare CDN; integrity checks; per-län size budget met.
Verify: end-to-end freshness ≤ 6 min from Trafikverket change to CDN; fixture tests green.

### Phase 2 — Android app (W37–41)
Service, auto-start, matcher, TTS, three screens (status / settings / attribution),
Play-policy permission flow, crash reporting (Sentry free tier).
Verify — **the road test (Axel drives, checklist provided):** 2 h mixed drive, app
backgrounded under Google Maps + Spotify: survives the whole drive incl. Doze; < 8 %/h
battery; A5 fires at 500 m ± 50 m at speed; audio ducks and restores; no duplicate alerts.
Bench-verify the rest with mock-location replays (I can run those without a car).

### Phase 3 — Closed beta (W42–48, i.e. mid-Oct → late Nov)
20–50 drivers, weighted to Norrland/inland commuters (recruitment plan §8). Weekly build
cadence. In-app one-tap post-drive feedback: "Var varningarna korrekta? 👍/👎".
Verify / go-no-go: ≥ 60 % of beta users still active week 4; false-positive rate < 20 %
on thumbs data; at least 5 unprompted "I'd pay for this" signals.

### Phase 4 — Public launch (target: last week of Nov / first week of Dec)
Timed to the **winter-tire deadline (Dec 1) + first halkkaos news cycle** — the one week
per year when every Swedish driver thinks about ice. Play listing (SV + EN), press kit,
map site cross-promotes app. Launch free; instrument everything (privacy-safe, aggregate).

### Phase 5 — Monetize + expand (Jan–Mar 2027)
- Premium 39 kr/mo: crowdsourced live reports (one big "HALKA" button usable only below
  10 km/h or via voice — distraction-safe), Android Auto card, multi-country.
- iOS (Swift, same test vectors; Apple fee 1 050 kr/yr enters here; 2.5.4 review dossier
  prepared in advance).
- Norway (Datex II) + Finland (Digitraffic) ingesters — the architecture makes each
  country ≈ one new ingester + snapshot region.
- Net revenue note: store billing takes 15 % → 39 kr ≈ 33 kr net.

---

## 5. Costs

To Android launch: Play account 270 kr + domain ~150 kr = **~420 kr**. Everything else
free tier (Supabase, GitHub Actions, Cloudflare, FCM, Sentry, MapLibre/OSM).
Year 1 incl. iOS in Phase 5: **~1 500 kr**.
Pre-approved contingency (only if a verified test fails): commercial background-geo SDK
(~€350) if battery target missed; paid map tiles if OSM tile policy blocks the public map
(mitigation first: self-host pmtiles on R2, still ~0 kr).

## 6. Risks

| Risk | L×I | Mitigation |
|---|---|---|
| RoadCondition data too sparse/slow in practice | M×H | That's what Phase 0 kill criterion is for |
| OEM battery killers (Samsung/Xiaomi) silently stop service | H×M | Foreground service + vendor-specific onboarding tips (dontkillmyapp playbook); beta covers device spread |
| Play rejects background location | M×M | Prominent disclosure + demo video prepared before submission |
| Alert fatigue → uninstall | M×H | Discipline rules §1 are tested requirements, not aspirations |
| Liability ("app didn't warn me") | L×H | ToS: supplement not substitute; never claim absence of danger; Axel reviews wording |
| A competitor copies it | M×M | Moats: our growing historical archive, Swedish-first brand, being free at the base layer |

## 7. Working protocol (autonomy)

- Claude owns: all code, infra, content drafts, this plan's upkeep, DECISIONS.md log.
- Axel owns: the 6-item list in §9, plus sign-offs (store listing, privacy policy, ToS)
  and anything legal/financial.
- Cadence: I post a written status (done / next / blocked / decisions-needed) at each
  phase gate and weekly during beta. I escalate only: money, law, brand, kill-criterion
  verdicts. Everything else I decide and log.

## 8. Marketing plan — "get downloads"

**Strategy: the data pipeline IS the marketing engine. Everything below costs 0 kr except Axel's time.**

1. **The free live halka-map (launches ~W37, months before the app).**
   The Phase-0 validation map, polished and published: "Sveriges väglag just nu — halka,
   olyckor, viltolyckor, fartkameror på en karta." Precedent: fartkameran.se built an
   audience on the camera data alone; nobody has done it for *winter conditions*. It is
   shareable every time weather turns, it ranks, and it carries an email-capture +
   "Appen kommer i november" banner. Top-of-funnel exists before the product does.
2. **Programmatic SEO from our own database.** Auto-generated, auto-updating pages:
   "Väglag E4 idag", "Halka i Jämtlands län", one page per major road and län
   (~100 pages). Swedish search volume for "väglag"/"halka idag" spikes exactly when we
   want installs. Compounding, free, and no competitor does it.
3. **Earned media at first snow.** Swedish media runs "halkkaos" front pages every first
   ice weekend, guaranteed. Press kit ready W41: angle "Gratis svensk app varnar för
   halka med Trafikverkets egna data — och skickar aldrig din position någonstans."
   Targets: Vi Bilägare, Teknikens Värld, M Sverige/Motor, Ny Teknik, SVT/TV4 regional
   (Norrland first — their winter starts earlier), P4-stationer (trafikredaktioner).
   Axel fronts interviews; I draft everything.
4. **Beta recruitment = community seeding.** Regional pendlar- and trafik-Facebook-groups
   (Norrland, inland), r/sweden + city subs, Garaget/forums, MC-clubs (spring angle).
   Post as founder-with-a-map, not as an ad: lead with the free map, invite testers.
5. **The care-based share loop.** Safety apps spread through worry, not virality hacks.
   In-app share framed as: "Skicka till någon du bryr dig om" — the new driver, the
   parents in Norrland. First-snow push notification (opt-in): "Första halkan i ditt län
   inatt" — genuinely useful, inherently shareable, and a screenshot machine.
6. **Trafikskolor (driving schools) as a channel.** ~900 schools; new drivers are the most
   ice-anxious segment and take instructor recommendations. I draft the one-pager +
   email sequence; Axel sends. Also: NTF and M Sverige partnership pitches (their
   mission is literally this app).
7. **Launch timing.** Public launch the week of the winter-tire deadline; every asset
   above converges that week. ASO: Swedish-first listing, keywords halka/varning/
   fartkamera/vilt; screenshots show the map + a phone on a dashboard mid-warning.
8. **Targets:** 5 000 map monthly users pre-launch; 10 000 installs by New Year;
   30-day retention ≥ 35 %; press: ≥ 3 national/regional pieces in launch month.
   B2B fleet (hemtjänst, taxi, delivery — rural km every day) stays Axel's lane;
   I supply the deck when consumer traction gives it proof.

## 9. Axel's complete task list (everything blocking me)

1. Register Trafikverket API key → https://api.trafikinfo.trafikverket.se/Account/Register (10 min) — **blocks Phase 0, do first**
2. Create GitHub org/repo (or hand me a repo) (10 min)
3. Google Play developer account, 270 kr (30 min) — needed by W40
4. Pick the name from §10 shortlist + buy the domain (~150 kr)
5. Drive the Phase-2 road test with my checklist (2 h, one afternoon, W41)
6. Review privacy policy + ToS drafts I produce (1 h)

Total: roughly one working day of your time between now and launch.

## 10. Naming shortlist (Axel picks; verify domain + Play availability + trademark)

- **Halkvakt** — "ice guard"; instantly understood by every Swedish driver; my recommendation
- **Svartis** — "black ice"; shortest, most brandable; slightly ominous (maybe good)
- **Vägvakt** — broader ("road guard"), fits the full alert set incl. cameras/wildlife
- Nordic RoadSafe — keep as the company/B2B umbrella name, not the consumer app

---
*Maintained by Claude. Changes logged in DECISIONS.md. Next update: end of Phase 0.*
