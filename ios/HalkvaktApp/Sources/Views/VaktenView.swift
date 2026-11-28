// VAKTEN — hemskärmen, designöverlämningen v2 (DECISIONS #444): 01 Redo och 01b Redo efter tur.
// "Redo." svarar på "är jag skyddad?" med en blick; efter en tur står kvittot över varningarna tills nästa tur.
// När vakten kör visas KorlageView i helskärm.
//
// Skärmen RULLAR när den måste (kort #279, Axels skärmbild 1/10): kortet *Efter resan* med fyra varningar
// var högre än skärmen, och en VStack utan ScrollView svarade med att trycka ihop allt — rubriken och
// tystnadsraden klipptes till "…", kortets topp låg under statusraden och facitraden under tabraden.
// `frame(minHeight:)` ger Spacer-arna skärmhöjden när innehållet är kort, så "Redo." står där det stod.
import SwiftUI
import CoreLocation
import HalkvaktEngine

struct VaktenView: View {
    @State private var guardM = GuardManager.shared
    @State private var prefs = Prefs.shared
    @State private var fav = Favoriter.shared
    @State private var tipsatt = false
    @State private var facitNu: String?   // kort #999: varningen som besvarades medan skärmen visades
    // Kort #659: kartan Nära dig, Planera en resa och den planerade resan med avresetid.
    @State private var plan = Resplan.shared
    @State private var plats: (lon: Double, lat: Double)?
    @State private var valdFara: String?   // DECISIONS #922: faran föraren tryckt på
    @Environment(\.scenePhase) private var fas

    var body: some View {
        NavigationStack {
            ZStack {
                Brand.bg.ignoresSafeArea()
                GeometryReader { geo in
                    ScrollView {
                        innehall
                            .padding(.horizontal, 24)
                            .padding(.bottom, 120)   // den flytande flikraden
                            .frame(minHeight: geo.size.height, alignment: .top)
                    }
                    .scrollBounceBehavior(.basedOnSize)
                    .scrollIndicators(.hidden)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .task { await guardM.refreshSnapshot() }
        // Om igen när platstillståndet ändras: den som just svarat i iOS ruta ska få kartan över sitt område direkt.
        .task(id: guardM.authStatus) { await hamtaPlats() }
        .onDisappear { if tipsatt { prefs.tipsaDold = true }; facitNu = nil }
        .onChange(of: fas) { _, ny in if ny != .active, tipsatt { prefs.tipsaDold = true } }
    }

    private var innehall: some View {
        let resa = efterResan
        let tur = senasteTuren
        // Lampan (DECISIONS #981): grön när inget är rapporterat nära, gul när något är det eller platsen saknas.
        let lugnt = harPlats != nil && naraFaror.isEmpty
        return VStack(spacing: 0) {
            BrandHeader(trailing: guardM.snapshotInfo == nil ? "Hämtar" : "Live",
                        trailingColor: guardM.snapshotInfo == nil ? Brand.faint : lugnt ? Brand.green : Brand.yellow)

            // Kort #203: frågan om resan står överst, före allt annat — den som öppnar appen efter
            // en körning ska se den utan att leta. Försvinner när allt är besvarat, och efter ett dygn.
            // Designen v2 visar inte betatestets kort; det står kvar här för betatestarna (DECISIONS #267, #444).
            if let resa {
                EfterResanKort(varningar: resa.obes, missar: prefs.missar.filter { $0.t >= resa.sedan }, sedan: resa.sedan)
                    .padding(.top, 14)
            }

            // Favoriter 2a (DECISIONS #817): dagens resor pekar till Favoriter, där namnet skrivs; med brytaren av erbjuds den
            // efter en lång resa, en gång.
            let spara = fav.erbjud && !fav.dagens.isEmpty
            let erbjud = fav.erbjudRaden(senasteKm: prefs.lastTripKm, senasteSlut: prefs.lastTripEnd)
            if spara { attSpara.padding(.top, 14) }
            if erbjud { erbjudKort.padding(.top, 14) }
            // DECISIONS #829: en gång, efter femte passet, och aldrig samtidigt som ett kort om resorna.
            let tipsa = Tipsa.kortetVisas && !spara && !erbjud && Tipsa.visaKortet(pass: prefs.vaktPass, dold: prefs.tipsaDold, vaktenKor: guardM.running)
            if tipsa { tipsaKort.padding(.top, 14) }

            // Kort #659: en planerad resa med avresetid står här tills sex timmar efter avresan.
            if let kommande = plan.kommande { planeradRad(kommande).padding(.top, 14) }

            // DECISIONS #873 (Axels skärmbild 14/11): svaret om området är rubriken, knapparna står direkt under den och
            // syns utan att rulla, och kartan och listan kommer sedan.
            let nara = naraFaror
            VStack(spacing: 10) {
                Text(rubrikNu(nara))
                    .font(Typo.sans(34, .semibold)).tracking(-1)
                    .foregroundStyle(Brand.text)
                    .multilineTextAlignment(.center)
                    .accessibilityAddTraits(.isHeader)
                Text(underrubrik(nara))
                    .font(Typo.sans(15)).lineSpacing(4)
                    .foregroundStyle(Brand.text2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 300)
            }
            .padding(.top, 28)

            // Knapparna följer vad föraren har valt för platsen (DECISIONS #981, Malins förslag). Nekad plats: vägen in i
            // inställningarna, utan knappar som inte kan göra något. Självstart: bara Planera resa. Annars båda, bredvid
            // varandra och lika breda (Axel 14/11, DECISIONS #874), med länken till självstarten.
            if guardM.locationDenied {
                LocationDeniedRow().padding(.top, 14)
            } else if wakes {
                YellowPill(title: "Planera resa") { plan.begarSok() }.padding(.top, 24)
            } else {
                HStack(spacing: 10) {
                    Button { guardM.requestPermissionAndStart() } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill").font(.system(size: 12))
                            Text("Starta vakten").font(Typo.sans(16, .semibold)).lineLimit(1).minimumScaleFactor(0.85)
                        }
                        .foregroundStyle(Brand.bg)
                        .frame(maxWidth: .infinity).frame(height: 56)
                        .background(Brand.yellow, in: Capsule())
                    }
                    .buttonStyle(PressScale())
                    Button { plan.begarSok() } label: {
                        Text("Planera resa").font(Typo.sans(16, .semibold)).lineLimit(1).minimumScaleFactor(0.85)
                            .foregroundStyle(Brand.text)
                            .frame(maxWidth: .infinity).frame(height: 56)
                            .background(Brand.panel, in: Capsule())
                            .overlay(Capsule().strokeBorder(Brand.trackOff, lineWidth: 1))
                    }
                    .buttonStyle(PressScale())
                }
                .padding(.top, 24)
                MonoLink(title: "Låt vakten starta själv", action: latStartaSjalv).padding(.top, 4)
            }

            if let tur { kvitto(tur).padding(.top, 24) }

            naraDig(nara).padding(.top, 28)

            // Raden om senaste turen står bara när turen hade varningar, och raden med farornas namn är borta (DECISIONS #981).
            if let tur {
                Text("\(tur.varningar.count) \(tur.varningar.count == 1 ? "VARNING" : "VARNINGAR") · VISAS TILLS NÄSTA TUR")
                    .font(Typo.mono(10)).tracking(1.4).foregroundStyle(Brand.faint)
                    .padding(.top, 24)
            }
            // Löftet står i underrubriken när platsen saknas, annars här.
            if harPlats != nil {
                Text(Platsord.lofte)
                    .font(Typo.sans(13)).foregroundStyle(Brand.faint).multilineTextAlignment(.center).padding(.top, 8)
            }

            // S4 (DECISIONS #210): facitknapparna hör hemma där "Senast sagt" faktiskt visas — här, inte i
            // LastSaidCard som ingen vy använder sedan skinnet v3. Bara betatestare, bara på en varning med id.
            // Inte medan kortet Efter resan visas: det bär samma varning med samma knappar (kort #279).
            // Kort #999: en besvarad varning frågas inte om igen. Raden står kvar med Tack medan föraren är kvar på skärmen
            // (svaret går att ändra), och är borta nästa gång Redo. visas (Axels skärminspelning 11/11: "It always just stays").
            if resa == nil, prefs.facitOn, let text = prefs.lastSaidText, let id = prefs.lastSaidId, let at = prefs.lastSaidAt,
               Date.now.timeIntervalSince(at) < Facit.maxAge,   // äldre än så tar servern inte emot
               Facit.answerFor(prefs.facit, id: id, t: at) == nil || facitNu == "\(id)@\(at.timeIntervalSince1970)" {
                FacitRow(id: id, at: at, text: text) { facitNu = "\(id)@\(at.timeIntervalSince1970)" }.padding(.top, 10)
            }
        }
    }

    /// Platsen för kartan Nära dig: vaktens senaste när den finns, annars en enda avläsning när skärmen visas. Den stannar i
    /// telefonen; kartbilderna för området hämtas från Apple (NaraDigKarta).
    private var harPlats: (lon: Double, lat: Double)? { guardM.lastLoc ?? plats }

    private func hamtaPlats() async {
        let manager = CLLocationManager()
        let status = manager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else { return }
        // Telefonens senast kända plats först, så att kartan inte väntar på en ny avläsning (Axels telefon 14/11: kartan
        // visade hela landet).
        if let l = manager.location { plats = (lon: l.coordinate.longitude, lat: l.coordinate.latitude) }
        do {
            for try await u in CLLocationUpdate.liveUpdates() {
                if let l = u.location {
                    plats = (lon: l.coordinate.longitude, lat: l.coordinate.latitude)
                    break
                }
            }
        } catch {
            // Ingen plats: kartan visar hela landet.
        }
    }

    /// iOS frågar bara en gång. Har föraren redan svarat öppnas appens sida i Inställningar.
    /// Länken under knapparna: med Alltid slås självstarten på, annars leder den till platsvalet.
    private func latStartaSjalv() {
        if guardM.authStatus == .authorizedAlways { prefs.autoWake = true } else { slaPaPlatsen() }
    }

    private func slaPaPlatsen() {
        if CLLocationManager().authorizationStatus == .notDetermined {
            guardM.requestLocationPermission()
        } else if let u = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(u)
        }
    }

    private static func arKamera(_ h: Hazard) -> Bool {
        if case .point(_, let kind, _, _, _, _) = h { return kind == .camera }
        return false
    }

    /// De tre närmaste farorna inom sex mil, utan fartkamerorna: en kamera säger ingenting om väglaget, och de är så många
    /// att de annars fyller listan (Axels skärmbild 14/11: tre kameror).
    private var naraFaror: [NearbyItem] {
        guard let p = harPlats else { return [] }
        return Nearby.nearest(guardM.hazards.filter { !Self.arKamera($0) }, lon: p.lon, lat: p.lat, n: 3)
    }

    /// "Halka 12,4 km bort", "Inget rapporterat nära dig", eller "Redo." när platsen eller vägdatan saknas.
    private func rubrikNu(_ nara: [NearbyItem]) -> String {
        if guardM.locationDenied { return "Vakten kan inte varna" }
        guard harPlats != nil, guardM.snapshotInfo != nil else { return "Redo." }
        guard let forst = nara.first else { return "Inget rapporterat nära dig" }
        return "\(forst.rubrik) \(Nearby.distText(forst.distM)) bort"
    }

    private func underrubrik(_ nara: [NearbyItem]) -> String {
        if guardM.locationDenied { return "Utan platsen vet Halkvakt inte vad som ligger framför dig." }
        guard harPlats != nil, guardM.snapshotInfo != nil else { return subtitle }
        let start = wakes ? "Vakten vaknar själv när du kör." : "Tryck Starta vakten innan du kör."
        return nara.isEmpty ? "Inget inom sex mil just nu. \(start)" : start
    }

    /// Ett tryck väljer faran, ett tryck till på samma eller bredvid kartan släpper den.
    private func valj(_ id: String?) { valdFara = id == valdFara ? nil : id }

    /// Kartan och de närmaste farorna. Utan något nära står bara kartan: rubriken har redan sagt det (DECISIONS #981).
    private func naraDig(_ nara: [NearbyItem]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            NaraDigKarta(faror: guardM.hazards, plats: harPlats, valt: valdFara) { valj($0) }
            // Sagt där kartan står (DECISIONS #872): kartbilderna hämtas från Apple.
            Kartforklaring(sista: .du).padding(.top, 10).padding(.horizontal, 4)
            MonoLabel(text: "Kartan kommer från Apple", color: Brand.faint).padding(.top, 8).padding(.horizontal, 4)
            // Faran föraren tryckt på, på kartan eller i listan (DECISIONS #922). Försvinner den ur läget försvinner kortet.
            if let fara = guardM.hazards.first(where: { $0.id == valdFara }) {
                FaraKort(fara: fara, distM: harPlats.map { Nearby.distanceM(fara, lon: $0.lon, lat: $0.lat) },
                         lagetFran: guardM.lagetFran)
                    .padding(.top, 12)
            }
            if harPlats == nil {
                MonoLabel(text: "Halkan i landet just nu").padding(.top, 16).padding(.bottom, 10).padding(.horizontal, 4)
                Text("Slå på platsen för att se vad som finns nära dig.").font(Typo.sans(14)).foregroundStyle(Brand.text2)
                    .padding(.horizontal, 4)
                MonoLink(title: "Slå på platsen", action: slaPaPlatsen).padding(.horizontal, 4)
            } else if !nara.isEmpty {
                MonoLabel(text: "Nära dig just nu").padding(.top, 16).padding(.bottom, 10).padding(.horizontal, 4)
                RowPanel {
                    ForEach(Array(nara.enumerated()), id: \.element.id) { i, item in
                        Button { valj(item.id) } label: { NearbyRow(item: item, divider: i < nara.count - 1) }
                            .buttonStyle(.plain)
                            .accessibilityHint(item.id == valdFara ? "Döljer kortet om faran" : "Visar mer om faran")
                    }
                }
            }
        }
    }

    /// "PLANERAD RESA · Till Kristianstad · Avresa 15 nov. 07:15" — ett tryck öppnar resan med rapporten.
    private func planeradRad(_ p: Resplan.Plan) -> some View {
        Button { plan.begarResan() } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    MonoLabel(text: "Planerad resa")
                    Text("Till \(p.mal)").font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    Text("Avresa \(p.avresa?.dagOchKlockslag ?? ""). Se läget längs vägen.")
                        .font(Typo.sans(14)).foregroundStyle(Brand.text2)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Brand.dim)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Öppnar den planerade resan")
    }

    /// "1 RESA ATT SPARA · 34 km. Ge den ett namn under Resor." — ett tryck byter flik.
    private var attSpara: some View {
        Button { fav.visaFliken = true } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    MonoLabel(text: fav.dagens.count == 1 ? "1 resa att spara" : "\(fav.dagens.count) resor att spara")
                    Text("\(FavoritNotis.kmText(fav.dagens.last?.km ?? 0)). Ge den ett namn under Resor.")
                        .font(Typo.sans(14)).foregroundStyle(Brand.text2)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Brand.dim)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Öppnar Resor")
    }

    /// Brytaren av efter en lång resa: ett tryck slår på Spara resor. Resan som slutade samlades inte in och kan inte sparas.
    private var erbjudKort: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Resan slutade · \(String(format: "%.0f", prefs.lastTripKm)) km")
                Text("Kör du den här ofta? Slå på Spara resor.").font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                Text("Den här resan sparades inte, eftersom Spara resor var av. Nästa gång du kör frågar appen efteråt.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, 16)
            YellowPill(title: "Slå på Spara resor") { fav.erbjud = true }
            MonoLink(title: "Inte nu") { fav.erbjudDold = .now }
                .frame(maxWidth: .infinity).padding(.vertical, 6)
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    /// "Kör någon du känner samma vägar?" — telefonens delningsark; båda knapparna döljer kortet för gott.
    private var tipsaKort: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Fem pass med vakten")
                Text("Kör någon du känner samma vägar?").font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                Text("Tipsa om Halkvakt. Du skickar bara en länk, inget om dig.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, 16)
            // Kortet döljs först när föraren lämnar skärmen: försvann det under delningsarket kunde arket stängas med det.
            ShareLink(item: Tipsa.lank, message: Text(Tipsa.text)) {
                Text("Tipsa en vän").font(Typo.sans(17, .semibold)).foregroundStyle(Brand.bg)
                    .frame(width: 220, height: 56)
                    .background(Brand.yellow, in: Capsule())
            }
            .simultaneousGesture(TapGesture().onEnded { tipsatt = true })
            MonoLink(title: "Inte nu") { prefs.tipsaDold = true }
                .frame(maxWidth: .infinity).padding(.vertical, 6)
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    /// Kvittot över senaste turen (designen 01b): klockslag, ikon, rubrik och det rösten sa, en rad per varning.
    private func kvitto(_ tur: SenasteTur) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Senaste turen")
                Text(tur.rubrik).font(Typo.mono(12, .medium)).tracking(0.6).foregroundStyle(Brand.text)
            }
            .padding(.vertical, 16)
            ForEach(tur.varningar, id: \.self) { v in
                DashedDivider()
                HStack(alignment: .top, spacing: 12) {
                    Text(v.t.klockslag).font(Typo.mono(12, .medium)).foregroundStyle(Brand.dim)
                    if let k = HazardKind(rawValue: v.kind) {
                        HazardIcon(kind: k, size: 22).foregroundStyle(Brand.text)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(v.kind == HazardKind.slippery_segment.rawValue ? WarningCard.halkrubrik(v.text) : Self.rubrik(v.kind))
                            .font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                        Text("”\(v.text)”").font(Typo.sans(13)).foregroundStyle(Brand.text2)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 14)
                .accessibilityElement(children: .combine)
            }
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    private struct SenasteTur { let rubrik: String; let varningar: [AlertEntry] }

    /// Senaste avslutade turen med minst en varning; nil ⇒ Redo utan kvitto ("INGEN TUR ÄN", eller "INGA VARNINGAR SENASTE TUREN"
    /// efter en tur utan varningar — "ingen tur än" sa emot frågan Spara resan?, Axels skärmbild 24/10).
    private var senasteTuren: SenasteTur? {
        guard let start = prefs.tripStart, let slut = prefs.lastTripEnd, slut >= start else { return nil }
        let v = prefs.history.filter { $0.t >= start && $0.t <= slut }.sorted { $0.t < $1.t }
        guard !v.isEmpty else { return nil }
        let min = Int(slut.timeIntervalSince(start) / 60)
        let km = String(format: "%.0f", prefs.lastTripKm)
        return SenasteTur(rubrik: "\(start.klockslag)–\(slut.klockslag) · \(min) MIN · \(km) KM", varningar: v)
    }

    /// Kortets rubriker (DECISIONS #444) — samma ord på iPhone och Android.
    static func rubrik(_ kind: String) -> String {
        switch HazardKind(rawValue: kind) {
        case .accident: return "Olycka"
        case .slippery_segment: return "Halka"
        case .icing_point: return "Frysrisk"
        case .wildlife: return "Vilt"
        case .camera: return "Fartkamera"
        case .kandidat: return "Halka"   // #577: kortets rubrik, märkt BETA på kortet
        case .smavag: return "Halka"     // #828: småvägsrösten, märkt BETA på kortet som K
        case nil: return kind
        }
    }

    /// Resans obesvarade varningar och resans start — nil när kortet Efter resan inte ska visas.
    private var efterResan: (obes: [AlertEntry], sedan: Date)? {
        guard prefs.facitOn, let sedan = prefs.tripStart else { return nil }
        let obes = Resan.obesvarade(prefs.history, prefs.facit, sedan: sedan)
        let omarkerade = Missar.omarkerade(prefs.missar, sedan: sedan)   // #203 lager 2
        return Resan.fragaKvar(sedan: sedan, nu: .now, obesvarade: obes.count + omarkerade.count) ? (obes: obes, sedan: sedan) : nil
    }

    private var wakes: Bool { prefs.autoWake && guardM.authStatus == .authorizedAlways }

    private var subtitle: String {
        // "skickas aldrig till Halkvakt av sig själv" — samma ord som Android, introduktionen och produktboken (DECISIONS #900, fråga 9):
        // "lämnar inte telefonen" (#320) blev osant med kartan från Apple (0.4.1), och "av sig själv" står kvar för betatestets facitsvar.
        (wakes ? "Vakten vaknar själv när du kör. " : "") + Platsord.lofte
    }
}

/// Rad i "På din väg" (designen 02): ikon, avstånd i mono, faran, vägen.
struct NearbyRow: View {
    let item: NearbyItem
    var divider = false
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                HazardIcon(kind: item.kind, size: 20).foregroundStyle(Brand.dim)
                Text(Nearby.distText(item.distM).uppercased())
                    .font(Typo.mono(14)).foregroundStyle(Brand.text)
                    .frame(width: 70, alignment: .leading)
                Text(item.rubrik).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                Spacer(minLength: 8)
                if let s = item.secondary {
                    Text(s.uppercased()).font(Typo.mono(10)).tracking(1.2).foregroundStyle(Brand.faint).lineLimit(1)
                }
            }
            .frame(height: 52)
            if divider { DashedDivider() }
        }
        .accessibilityElement(children: .combine)
    }
}
