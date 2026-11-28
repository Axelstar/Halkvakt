// EN PLANERAD RESA FÖRE START (kort #659, DECISIONS #870, ny skärm #930, Förslag A #933): omdömet i en mening överst, Starta
// vakten, vägen på kartan med ett gult märke per halksträcka, resans sträckor i den ordning föraren kör, resten av rapporten och
// en påminnelse före avresan. Allt är läget nu: klocktiderna vid sträckorna säger när föraren är där, inte hur vägen är då.
// Kartan är Apples, i gråskala: Apples villkor säger att vägen de räknar ut bara får visas på deras karta (bilaga 6, punkt 2.4).
import SwiftUI
import MapKit
import HalkvaktEngine

struct PlaneradResaView: View {
    @State private var plan = Resplan.shared
    @State private var rapport: Rapporten.Planerad?
    @State private var strackor: [Resstracka] = []
    @State private var kum: [Double] = []
    @State private var gickInte = false
    @State private var paminn = false
    @State private var avresa = Date.now.addingTimeInterval(3600)
    @State private var notisFel = false
    /// Sant när reglaget just slogs av för att påminnelsen inte gick att sätta: då ska felraden stå kvar.
    @State private var avslagetAvFel = false
    /// Raderna under Övrigt på vägen som föraren har öppnat (DECISIONS #931). Alla börjar stängda.
    @State private var oppnaRader: Set<String> = []
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Button { dismiss() } label: {
                    Text("← TILLBAKA").font(Typo.mono(11)).tracking(1.5).foregroundStyle(Brand.text).frame(height: 44)
                }
                if let p = plan.plan {
                    Text("Till \(p.mal)").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 8)
                        .accessibilityAddTraits(.isHeader)
                    MonoLabel(text: Self.matt(p), size: 11).padding(.top, 14)

                    if let rapport {
                        dom(rapport, p).padding(.top, 24)
                    } else {
                        Text(gickInte ? "Läget kunde inte hämtas. Dra nedåt för att försöka igen." : "Kollar läget …")
                            .font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 28)
                    }

                    // Det föraren gör står direkt under domen, före resten av rapporten (Axel 14/11, DECISIONS #874).
                    HStack {
                        Spacer()
                        YellowPill(title: "Starta vakten", playIcon: true) { GuardManager.shared.requestPermissionAndStart() }
                        Spacer()
                    }
                    .padding(.top, 24)
                    if let hinder = rapport?.rader.first(where: { Self.tipsSlag.contains($0.slag) }) {
                        Text("\(hinder.rubrik) längs vägen. Se om det finns en annan väg i din kartapp.")
                            .font(Typo.sans(14, .medium)).lineSpacing(3).foregroundStyle(Brand.yellow)
                            .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                            .padding(.top, 16)
                    }
                    HStack(spacing: 24) {
                        MonoLink(title: "Öppna i Kartor") { oppna("http://maps.apple.com/?daddr=%@&dirflg=d", p) }
                        MonoLink(title: "Öppna i Google Maps") {
                            oppna("https://www.google.com/maps/dir/?api=1&destination=%@&travelmode=driving", p)
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.top, 4)
                    // DECISIONS #875: sagt där länkarna står, och bara när det är sant.
                    if GuardManager.shared.platsTillaten {
                        Text("Vakten startar när du öppnar kartappen.")
                            .font(Typo.sans(13)).foregroundStyle(Brand.dim)
                            .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                    }

                    if let rapport {
                        // Vägen och sträckorna visas när något längs vägen är halt eller har frysrisk. En lugn resa behöver dem inte.
                        if strackor.contains(where: { $0.lage != .lugnt }) {
                            MonoLabel(text: "Längs vägen, i den ordning du kör", size: 11).padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
                            VStack(alignment: .leading, spacing: 0) {
                                karta(p, rapport)
                                Kartforklaring(sista: .vagen).padding(.top, 12).padding(.bottom, 6)
                                MonoLabel(text: "Kartan kommer från Apple", color: Brand.faint).padding(.bottom, 14)
                                ResansStrackor(strackor: strackor, mal: p.mal, totalM: Int((kum.last ?? 0).rounded()),
                                               restidS: p.restidS, avresa: max(p.avresa ?? Date.now, Date.now))
                                    .id(rapport.kollat)
                            }
                            .padding(20)
                            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
                        }
                        ovrigt(rapport)
                    }

                    MonoLabel(text: "När åker du?").padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
                    RowPanel {
                        GreenToggleRow(title: "Påminn mig före avresan", sub: "En notis en kvart innan", isOn: $paminn)
                        if paminn {
                            DashedDivider()
                            // Tidigast en kvart och en minut fram: påminnelsen kommer en kvart före, och en tidigare tid går inte att sätta.
                            // Utan gränsen stannar hjulet på ogiltiga tider på väg till den rätta (Axels inspelning 28/11).
                            DatePicker("Avresa", selection: $avresa, in: Date.now.addingTimeInterval(AvreseNotis.foreS + 60)..., displayedComponents: [.date, .hourAndMinute])
                                .font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                                .tint(Brand.green)
                                .environment(\.locale, Locale(identifier: "sv_SE"))
                                .padding(.vertical, 10)
                        }
                    }
                    Text(notisFel
                         ? "Påminnelsen kunde inte sättas. Kontrollera att notiserna är på och att tiden ligger minst en kvart fram."
                         : "Notisen säger inte vad som finns längs vägen. Den öppnar Halkvakt, där läget hämtas färskt.")
                        .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(notisFel ? Brand.yellow : Brand.dim)
                        .padding(.top, 14).padding(.horizontal, 4)

                    VStack(spacing: 4) {
                        MonoLabel(text: p.avresa == nil ? "Resan sparas inte" : "Avresa \(p.avresa?.dagOchKlockslag ?? "")")
                        // En lugn resa visar ingen karta, men vägen är ändå Apples (Resplan).
                        MonoLabel(text: "Vägen kommer från Apple", color: Brand.faint)
                        if p.avresa != nil {
                            MonoLink(title: "Ta bort resan") { plan.rensa(); dismiss() }
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.top, 24)
                } else {
                    Text("Ingen resa är planerad.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 28)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg)
        // Innehållet slutar ovanför flikraden (Axels inspelning 20/11: texten syntes under och bakom den, DECISIONS #933).
        .safeAreaInset(edge: .bottom, spacing: 0) { Color.clear.frame(height: 76).frame(maxWidth: .infinity).background(Brand.bg) }
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await hamta() }
        .task {
            if let t = plan.plan?.avresa, t > .now {
                avresa = t
                paminn = true
            }
            await hamta()
        }
        .onChange(of: paminn) { _, _ in Task { await sattAvresa() } }
        .onChange(of: avresa) { _, _ in Task { await sattAvresa() } }
    }

    // MARK: - Domen

    /// Kortet överst: omdömet i en mening och när läget kollades. Ur en gammal lägesfil visas varken halka eller frysrisk
    /// (åldersgränsen), och då får kortet inte säga att det är lugnt.
    private func dom(_ r: Rapporten.Planerad, _ p: Resplan.Plan) -> some View {
        let oroligt = !r.gammaltVaglag && strackor.contains { $0.lage != .lugnt }
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Circle().fill(oroligt || r.gammaltVaglag ? Brand.yellow : Brand.trackOff).frame(width: 7, height: 7).accessibilityHidden(true)
                MonoLabel(text: "Just nu", color: Brand.text, size: 11)
                Spacer()
                MonoLabel(text: "Kollat \(r.kollat.klockslag)", size: 11)
            }
            Text(r.gammaltVaglag ? "Väglaget är för gammalt." : Resstrackor.dom(strackor))
                .font(Typo.sans(26, .semibold)).tracking(-0.5).foregroundStyle(Brand.text)
                .accessibilityAddTraits(.isHeader)
            if r.gammaltVaglag {
                Text("Väglaget är äldre än 45 minuter och visas inte som läget just nu. Dra nedåt för att hämta igen.")
                    .font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2)
            }
            if r.gamlaOlyckor {
                Text("Olyckorna är äldre än två timmar och visas inte som läget just nu.").font(Typo.sans(14)).foregroundStyle(Brand.yellow)
            }
        }
        .padding(20).frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    /// Vägen på Apples karta: grå, med en gul prick per halksträcka och en gul ring per plats med frysrisk, där de ligger längs
    /// vägen. Utsnittet är vägens ram med luft omkring.
    private func karta(_ p: Resplan.Plan, _ r: Rapporten.Planerad) -> some View {
        let koord = { (q: [Double]) in CLLocationCoordinate2D(latitude: q[1], longitude: q[0]) }
        let marken = { (slag: RapportSlag) in
            r.rader.filter { $0.slag == slag }.compactMap { rad in
                Resstrackor.punkt(p.punkter, kum: kum, m: Double(rad.langsM)).map { Kartbild.Plats(id: rad.id, koord: koord($0)) }
            }
        }
        let lon = p.punkter.map { $0[0] }, lat = p.punkter.map { $0[1] }
        let omrade = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: ((lat.min() ?? 0) + (lat.max() ?? 0)) / 2, longitude: ((lon.min() ?? 0) + (lon.max() ?? 0)) / 2),
            span: MKCoordinateSpan(latitudeDelta: max(((lat.max() ?? 0) - (lat.min() ?? 0)) * 1.3, 0.1),
                                   longitudeDelta: max(((lon.max() ?? 0) - (lon.min() ?? 0)) * 1.3, 0.1)))
        return Kartbild(omrade: omrade, hojd: 236, vag: p.punkter.map(koord), halka: marken(.halka), frysrisk: marken(.frysrisk),
                        nyckel: "resa|\(p.punkter.count)|\(lat.first ?? 0)|\(lat.last ?? 0)",
                        etikett: "Karta med vägen till \(p.mal). \(Resstrackor.dom(strackor))")
    }

    // MARK: - Resten av rapporten

    /// Raderna under Övrigt på vägen när sträckorna visas: en rad per sort, inte en per händelse (Axel 20/11, DECISIONS #933).
    /// Olyckorna har en egen rad, överst, när det finns någon. Restidssträckorna är mätpunkter och inga händelser.
    private static let sorter: [(namn: String, slag: Set<RapportSlag>)] = [
        ("Olyckor", [.olycka]), ("Vägarbeten", [.vagarbete, .hastighet, .omledning]), ("Fartkameror", [.kamera]),
        ("Hinder", [.hinder, .vilt]), ("Trafik", [.ko, .farja]),
    ]

    /// En rad under Övrigt på vägen: rubriken, och texten först när föraren öppnar raden (DECISIONS #931), som sträckorna.
    /// En rad utan text går inte att öppna.
    @ViewBuilder
    private func ovrigRad(id: String, titel: String, text: String, divider: Bool) -> some View {
        let oppen = oppnaRader.contains(id)
        VStack(alignment: .leading, spacing: 0) {
            Button {
                if oppen { oppnaRader.remove(id) } else { oppnaRader.insert(id) }
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text).multilineTextAlignment(.leading)
                        Spacer(minLength: 8)
                        if !text.isEmpty {
                            Text(oppen ? "−" : "+").font(Typo.mono(11, .semibold)).foregroundStyle(Brand.dim)
                        }
                    }
                    if oppen, !text.isEmpty {
                        Text(text).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).multilineTextAlignment(.leading)
                    }
                }
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(text.isEmpty)
            .accessibilityHint(text.isEmpty ? "" : oppen ? "Döljer texten" : "Visar texten")
            if divider { DashedDivider() }
        }
    }

    /// Det som inte är väglag: vägarbeten, kameror, olyckor och det andra, sammanslaget som i rapporten för en sparad resa, raden om
    /// det tomma, SMHI:s varningar och rutan Halkvakt tror (DECISIONS #739). Halkan och frysrisken står i sträckorna ovanför; ur
    /// en lugn resa finns de inte, och då heter rutan Längs vägen.
    private func ovrigt(_ r: Rapporten.Planerad) -> some View {
        let lugn = !strackor.contains { $0.lage != .lugnt }
        let rader = r.rader.filter { $0.slag != .halka && $0.slag != .frysrisk }
        let perId = Dictionary(rader.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let grupper = ResansRapport.grupperade(rader)
        return VStack(alignment: .leading, spacing: 0) {
            MonoLabel(text: lugn ? "Längs vägen" : "Övrigt på vägen", size: 11).padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
            if grupper.isEmpty {
                Text("Inget mer rapporterat längs vägen just nu.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.horizontal, 4)
            } else if !lugn {
                // Med sträckorna ovanför står varje rad redan under sin sträcka (DECISIONS #932). Här står bara hur många det är
                // av varje slag, och SMHI:s varningar, som gäller hela resan.
                let sorter = Self.sorter.map { s in (namn: s.namn, antal: rader.filter { s.slag.contains($0.slag) }.count) }.filter { $0.antal > 0 }
                let smhi = grupper.filter { $0.slag == .smhi }
                RowPanel {
                    ForEach(Array(sorter.enumerated()), id: \.element.namn) { i, s in
                        ReceiptRow(label: s.namn, value: "\(s.antal)", divider: i < sorter.count - 1 || !smhi.isEmpty)
                    }
                    ForEach(Array(smhi.enumerated()), id: \.element.id) { i, g in
                        ovrigRad(id: g.id, titel: g.rubrik, text: g.text, divider: i < smhi.count - 1)
                    }
                }
                if !sorter.isEmpty {
                    Text("Öppna en sträcka för att se vad det är.").font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.dim)
                        .padding(.top, 14).padding(.horizontal, 4)
                }
            } else {
                RowPanel {
                    ForEach(Array(grupper.enumerated()), id: \.element.id) { i, g in
                        let ensam = g.antal == 1 && !g.id.hasPrefix("grupp:")
                        ovrigRad(id: g.id, titel: ensam ? ResansRapport.titel(g.rubrik, vag: perId[g.id]?.vag) : g.rubrik, text: g.text,
                                 divider: i < grupper.count - 1)
                    }
                }
            }
            if let tomt = ResansRapport.tomtRad(r.rader, gammaltVaglag: r.gammaltVaglag, gamlaOlyckor: r.gamlaOlyckor) {
                Text(tomt).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.dim).padding(.top, 14).padding(.horizontal, 4)
            }

            MonoLabel(text: "Halkvakt tror · beta").padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
            if let tomt = ResansRapport.kandidatTomt(r.kandidat, gammaltVaglag: r.gammaltVaglag) {
                Text(tomt).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.horizontal, 4)
            } else if let kandidat = r.kandidat {
                RowPanel {
                    ForEach(Array(kandidat.enumerated()), id: \.element.id) { i, k in
                        RapportRadVy(titel: k.rubrik, text: k.text, divider: i < kandidat.count - 1)
                    }
                }
                Text(ResansRapport.kandidatFot).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.dim)
                    .padding(.top, 14).padding(.horizontal, 4)
            }
        }
    }

    /// Det som kan göra en annan väg värd att se efter: olycka, hinder, halka, kö och omledning.
    private static let tipsSlag: Set<RapportSlag> = [.olycka, .hinder, .halka, .ko, .omledning]

    /// Öppnar resans mål i förarens kartapp, som visar vägarna dit. Målet går då till den appen, på förarens tryck.
    /// Vakten startar i samma tryck (Axel 14/11, DECISIONS #875), så att rösten är med när föraren kör efter kartappen.
    private func oppna(_ mall: String, _ p: Resplan.Plan) {
        guard let mal = p.punkter.last, mal.count == 2,
              let url = URL(string: String(format: mall, "\(mal[1]),\(mal[0])")) else { return }
        GuardManager.shared.startInforKartappen()
        UIApplication.shared.open(url)
    }

    private func hamta() async {
        guard let p = plan.plan else { return }
        let ny = await Rapporten.shared.planerad(p.punkter)
        if let ny {
            kum = Resstrackor.kumulativ(p.punkter)
            strackor = Resstrackor.strackor(p.punkter, rader: ny.rader, orter: Sverigekarta.orter)
            rapport = ny
        }
        gickInte = ny == nil
    }

    /// Går påminnelsen inte att sätta slås reglaget av igen, så att det inte säger på när ingen notis kommer. Felraden står kvar
    /// tills föraren själv slår av reglaget eller en påminnelse har satts.
    private func sattAvresa() async {
        guard paminn else {
            _ = await plan.sattAvresa(nil)
            if avslagetAvFel { avslagetAvFel = false } else { notisFel = false }
            return
        }
        let ok = await plan.sattAvresa(avresa)
        notisFel = !ok
        if !ok {
            avslagetAvFel = true
            paminn = false
        }
    }

    private static func kmText(_ km: Double) -> String {
        km < 10 ? String(format: "%.1f km", km).replacingOccurrences(of: ".", with: ",") : String(format: "%.0f km", km)
    }

    /// "614 KM · CA 6 TIM", eller bara längden för en resa utan restid.
    private static func matt(_ p: Resplan.Plan) -> String {
        guard let s = p.restidS, s > 0 else { return kmText(p.km) }
        let m = Int((s / 300).rounded()) * 5
        let tid = m < 90 ? "\(max(m, 5)) min" : m % 60 < 15 || m % 60 > 45 ? "\(Int((Double(m) / 60).rounded())) tim"
            : "\(m / 60) tim \(m % 60) min"
        return "\(kmText(p.km)) · ca \(tid)"
    }
}
