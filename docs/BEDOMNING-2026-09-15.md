# Bedömning v3 — den enda listan: nu, senare, ännu senare

**Status: LEVANDE LISTA.** Det här är det enda dokumentet som säger *vad som görs och när*. Kartan
(`docs/INTEGRATIONSKARTAN.md`) säger *varför* och är **fryst** sedan 15/9 — nästa ändring där kommer
efter att något byggts och mätts, inte lästs en gång till. Granskningen är **arkiverad**; det den hade
kvar står i bilaga A.

**v3 = v2 omprioriterad efter Axels andra brev (15/9) och Bengts två beslut samma dag:**
1. Betatestarna får skicka varningsfacit — med samtycke, i känd krets (löftet "samlar in: ingenting"
   gäller oförändrat för allmänheten).
2. Efterhalkan släpps som **märkt beta** i november, före grinden, och döms i januari på förarfacit
   plus vad kamerafacit hunnit ge.

Trösklarna rörs inte. De skrivs fortfarande före mätning. Det som ändras är att mätningen börjar i
november i stället för mars, för att facit kommer från en källa som faktiskt fylls: förarna.

---

## 0. Spårning — vad som hänt med varje NU-rad (uppdateras varje varv)

Bengts krav 15/9: kort, DECISIONS och issues som följer av åtgärderna ska gå att hitta HÄR. En rad stryks i §1
när beviset finns, inte när koden är skriven.

| # | Läge | Kort | DECISIONS | PR / issue | Beviset som gäller |
| :-- | :-- | :-- | :-- | :-- | :-- |
| N1 | ✅ **KLAR** — tystnadsfelet 16:02Z: **1 bild i `facit`**, senast 15/9 — första objektet någonsin; Axel 16/9: **26 objekt** sedan 16:00Z. *Reservation (Axel): 738 av 744 kameror står vid en station — radien säger nära, inte rätt sträcka; avgörs i mars när bilderna öppnas* | #157 | #189 | PR #270 | ett objekt i `facit`, räknat av tystnadsfelet |
| N2 | ✅ nyckeln i drift — live.json 2026-09-15T16:00:01Z (manifest-sha STÄMMER): **`rain_segments` 34 st** — t.ex. segment 16010 E16, kod 1 "Torrt", `regn` 3,1 (= 2,0 rå); `segments` 0 st, som förut i september. **Steg E byggt 15/9** (DECISIONS #191, PR #274): kolumn `vb` + skuggrapportens `vattenplaning`; ✅ första `vb`-raderna 17:30Z: **5 skuggvarningar** (E18 Karlstad→Örebro, 5 st, regnsegment 18060/18065/18067) i skuggrapportens `vattenplaning` | #154, #42/#81 C+E | #187, #191 | PR #270, #274, issue #15 | nyckeln i `live.json`, manifest-sha stämmer; V-B-rader |
| N3 | ✅ kalendern i drift — deployad 15:52Z, prov gav issue #272 med PAT:ens datum läst LIVE (2026-11-22, 67 dygn) och Supabase 2026-12-08 (83 dygn); **rotationen är Axels, senast 15/11** | #86 | #190 | PR #270, issue #272 | publicering med ny nyckel |
| N4 | 🔨 deployad 15:52Z, väntar på första kalla stationen — live.json 2026-09-15T16:00:01Z: `weather` **tom** — ingen station ≤ 3 °C klarar givarvakten (lägsta riktiga yta 7,1 °C; Rovaniemi 0,0 °C mot luft 12,6 stoppas av #75). Fälten bevisas i CI:s PostGIS (integration.test.ts) men ÄNNU INTE på CDN; `radar_h` uppskjuten | #187 (nytt) | #188 | PR #270 | fälten i `live.json`, manifest-sha stämmer |
| N5 | ✅ klar | — | #186 | — | kartan §7.8 |

### 0b. Bevakning — öppna åtgärder ur 15–16/9, tills de är strukna

Bengts krav 16/9: allt som beslutats ska stå här tills det är åtgärdat, markerat och struket. Raden stryks när
beviset finns — inte när koden är skriven.

| Åtgärd | Läge | Kort | DECISIONS | Beviset som gäller |
| :-- | :-- | :-- | :-- | :-- |
| Spärrprovet (`?sparrprov=1`) + dbknapp läser svaret | 🔨 byggt, deploy + prov väntar | #191 → #188 | #197 | `suppressed` med en rad i dbknapp-svaret |
| S1: `efterhalka` i skuggloggen | 🔨 byggt, migration 021 + deploy väntar; innehåll kräver kall natt | #192 | #198 | rad med innehåll |
| ~~R1–R16 in i kartan~~ | ✅ införda 16/9, kartan fryst igen | #159 | #199 | kartan §5.2/§5.6/§7.8/§14, bilaga A struken |
| N4:s fältbevis på CDN (`regn_h`, `lutning`) | ⏳ väntar på första station ≤ 3 °C | #187 | #188 | `weather[0]` bär fälten |
| #188 `suppressed` med innehåll | ⏳ via spärrprovet | #188 | #193 | se raden ovan |
| Grind V-B:s dom-knapp | ⏳ efter första hela regndygnet med `vb`-rader (13 st sedan 17:30Z 15/9) | #81 E | #191 | knappen med ⊘-disciplin |
| S4 facitknappen + produktbokens löfte | ⏳ app-bygge, Axels design given | #21 | #196 | PRODUKTBOK i samma commit |
| PAT-rotationen | ⏳ Axel, senast 15/11 | #86 | #190 | publicering med ny nyckel |
| `radar_h` | ⏳ uppskjuten (CPU-mätning) | #187 | #188 | — |
| Kamerafacit-bilderna öppnas och läses | ⏳ mars | #157 | #196 | facit, inte bara bild |
| Steg D (farslaget `aquaplaning`) | ⏳ beslut efter V-C, utgångspunkt given | #81 D | #196 | Axels ja på text + plats |

---

## 1. NU — före första frosten

Fem rader. Inget annat är "nu".

| # | Vad | Vems | Bevis |
| :-- | :-- | :-- | :-- |
| ~~**N1**~~ | ~~**Kamerafacit bevisat.** Kör skuggan mot ett känt svenskt spår som ger ett positionerat larm; ett objekt i hinken. *Noll objekt efter 5 657 körningar är ett trasigt instrument, inte väntan på data*~~ | Claude | **KLAR 15/9: 1 bild i hinken** (DECISIONS #189) |
| ~~**N2**~~ | ~~**#42 i höstregn.**~~ ~~Vidga väglagsfrågan så `regn` når normalklassade segment (#154, en skrivare hålls)~~ **(klart 15/9 som `rain_segments`, DECISIONS #187)**, ~~sedan steg E: skuggan V-B loggar vad rösten *skulle* sagt~~ **(klart 15/9, DECISIONS #191)**. ~~Enda spåret med höstfönster~~ | Claude, Bengts ja på #154 — **KLAR 15/9**; det som återstår är grind V-B:s dom (kort #81 E, "inte förr") | ~~ett normalklassat segment med `regn` i `live.json`~~ ✅ 34 st 16:00Z; ~~V-B-rader i skuggloggen~~ ✅ 5 st 17:30Z |
| **N3** | **Nycklarna.** PAT går ut 22/11, Supabase-tokenen 8/12. Rotera PAT senast **15/11**; en nyckel är bytt först när en publicering gått igenom med den. ~~Lägg datumen i vakthunden~~ **(klart 15/9: check 10, issue #272)** | Axel | publicering med ny nyckel; vakthundsrad |
| **N4** | **F1: skattarens råa indata i `live.json`** bredvid `fukt` — `regn_h`, `radar_h`, `lutning` (nycklad på `station_id`). Förutsättning för betan: F1 ligger ett varv före F4. ~~Kör `regn-tackning` en gång först — 44 %-talet är från före ingest-live-bytet~~ **(körd 15/9: 13 %, DECISIONS #188)**. ~~`regn_h`, `lutning`~~ **byggda och deployade 15/9**; `radar_h` uppskjuten; fältbeviset på CDN väntar på första kalla natten | Claude, Bengts ja | fältet i `live.json`, manifest-sha stämmer |
| ~~**N5**~~ | ~~**Kriteriet för nytt farslag** i kartans §7.8 — handling · text · prioritet före vektorn~~ | ✅ fastställt av Bengt 15/9 | kartan §7.8 — **KLAR** |

---

## 2. SENARE — oktober till december

### 2.1 Vägen till förare: efterhalkan som märkt beta

| # | Steg | Fog | Grind |
| :-- | :-- | :-- | :-- |
| **S1** | Skuggan läser N4:s fält vid sidan av motorn och loggar vad villkoret *skulle* ändrat. **GRIND (Axel 16/9): körs INNAN något mer byggs på `regn_h`** — regntäckningen 13 % gör `regn_h` till efterhalkans osäkra halva. **Byggt 16/9** (kolumn `efterhalka`, DECISIONS #198) — innehåll kräver första kalla natten | — | S1 före S2 |
| **S2** | **E på K2:** skattaren returnerar nivå + bevis, byggd på frysklassningens osäkerhetszon (±0 · ±0,5 · ±1,0 °C) — indata till försprånget. *Förkrav klart 15/9: trendfälten besiktigade av värdevakten (DECISIONS #192)* | F3 | — |
| **S3** | **Regeln i motorn:** `icing_point` fyrar när det *inte* regnar men ytan är blöt (N4:s `regn_h` ≤ N) och faller (`lutning`). Märkt text: *"Halkvakt tror: frysrisk framöver"* — ny gren, inte nytt slag. Tre portar | F3 + F4 + text | **`v11_silent_drive` måste fortfarande tiga** — vektorn försvagas aldrig |
| **S4** | **Facitknappen:** ~~efter varje varning *"stämde det?"*~~ **Axels ja 16/9: två knappar under "Senast sagt" — *Stämde* / *Stämde inte*, ingen fritext; loggas lokalt, skickas när bilen står stilla.** Skickar varnings-id + svar, inget spår. Bara betatestare, uttryckligt samtycke. **Produktbokens Om-avsnitt ("vi samlar in: ingenting") ändras i samma commit — ordagrant, frivilligt, synligt** (kort #21) | app, båda plattformarna | ~~Axels ja på text och flöde~~ ✅ 16/9; PRODUKTBOK i samma commit |
| **S5** | **Betan till tolv testare i november.** Skuggloggen + förarsvaren + kamerafacit = tre facitkällor | — | — |
| **S6** | **Dom i januari** på förarfacit + kamerafacit mot Ö-B:s golv (nettonytt ≥ 5 %, tillkomna falsklarm ≤ 25 %). Mars-domen blir en dom på riktig data | — | TROSKLAR-OVERGANGAR, oförändrad |

### 2.2 Det som måste finnas under tiden

| # | Vad | Vems |
| :-- | :-- | :-- |
| **S7** | **Facitvakter:** vakthundsrad *"historiken växer"* (inte bara *"sync_state är färsk"*) · ~~mät `situation_archive`~~ (mätt 15/9: 3 122 olyckor/30 dygn, DECISIONS #189) · bevisa att `trv-bevakning` sparar 13 källor | Claude |
| **S8** | **#52 före #45:** ett test i tre portar låser att kod 1 + "Packad snö" *måste* larma — motsatsen till vinterbaseline. Vektorn beslutas innan #45 rörs | Bengt + Axel |
| **S9** | **T-A efter första frostnatten**, steg 0 inom sju dygn, #95(d):s F-B i samma varv | Claude |
| **S10** | **C och D:** grinden för kombinationen (dokument) och regeln för gemensam kalibrering (ett stycke). Tröskelregeln till Axels lydelse — *efter N1*, annars saknar den vittne | Claude skriver, Bengt fastställer |
| **S11** | **#153 → försprång** (Axel) · mät korridortillväxten 3 000 m mot 1 000 m | Axel · Claude |
| **S12** | **Drift:** #97 kodgrind för "Rimfrost"/"Halkrisk" · måndagsserien från naken cron till puls/knapp · #83 steg 2 (export/Pro) före första kalla veckan · #45 lapse 0,71 → 0,63 · #76 deploybevis · #146 klonfelet | Bengt / Axel / Claude |
| **S13** | Skattaren: en period **utan kodändring** under mätning — tre instrumentfel på tre körningar | Claude |

---

## 3. ÄNNU SENARE — mars och framåt

| # | Vad | Villkor |
| :-- | :-- | :-- |
| **Ä1** | #42: sjätte farslag eller meta — avgörs på V-B:s data mot kriteriet | efter N2:s höst |
| **Ä2** | #45 som meta, med lapse 0,63 | efter S8 |
| **Ä3** | #32 hinder/djur och #15 kö-slut mot kriteriet | efter release |
| **Ä4** | **Räckvidd (L4):** SMHI moln som knapp · Verify 2 · representativitetsradien. Axel: *"räckvidd kan vara den här vinterns"* — grind A:s kurva växer varje måndag; beslut på vinterdata | efter vinterns grind A-kurva |
| **Ä5** | Höjden som varianspredikator — kräver inte vinter, kräver inte brådska | knapp när kassan tillåter |
| **Ä6** | Radarns segmentupplösning · #43 steg 4 (snöbyar) · kombinationsgrinden i skuggan · #91 kallplatslagret · SMHI som reserv (2,36 °C) | mars |
| **Ä7** | Nowcast #16 efter kö-slut #15 · Nordenprodukten (NO/FI/DK) | efter release |

---

## 4. Beslut

### 4.1 Tagna 15/9

| Beslut | Vem |
| :-- | :-- |
| Kartan fryses; nästa ändring efter bygge + mätning | Axel föreslog, Bengt ja |
| Kriteriet för nytt farslag i §7.8 | Bengt fastställde |
| Betatestare får skicka varningsfacit med samtycke; löftet till allmänheten orört | Bengt |
| Efterhalkan som märkt beta i november, före grinden; dom i januari på förarfacit | Bengt |
| Grind A står (Axel rättade sig); E kan inte vänta (Axel rättade sig) | Axel |
| Granskningen arkiveras; R1–R15 väntar i bilaga A tills en rör kod | Bengt |
| #154: `regn` når normalklassade segment via `rain_segments`, och steg E byggs (DECISIONS #191) | Bengt, ja 15/9 |
| `rain_segments` som egen nyckel, inte filter i motorn — apparna läser den inte förrän V-C dömt | Axel, 16/9 |
| Facitknappen: två knappar *Stämde*/*Stämde inte*, ingen fritext; produktbokens löfte skrivs om ordagrant | Axel, 16/9 |
| V-B-loggen är rå; dom-knappen räknar per regndygn | Axel, 16/9 |
| S1 körs före S2 — inget mer byggs på `regn_h` innan skuggjämförelsen | Axel, 16/9 |
| Steg D: utgångspunkt given (under halka, över vilt; *"Vattenplaning framöver — sakta ner"*), beslut efter V-C | Axel, 16/9 |

### 4.2 Öppna

| Beslut | Vem | Rekommendation |
| :-- | :-- | :-- |
| #52-vektorn: ska kod 1 + "Packad snö" larma? (S8) | Bengt + Axel | avgör före #45 |
| Tröskelregeln till Axels lydelse (S10) | Bengt | ja, efter N1 |
| #45 lapse 0,63 (S12) | Bengt + Axel | ja |
| `marknadsforing.yml` | Axel + Bengt | ingen rekommendation |
| TRV-anmälan om nio byvindgivare — brevet är klart | Bengt | ja |

---

## Bilaga A — rättelser till kartan som väntar tills en rör kod

~~Kartan är fryst. Dessa femton är kända fel eller överspelade påståenden; de införs den dag någon
av dem får konsekvens för kod, inte förr.~~ **Införda i kartan 16/9 (DECISIONS #199), efter NU-listans byggen och
mätningar — R1–R16 nedan är strukna och står kvar bara som historik.**

| # | Var | Rätt |
| :-- | :-- | :-- |
| ~~R1~~ | ~~§7.8, §5.4~~ | ~~#42 har egen byggordning, höstfönster, byggd radarhalva; motorsteget är F5 av konstruktion~~ |
| ~~R2~~ | ~~§5.2~~ | ~~"radarn ligger redan i telefonen" gäller bara halkklassade segment (#154)~~ |
| ~~R3~~ | ~~§9.1, §2~~ | ~~höjden underkänd som medelkorrektion på yta; #96 mäter varje måndag; lapse 0,63~~ |
| ~~R4~~ | ~~§10.2~~ | ~~oljefilm → #42 överspelad sedan #155~~ |
| ~~R5~~ | ~~§10.2~~ | ~~`rate_max`-kvoten spärrad tills fältet rensats~~ |
| ~~R6~~ | ~~§10.2~~ | ~~K1 är en läxa om fönsterglapp, inte ett verktyg~~ |
| ~~R7~~ | ~~§10.1~~ | ~~#94: spåret stängt, kortet öppet~~ |
| ~~R8~~ | ~~§2, §4~~ | ~~#163, #165 är DECISIONS-nummer~~ |
| ~~R9~~ | ~~§10.2~~ | ~~"Ord-per-resa (#103)" = DECISIONS #103; kort #103 är frysklassningen~~ |
| ~~R10~~ | ~~§9.1~~ | ~~radarns bidrag: bär #168:s två reservationer~~ |
| ~~R11~~ | ~~§11~~ | ~~#43 steg 4 öppnat — snöbyn är mätbar, inte kartans kant~~ |
| ~~R12~~ | ~~§2~~ | ~~#95: reserven 2,36 °C, Verify 2, radien som öppna L4-frågor~~ |
| ~~R13~~ | ~~§7.8~~ | ~~kriteriet — **infört 15/9**~~ |
| ~~R14~~ | ~~§12~~ | ~~två av tre facitkällor tomma; ingen vakt mäter tillväxt~~ |
| ~~R15~~ | ~~§7.8~~ | ~~#45 som meta efter #52~~ |
| ~~R16~~ | ~~§5, fog-tabellen~~ | ~~**Fog-tabellen är läst, inte körd (§5.6):** #154:s steg stod som F1, men varje rad i `segments[]` blir en varning i motorn och båda portarna — F4/F5. Löst med egen nyckel (DECISIONS #187); tabellen ska märka vilka fogar som är verifierade i kod (Axel 16/9)~~ |

(R16–R24 gällde bedömningen och granskningen och är införda här.)

## Bilaga B — vad som ändrats mot v2

| | v2 | v3 |
| :-- | :-- | :-- |
| "Nu" | 13 rader | **5** |
| Efterhalkan | L1, efter grinden i mars | **S3–S6: märkt beta i november, dom i januari** |
| Facit | tre automatiska källor, två tomma | **fjärde: förarna** (S4), med samtycke |
| Kartan | 15 rättelser att införa | **fryst**; rättelserna i bilaga A |
| Granskningen | levande | **arkiverad** |
| Räckvidd | nästa produkt | "kan vara den här vinterns" (Axel) — Ä4 |

*Analysen står i kartan. Det här är listan.*
