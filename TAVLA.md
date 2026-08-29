# 📋 TAVLAN — allt på ett ställe

Tre kolumner. Claude flyttar kort automatiskt varje arbetsvarv; Axel och Bengt
flyttar genom att säga till i chatten ("flytta X till klart") eller redigera
direkt här på GitHub (pennikonen ↗). Regel: finns det inte på tavlan finns det inte.

*Uppdaterad: 2026-08-28 av Claude*

---

## 🔴 ATT GÖRA

### Axel — helgen
- [ ] Ladda ner **Xcode 26.1** (developer.apple.com/download/all) när 15.7.9 är klar; dra till Program, öppna en gång, säg ja till licens + iOS components

### Axel — måndag (lönen)
- [ ] **Play-kontot** — play.google.com/console, 25 USD ⚠️ KRITISKA LINJEN (startar Googles klocka)
- [ ] **Apple Developer** — developer.apple.com, 99 USD/år (ID-koll 1–2 dygn)
- [ ] **Första iOS-bygget** på Macen med Claude — recept: `ios/MAC-GUIDE.md`

### Axel — beslut att ta
- [ ] **Rollfördelningen**: efterfrågan/affärsmodell/B2B = Bengts ansvar? (hans förslag; vid ja uppdateras PLAN)
- [ ] **#21 Anonym puls + feedback-knapp** — rör "samlar in: ingenting"-löftet; Claudes råd: paketera med sensorbeslutet våren 2027

### Axel — därefter
- [ ] Rekrytera 20 testare (mål; minst 12 × 14 dagar — `docs/REKRYTERING.md`)
- [ ] Domänen halkvakt.se (vilande beslut)
- [ ] Fysisk Android-testenhet (pappas telefon? begagnad?)

### Bengt
- [ ] Läsa SYSTEM.md mot koden månadsvis (första: september)
- [ ] Samtal med Axel: sensortrappan — tidsättning av steg 2 (våren 2027?)

### Claude — olåst
- [ ] **#17 Vilt in i snapshoten** (FÖRE release, båda plattformar + replay-vektor)
- [ ] **#19 Missmätningsskriptet** (Bengts design — byggs på augustidata)
- [ ] **#20 Skuggmotor + kamerafacit** (server-side — FÖRE FÖRSTA FROSTEN)

### Claude — låst (väntar på nyckel)
- [ ] Butiksuppladdning + Data safety-inklistring *(låst: "kontot är godkänt")*
- [ ] TestFlight-uppladdning + testarinbjudningar *(låst: Apple-kontot)*
- [ ] Skarp support vid första Mac-bygget *(låst: måndag)*
- [ ] **#15 Kö-slutsmotorn** (TrafficFlow) *(låst: efter release — uppdatering 1)*
- [ ] **#16 Blixthalke-prognos** (MET Nowcast) *(låst: efter kö-slut — uppdatering 2)*

---

## 🟡 GÖRA (pågår just nu)

- [ ] macOS Sequoia **15.7.9** installeras på Axels MacBook Air

---

## 🟢 KLART (senaste vinsterna)

- [x] **Bengts granskning II bokförd** — arkivlagret = repots styrka; prognosfrihet nu dokumenterat val (#25); kamerafacit+skuggmotor = #20; retention löses löftesrent via Play-statistiken
- [x] **Tavelregeln** inristad i CLAUDE.md — varje varv slutar med tavelsynk
- [x] **Bengt fullt ombord** — konto `895845` bekräftat i praktiken: committar dokument, granskar kod på radnivå (åldersvakts-fyndet!)
- [x] **Åldersvakten** (Bengts granskning): appen läser generated_at, filtrerar gammalt väglag, säger till EN gång — Android + iOS + prov
- [x] **docs/SYSTEM.md** — systembeskrivningen med "vad systemet inte gör" + månadsdisciplin

- [x] **Android-appen tekniskt släppfärdig** — v0.3.0, signerad AAB 2,55 MB byggs i CI varje push
- [x] **iOS-appen skriven** — SwiftUI-spegel av Android, väntar på första Mac-bygget
- [x] Butiksmaterial klart: texter, feature graphic, ikon, skärmdumpar (fotostudion)
- [x] Data safety-svaren förskrivna (`docs/PLAY-DATASAFETY.md`)
- [x] Integritetspolicyn live + länkad överallt
- [x] Signeringsnyckeln skapad, krypterad i CI + Axels kopia levererad
- [x] Pappa collaborator med Write + välkomstdokument
- [x] Pappas synergianalys bokförd + **beslut: v1 lanseras utan datainsamling** — sensortrappan = strategi, inte MVP (Axel 28/8)
- [x] Kö-slut beslutad som uppdatering 1 (TrafficFlow verifierad 43 s färsk)
- [x] Mobilvideo 720p-fixen på sajten
- [x] Presskit + livemotor härdad + webbåldersvakt

---

*Djupare detaljer: BACKLOG.md (teknisk kö) · STATUS.md (varvlogg) · DECISIONS.md (vägval).
Tavlan är människornas lager ovanpå dem.*
