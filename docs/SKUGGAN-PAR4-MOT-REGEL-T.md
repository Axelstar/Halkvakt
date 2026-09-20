# TROSKLAR-SKUGGAN §4 mot regel T — beslutsunderlag (kort #198)

**Skrivet av Claude 2026-09-20 på Bengts order. Ingen text i det fastställda dokumentet är ändrad:
`TROSKLAR-SKUGGAN.md` §5 säger att dokumentet efter första skuggkörningen bara ändras genom en
DECISIONS-post från Bengt. Det här är underlaget till den posten.**

Frist: **före domen i mars 2027**. Men se §5 nedan — det finns ett skäl att ta det tidigare.

---

## 1. Vad som krockar

`TROSKLAR-SKUGGAN.md` §4 säger i dag, ordagrant:

> **(a) TALAR:** A + B + C klaras nationellt → segmentprognosen kopplas till app och karta som
> säsong 2-funktion, trenivåmärkt, "risk"-språk (aldrig "uppmätt"), SYSTEM.md skrivs om i samma commit.
>
> **(b) TALAR NÄRA ANKARE:** A + B klaras i banden 0–7 km (ev. 7–15) men inte längre ut → skuggan
> talar endast på segment vars maxavstånd till ankare ligger i godkänt band; resten skrivs ut som okänt.

Segmentprognosen **är** offsetmodellens temperatur för platser där ingen station mätt. Grind A prövar
den med leave-one-out mot grannarnas offsetmodell — det är definitionsmässigt ett modellerat värde.

Regel T, fastställd 16–17/9 (TROSKLAR-KOMBINATIONEN §6, DECISIONS #220/#226), säger två saker som
båda träffar §4:

| Regel | Lydelse (förkortad) | Följd för §4 |
| :-- | :-- | :-- |
| **T3** | *Extrapolation är ett värde för en plats där ingen mätt, som ingen mätning på platsen kan fälla — offsetmodellens temperatur långt från ankare. **Den får inte utlösa.*** | (a) och (b) låter den utlösa |
| **T6** | *Prognoser och modellprodukter … får stärka, försvaga eller förlänga en varning som vilar på en mätning — **aldrig ensamma utlösa.*** | Samma sak, från andra hållet |

**T3 nämner offsetmodellen vid namn.** Det är inte en tolkningsfråga om regeln träffar §4; den är skriven
med §4:s storhet som exempel.

Krocken fanns dessutom redan före regel T: `TROSKLAR-FRYSKLASSNINGEN` §1/§7 sa samma sak om klassningen.
Regel T gjorde den bara explicit och fastställd.

---

## 2. Vad (a) får betyda i stället

**Inte röst.** Två användningar står öppna, och båda är uttryckligen tillåtna i regelns egen text.

**(a1) Kartan.** Segmentprognosen visas på kartan, trenivåmärkt, i "risk"-språk, aldrig "uppmätt".
T3 och T6 förbjuder *utlösning* — att tala. En karta talar inte: föraren söker upp den, den söker inte
upp föraren. Produktinvarianten om att inte överdriva vad datan bär täcks av trenivåmärkningen.

**(a2) Konfidens.** Prognosen får **stärka, försvaga eller förlänga** en varning som vilar på en mätning.
Det står ordagrant i både T3 (*"Den får fortsatt stärka eller försvaga en varning som vilar på en
mätning"*) och T6, med två färdiga förebilder: `N_varning` som förlänger N, och E1 som förlänger
försprånget.

**Vad som INTE får stå kvar:** *"segmentprognosen kopplas till app … som säsong 2-funktion"* om "kopplas
till app" betyder röst. Om det bara betyder kartlagret i appen är (a) redan förenlig — men texten säger
inte vilket, och en text som kan läsas som en öppning i regel T är en öppning.

---

## 3. Vad (b) får betyda — och varför den kan stå kvar

**(b) är räddningsbar, och det är regelns egen konstruktion som räddar den.** T5 säger om interpolation:

> *…får bara bära utlösning där ett vittne **på platsen** kan fälla värdet (T1–T2); **då är det inte längre
> extrapolation i T3:s mening.***

Det är precis vad "nära ankare" betyder. Ligger segmentets maxavstånd till ankare inom ett band där
ankarstationens mätning kan fälla värdet på varningens plats och inom utfallsfönstret, så är storheten
inte längre extrapolation — den är ett värde med ett vittne.

**Men då måste (b) säga det.** Dagens lydelse villkorar på *"maxavstånd till ankare ligger i godkänt
band"*, och "godkänt" syftar på grind A:s felmått (MAE ≤ 1,0 °C osv.). Det är ett **noggrannhetskrav**,
inte ett **vittneskrav**. De två sammanfaller inte: en modell kan vara noggrann på 6 km utan att någon
mätning på platsen kan fälla ett enskilt värde.

**Föreslagen skärpning:** (b) villkoras på båda — grind A:s band **och** T1–T2 uppfyllda, alltså en
namngiven mätning som på varningens plats och inom utfallsfönstret kan visa att tillståndet inte rådde.

---

## 4. Förslaget, som text

> **(a) KARTA OCH KONFIDENS:** A + B + C klaras nationellt → segmentprognosen kopplas till **kartan** som
> säsong 2-funktion, trenivåmärkt, "risk"-språk (aldrig "uppmätt"), och får **stärka, försvaga eller
> förlänga** en varning som vilar på en mätning (T3, T6). **Den utlöser aldrig röst ensam.** SYSTEM.md
> skrivs om i samma commit.
>
> **(b) TALAR NÄRA ANKARE:** A + B klaras i banden 0–7 km (ev. 7–15) men inte längre ut → skuggan talar
> endast på segment som uppfyller **båda**: maxavstånd till ankare i godkänt band, **och** T1–T2 —
> ankarstationens mätning kan på varningens plats och inom utfallsfönstret visa att tillståndet inte
> rådde. Är vittnet inte namngivet och bevisat med innehåll (T2) talar skuggan inte. Resten skrivs ut
> som okänt.
>
> **(c) TYST:** oförändrad.

**Skärpning eller lättnad?** Skärpning. (a) går från röst till karta och konfidens; (b) får ett villkor
till. §5 tillåter skärpning med en rad från Bengt — lättnad hade varit utesluten.

---

## 5. Varför detta bör tas före mars, inte i mars

Kortet sätter fristen till *före domen i mars 2027*, och det räcker formellt. Men två skäl talar för
tidigare:

1. **Domslutet styr vad som byggs, inte bara vad som sägs.** Står (a) kvar som "kopplas till app" finns
   risken att någon bygger röstvägen under vintern och först i mars får veta att den inte får användas.
2. **Regel T:s undantagsförbud.** TROSKLAR-KOMBINATIONEN §10 säger att regel T i sin helhet får skärpas
   men aldrig mjukas upp, **oavsett signaturer**. Ju längre §4 står oförändrad, desto större risk att
   någon läser den som ett förhandlat undantag i stället för en text som inte hunnit rättas.

**Rekommendation:** ta beslutet nu. Det kostar en rad i DECISIONS och en textändring i ett dokument
ingen ännu byggt kod mot.

---

## 6. Vad som INTE föreslås

- **Grind A:s trösklar** (A1–A3), banden eller minsta underlag — orörda. Frågan gäller vad ett godkänt
  utfall får *betyda*, inte var gränsen går.
- **(c)** — orörd.
- **Frysklassningen (#103)** — T5 säger redan att den förblir en konfidenshöjare; ingenting här ändrar det.
- **Något i TROSKLAR-KOMBINATIONEN** — regel T är fastställd och skärps inte här. Det är skuggans text
  som ska följa regeln, inte tvärtom.
