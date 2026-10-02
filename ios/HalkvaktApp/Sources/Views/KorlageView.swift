// KÖRLÄGET — skinnet v3 (1a): PÅ VAKT, tid · km stort, tre siffror, SENAST SAGT,
// PÅ DIN VÄG, avsluta lågt som kontur. Skärmen ligger i hållaren; ingenting ska läsas.
// Varningskortet (1b) tar hela skärmen i gult i 8 s och försvinner själv — ingen knapp.
// Rullar när den måste (kort #279): på Bengts 4,7-tums iPhone 28/9 klipptes raden om förvarningen till "…".
// Samma mönster som VaktenView — minsta höjd = skärmen, så stora telefoner ser ut som förut.
import SwiftUI
import HalkvaktEngine

struct KorlageView: View {
    @State private var guardM = GuardManager.shared
    @State private var now = Date.now
    /// Granskningsläge: håll på "PÅ VAKT" ⇒ kortet med en låtsasvarning, utan röst.
    @State private var demoWarning: HalkvaktEngine.Alert?
    @State private var missKvitto: String?   // #203 lager 2
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let clock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            GeometryReader { geo in
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        BrandHeader(trailing: "Vakten på", trailingColor: Brand.green)

                        Panel {
                            VStack(alignment: .leading, spacing: 5) {
                                SectionHeader(text: "På vakt", color: Brand.greenText)
                                    .frame(height: 28)
                                    .contentShape(Rectangle())   // hela raden tryckbar, inte bara bokstäverna
                                    // simultaneousGesture, inte onLongPressGesture: inne i ScrollView (kort #279) tar rullningens gest
                                    // touchen först, och långtrycket som fungerade i äldre byggen fyrade inte i (19) på Axels iPhone 1/10.
                                    // Apples granskare ska kunna se ett varningskort utan att köra — det här är den vägen (kort #280).
                                    .simultaneousGesture(LongPressGesture(minimumDuration: 0.5, maximumDistance: 30).onEnded { _ in
                                        // Kort B ur designen, med motorns riktiga halkreplik (DECISIONS #443).
                                        demoWarning = HalkvaktEngine.Alert(t: 0, hazardId: "demo", kind: .slippery_segment,
                                            distanceM: 900, text: "Varning: halka rapporterad på vägen framför dig.")
                                        Task { try? await Task.sleep(for: .seconds(8)); demoWarning = nil }
                                    })
                                Text("\(elapsedMin) min · \(distKm) km")
                                    .font(Typo.sans(34, .semibold)).tracking(-1)
                                    .foregroundStyle(Brand.text)
                                Text("Rösten talar ungefär 30 sekunder före, som längst \(String(format: "%.1f", Prefs.shared.leadMaxM / 1000).replacingOccurrences(of: ".", with: ",")) km. En olycka längre fram kan nämnas tidigare.")
                                    .font(Typo.sans(13)).foregroundStyle(Brand.dim)
                            }
                            HStack(spacing: 10) {
                                Stat(value: "\(guardM.alertCount)", label: "Varningar")
                                Stat(value: "\(count(.slippery_segment))", label: "Halka")
                                Stat(value: "\(count(.wildlife))", label: "Vilt")
                            }
                        }

                        if let said = guardM.lastSaid {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    SectionHeader(text: "Senast sagt")
                                    // #250 (b): när repliken sades, inte klockan nu
                                    Text((Prefs.shared.lastSaidAt ?? now).klockslag).font(Typo.mono(11)).foregroundStyle(Brand.faint)
                                }
                                Text("”\(said)”").font(Typo.sans(16)).italic().foregroundStyle(Brand.text)
                            }
                            .padding(.horizontal, 20).padding(.vertical, 16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Brand.yellow.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
                            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Brand.yellow.opacity(0.3), lineWidth: 1))
                        } else {
                            Panel(dashed: true) {
                                SectionHeader(text: "Tyst så länge", color: Brand.faint)
                                Text("Inget på din väg än. Du hör det direkt när något dyker upp.")
                                    .font(Typo.sans(14)).foregroundStyle(Brand.dim)
                            }
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                SectionHeader(text: "På din väg", color: Brand.dim)
                                // Kort #258: vägdatans klockslag, som Androids rad under *I närheten*. Raden försvann med skinnet v3
                                // (31c58e6) och kortets Verify — "väglag HH:mm flyttar sig under resan" — gick inte att se
                                // (Bengts läsning 2/10). Flyttar sig tiden har omladdningen var 30:e minut bevisligen skett.
                                if let info = guardM.snapshotInfo {
                                    Text(info.components(separatedBy: " · ").last ?? info).font(Typo.mono(11)).foregroundStyle(Brand.faint)
                                }
                            }
                            ForEach(guardM.nearby.prefix(3)) { NearbyRow(item: $0) }
                        }

                        Spacer()

                        // Kort #203 lager 2 (Axels ja, #267 p. 5): iPhones reserv för en miss — Siri är huvudvägen. Bara med betatestet på.
                        if Prefs.shared.facitOn {
                            OutlineButton(title: "Appen missade", icon: "exclamationmark.bubble", color: Brand.yellow) {
                                missKvitto = guardM.markeraMiss()
                                    ? "Markerat \(Date.now.klockslag) — du väljer vad det var efter resan."
                                    : "Kunde inte markera: appen har ingen position eller stationslista än."
                            }
                            if let k = missKvitto { Text(k).font(Typo.sans(12)).foregroundStyle(Brand.dim) }
                        }

                        OutlineButton(title: "Avsluta vakten") { guardM.stop() }
                    }
                    .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 18)
                    .frame(minHeight: geo.size.height, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
                .scrollIndicators(.hidden)
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
        .onReceive(clock) { now = $0 }
        .preferredColorScheme(.dark)
        .persistentSystemOverlays(.hidden)
    }

    private static func warningID(_ a: HalkvaktEngine.Alert) -> String { "\(a.hazardId)@\(a.t)" }
    private var elapsedMin: Int { Int(guardM.drivingSeconds / 60) }
    private var distKm: String { String(format: "%.0f", guardM.distanceKm) }
    private func count(_ k: HazardKind) -> Int { guardM.history.filter { $0.kind == k }.count }
}

private struct Stat: View {
    let value: String
    let label: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(Typo.mono(22, .semibold)).foregroundStyle(Brand.text)
            Text(label).font(Typo.sans(11)).tracking(0.3).foregroundStyle(Brand.dim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(Brand.raised, in: RoundedRectangle(cornerRadius: 14))
    }
}

