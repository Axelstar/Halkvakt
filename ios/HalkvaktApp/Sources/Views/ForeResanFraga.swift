// Frågan om varningen före resan (DECISIONS #979): rubriken, ett exempel på notisen, vad som sparas och vem som ansvarar.
// Bara innehållet. Knapparna står hos den som visar det. Orden bor i Foreresanord.
import SwiftUI

struct ForeResanFraga: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(Foreresanord.rubrik).font(Typo.sans(30, .semibold)).tracking(-0.6).foregroundStyle(Brand.text)
                .accessibilityAddTraits(.isHeader)
            Text(Foreresanord.text).font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2).padding(.top, 12)
            MonoLabel(text: Foreresanord.exempelRubrik, size: 11).padding(.top, 20).padding(.bottom, 8)
            NotisExempel()
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Foreresanord.sparas, id: \.self) { rad in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "checkmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Brand.greenText)
                            .padding(.top, 3).accessibilityHidden(true)
                        Text(rad).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding(16)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.line, lineWidth: 1))
            .padding(.top, 14)
            if let intePaAn = Foreresanord.intePaAn {
                Text(intePaAn).font(Typo.sans(13)).foregroundStyle(Brand.dim).padding(.top, 12)
            }
            Text(Foreresanord.fot).font(Typo.sans(12)).lineSpacing(3).foregroundStyle(Brand.dim).padding(.top, 14)
            Link(destination: Foreresanord.policy) {
                Text(Foreresanord.policyLank).font(Typo.sans(12)).underline().foregroundStyle(Brand.text2)
                    .frame(minHeight: 44, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Notisen som den ser ut på låsskärmen: märket, appens namn, ett klockslag och texten.
private struct NotisExempel: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image("ikon-mark").renderingMode(.template).resizable().scaledToFit().frame(width: 18, height: 16)
                .foregroundStyle(Brand.yellow)
                .frame(width: 36, height: 36).background(Brand.bg, in: RoundedRectangle(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text("Halkvakt").font(Typo.sans(14, .semibold)).foregroundStyle(Brand.text)
                    Spacer()
                    Text("06.40").font(Typo.sans(14)).foregroundStyle(Brand.dim)
                }
                Text(Foreresanord.exempel).font(Typo.sans(14)).lineSpacing(2).foregroundStyle(Brand.text2)
            }
        }
        .padding(14)
        .background(Brand.raisedSolid, in: RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(Foreresanord.exempelRubrik): \(Foreresanord.exempel)")
    }
}
