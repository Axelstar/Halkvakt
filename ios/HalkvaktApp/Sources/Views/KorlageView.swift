// KÖRLÄGET — designöverlämningen v2 (DECISIONS #443), 02 På vakt: PÅ VAKT, tid och km, tre räknare,
// "Tyst så länge" / senast sagt / gammal data (N), PÅ DIN VÄG, Avsluta vakten. Skärmen ligger i hållaren.
// Varningskortet tar hela skärmen i gult i 8 s och försvinner själv — ingen knapp.
// Rullar när den måste (kort #279): på Bengts 4,7-tums iPhone 28/9 klipptes raden om förvarningen till "…".
// Samma mönster som VaktenView — minsta höjd = skärmen, så stora telefoner ser ut som förut.
import SwiftUI
import HalkvaktEngine

struct KorlageView: View {
    @State private var guardM = GuardManager.shared
    @State private var now = Date.now
    /// Granskningsläge: håll på "PÅ VAKT" ⇒ kortet med en låtsasvarning, utan röst.
    @State private var demoWarning: HalkvaktEngine.Alert?
    @State private var demoTask: Task<Void, Never>?
    @State private var missKvitto: String?   // #203 lager 2
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let clock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            GeometryReader { geo in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        BrandHeader(trailing: "På", trailingColor: Brand.green)

                        // Panelen: PÅ VAKT, tid och sträcka, tre räknare.
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(spacing: 8) {
                                Circle().fill(Brand.green).frame(width: 7, height: 7)
                                MonoLabel(text: "På vakt", color: Brand.green)
                            }
                            .frame(height: 28)
                            .contentShape(Rectangle())   // hela raden tryckbar, inte bara bokstäverna
                            // simultaneousGesture, inte onLongPressGesture: inne i ScrollView (kort #279) tar rullningens gest
                            // touchen först, och långtrycket som fungerade i äldre byggen fyrade inte i (19) på Axels iPhone 1/10.
                            // Apples granskare ska kunna se ett varningskort utan att köra — det här är den vägen (kort #280).
                            .simultaneousGesture(LongPressGesture(minimumDuration: 0.5, maximumDistance: 30).onEnded { _ in
                                // Kort B ur designen, med motorns riktiga halkreplik (DECISIONS #443).
                                demoWarning = HalkvaktEngine.Alert(t: 0, hazardId: "demo", kind: .slippery_segment,
                                    distanceM: 900, text: "Varning: halka rapporterad på vägen framför dig.")
                                demoTask?.cancel()
                                demoTask = Task { try? await Task.sleep(for: .seconds(8)); if !Task.isCancelled { demoWarning = nil } }
                            })
                            HStack(alignment: .firstTextBaseline, spacing: 22) {
                                tal("\(elapsedMin)", "MIN")
                                tal(distKm, "KM")
                            }
                            .padding(.top, 8)
                            DashedDivider().padding(.top, 18)
                            HStack(spacing: 0) {
                                Stat(value: "\(guardM.alertCount)", label: "Varningar")
                                Stat(value: "\(count(.slippery_segment))", label: "Halka", leftRule: true)
                                Stat(value: "\(count(.wildlife))", label: "Vilt", leftRule: true)
                            }
                            .padding(.top, 16)
                        }
                        .padding(20)
                        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
                        .padding(.top, 12)

                        tillstand.padding(.top, 14)

                        HStack {
                            MonoLabel(text: "På din väg")
                            Spacer()
                            // Kort #258: vägdatans klockslag — flyttar den sig under resan har omladdningen skett.
                            if let info = guardM.snapshotInfo {
                                Text((info.components(separatedBy: " · ").last ?? info).uppercased())
                                    .font(Typo.mono(10)).tracking(1.4).foregroundStyle(Brand.faint)
                            }
                        }
                        .padding(.horizontal, 4).padding(.top, 26)
                        if !guardM.nearby.isEmpty {
                            RowPanel {
                                ForEach(Array(guardM.nearby.prefix(3).enumerated()), id: \.element.id) { i, item in
                                    NearbyRow(item: item, divider: i < min(3, guardM.nearby.count) - 1)
                                }
                            }
                            .padding(.top, 10)
                        }

                        Spacer(minLength: 20)

                        VStack(spacing: 8) {
                            // Kort #203 lager 2 (Axels ja, #267 p. 5): iPhones reserv för en miss — Siri är huvudvägen. Bara med betatestet på.
                            if Prefs.shared.facitOn {
                                MonoLink(title: "Appen missade något") {
                                    missKvitto = guardM.markeraMiss()
                                        ? "Markerat \(Date.now.klockslag) — du väljer vad det var efter resan."
                                        : "Kunde inte markera: appen har ingen position eller stationslista än."
                                }
                                if let k = missKvitto { Text(k).font(Typo.sans(12)).foregroundStyle(Brand.dim).multilineTextAlignment(.center) }
                            }
                            NeutralPill(title: "Avsluta vakten") { guardM.stop() }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 22)
                    }
                    .padding(.horizontal, 24)
                    .frame(minHeight: geo.size.height, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
                .scrollIndicators(.hidden)
            }

            // Gammal väglagsdata (designen M): mörk rad överst i 8 s medan rösten talar. Inget gult — ingen fara.
            if guardM.staleToast {
                VStack {
                    HStack(alignment: .top, spacing: 14) {
                        HStack(spacing: 3) {
                            ForEach([8.0, 16, 11, 18, 7], id: \.self) { h in RoundedRectangle(cornerRadius: 2).frame(width: 3, height: h) }
                        }
                        .frame(height: 22).foregroundStyle(Brand.text)
                        VStack(alignment: .leading, spacing: 6) {
                            MonoLabel(text: "Halkvakt · väglagsdata")
                            Text("”\(AgeGate.staleLine)”").font(Typo.sans(17, .medium)).foregroundStyle(Brand.text)
                        }
                    }
                    .padding(.horizontal, 18).padding(.vertical, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Brand.raisedSolid, in: RoundedRectangle(cornerRadius: 22))
                    .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Color(hex: 0x34424A), lineWidth: 1))
                    .shadow(color: .black.opacity(0.6), radius: 20, y: 18)
                    .padding(.horizontal, 12).padding(.top, 4)
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .accessibilityElement(children: .combine)
            }

            if let w = guardM.currentWarning ?? demoWarning {
                // Kort ersätter kort (designen 04): det nya glider upp och täcker, det gamla krymper och tonar bort.
                // .id per varning ger en ny vy — och en ny 8-sekundersstapel — när en viktigare fara tar över.
                WarningCardView(card: guardM.card(for: w))
                    .id(Self.warningID(w))
                    .transition(reduceMotion ? .opacity : .asymmetric(
                        insertion: .move(edge: .bottom),
                        removal: .scale(scale: 0.92).combined(with: .opacity)))
                    .zIndex(1)
            }
        }
        .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.38), value: (guardM.currentWarning ?? demoWarning).map(Self.warningID))
        .animation(.easeOut(duration: 0.3), value: guardM.staleToast)
        .onReceive(clock) { now = $0 }
        .preferredColorScheme(.dark)
        .persistentSystemOverlays(.hidden)
    }

    private static func warningID(_ a: HalkvaktEngine.Alert) -> String { "\(a.hazardId)@\(a.t)" }

    private func tal(_ v: String, _ enhet: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(v).font(Typo.mono(40, .medium)).tracking(-0.8).foregroundStyle(Brand.text)
            MonoLabel(text: enhet, size: 11)
        }
    }

    /// Raden under panelen: gammal data (designen N) går före allt; annars det senast sagda, eller "Tyst så länge".
    @ViewBuilder private var tillstand: some View {
        if guardM.dataStale {
            HStack(alignment: .top, spacing: 14) {
                Image("ikon-halka").renderingMode(.template).resizable().scaledToFit().frame(width: 24, height: 24)
                    .foregroundStyle(Brand.text)
                VStack(alignment: .leading, spacing: 6) {
                    MonoLabel(text: "Väglagsdata · gammal")
                    Text("Kör som om det kan vara halt.").font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                    if let t = guardM.dataTime { MonoLabel(text: "Senast färsk \(t.klockslag)", color: Brand.faint) }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .background(Color(hex: 0x0B1013), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Color(hex: 0x34424A), lineWidth: 1))
            .accessibilityElement(children: .combine)
        } else if let said = guardM.lastSaid {
            VStack(alignment: .leading, spacing: 6) {
                // #250 (b): när repliken sades, inte klockan nu
                MonoLabel(text: "Senast sagt · \((Prefs.shared.lastSaidAt ?? now).klockslag)")
                Text("”\(said)”").font(Typo.sans(15)).foregroundStyle(Brand.text)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.divider, style: StrokeStyle(lineWidth: 1, dash: [4, 4])))
        } else {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Tyst så länge")
                Text("Inget på din väg än. Du hör det direkt när något dyker upp.").font(Typo.sans(15)).foregroundStyle(Brand.text2)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.divider, style: StrokeStyle(lineWidth: 1, dash: [4, 4])))
        }
    }
    private var elapsedMin: Int { Int(guardM.drivingSeconds / 60) }
    private var distKm: String { String(format: "%.0f", guardM.distanceKm) }
    private func count(_ k: HazardKind) -> Int { guardM.history.filter { $0.kind == k }.count }
}

private struct Stat: View {
    let value: String
    let label: String
    var leftRule = false
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(Typo.mono(22, .medium)).foregroundStyle(Brand.text)
            MonoLabel(text: label)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.leading, leftRule ? 16 : 0)
        .overlay(alignment: .leading) {
            if leftRule {
                VerticalDash()
            }
        }
        .accessibilityElement(children: .combine)
    }
}
