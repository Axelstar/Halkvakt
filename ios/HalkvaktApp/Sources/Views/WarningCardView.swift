// VARNINGSKORTET — designöverlämningen v2 (DECISIONS #443), Varningskort.dc.html.
// Helskärm i gult i 8 s medan rösten talar, sedan bort av sig själv — ingen knapp. Läses med en blick i hållaren.
// Innehållet (rubrik, avstånd, skyltar, råd) kommer ur HalkvaktEngine.WarningCard, som CI testar;
// här finns bara layouten. Fast ordning uppifrån: huvudrad, läge, ikon, rubrik, avstånd, råd, repliken, tidsstapeln.
import SwiftUI
import HalkvaktEngine

struct WarningCardView: View {
    let card: WarningCard
    @State private var shownAt = Date.now
    @State private var progress = 0.0

    private static let ink = Brand.bg                       // #080B0D
    private static let ink2 = Color(hex: 0x3A2E0B)          // andratext på gult
    private static let seconds = 8.0

    var body: some View {
        ZStack {
            Brand.yellow.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                header
                    .padding(.bottom, 16)
                if let stage = card.stage {
                    Text(stage)
                        .font(Typo.mono(12, .semibold)).tracking(1.7)
                        .foregroundStyle(Brand.yellow)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Self.ink, in: RoundedRectangle(cornerRadius: 8))
                        .padding(.bottom, 22)
                }
                Image("ikon-\(card.icon.assetName)")
                    .renderingMode(.template).resizable().scaledToFit()
                    .frame(width: 96, height: 96)
                    .accessibilityHidden(true)
                Text(card.title)
                    .font(Typo.sans(56, .semibold)).tracking(-2)
                    .lineSpacing(-4).minimumScaleFactor(0.6)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 22)
                if let sub = card.sub {
                    Text(sub).font(Typo.sans(20, .medium)).foregroundStyle(Self.ink2).padding(.top, 10)
                }
                distanceRow.padding(.top, 26)
                if let advice = card.advice { adviceBox(advice) }
                Spacer(minLength: 16)
                voiceLine
                progressRow.padding(.top, 18)
            }
            .foregroundStyle(Self.ink)
            .padding(.horizontal, 28).padding(.top, 16).padding(.bottom, 22)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Halkvakt varnar. \(card.title). \(card.quote)")
        .onAppear { withAnimation(.linear(duration: Self.seconds)) { progress = 1 } }
    }

    private var header: some View {
        HStack {
            HStack(spacing: 10) {
                Image("ikon-mark").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 14)
                Text("HALKVAKT VARNAR").font(Typo.mono(11, .semibold)).tracking(1.5)
            }
            Spacer()
            Text(shownAt.klockslag).font(Typo.mono(11, .medium)).tracking(1.5)
        }
        .frame(height: 32)
    }

    private var distanceRow: some View {
        HStack(alignment: .center, spacing: 18) {
            switch card.distance {
            case .number(let value, let unit):
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(value).font(Typo.mono(68, .semibold)).tracking(-2)
                    Text(unit).font(Typo.mono(18, .semibold)).tracking(2)
                }
            case .words(let words):
                Text(words).font(Typo.mono(24, .semibold)).tracking(2.9)
            }
            if let road = card.road {
                Text(road)
                    .font(Typo.mono(20, .semibold)).tracking(1.2).lineLimit(1)
                    .padding(.horizontal, 12).frame(height: 44)
                    .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(Self.ink, lineWidth: 3))
            }
            if let limit = card.limit {
                Text("\(limit)")
                    .font(Typo.mono(24, .semibold))
                    .frame(width: 64, height: 64)
                    .overlay(Circle().strokeBorder(Self.ink, lineWidth: 6))
                    .accessibilityLabel("Gränsen är \(limit)")
            }
        }
        .frame(minHeight: 72)
        .minimumScaleFactor(0.7)
    }

    private func adviceBox(_ advice: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(advice).font(Typo.sans(24, .semibold)).tracking(-0.4)
            if let sub = card.adviceSub {
                Text(sub).font(Typo.mono(11, .medium)).tracking(1.5)
            }
        }
        .foregroundStyle(Brand.yellow)
        .padding(.horizontal, 18).padding(.vertical, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.ink, in: RoundedRectangle(cornerRadius: 16))
        .padding(.top, 22)
    }

    private var voiceLine: some View {
        HStack(alignment: .top, spacing: 12) {
            HStack(spacing: 3) {
                ForEach([8.0, 16, 11, 18, 7], id: \.self) { h in
                    RoundedRectangle(cornerRadius: 2).frame(width: 3, height: h)
                }
            }
            .frame(height: 20)
            Text("”\(card.quote)”").font(Typo.sans(15)).lineSpacing(5)
        }
        .foregroundStyle(Self.ink2)
    }

    private var progressRow: some View {
        HStack(spacing: 12) {
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Self.ink.opacity(0.18))
                    Capsule().fill(Self.ink).frame(width: g.size.width * progress)
                }
            }
            .frame(height: 4)
            TimelineView(.periodic(from: shownAt, by: 1)) { ctx in
                let left = max(0, Int((Self.seconds - ctx.date.timeIntervalSince(shownAt)).rounded(.up)))
                Text("\(left) S").font(Typo.mono(10, .semibold)).tracking(1.4).frame(width: 28, alignment: .trailing)
            }
        }
        .accessibilityHidden(true)
    }
}

extension WarningCard.Icon {
    /// Asset names in Assets.xcassets — "ikon-frysrisk" predates the design's "frys".
    var assetName: String { self == .frys ? "frysrisk" : rawValue }
}
