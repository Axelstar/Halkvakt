// RESANS RAPPORT (favoriterna steg 3a, kort #357; DECISIONS #636, #637) — spegel av favoritRapport, grupperade, tomma, nyttSedan och
// visning i publish/rapport-core.ts och resansRapport, riktning och vand i publish/rapport-app.ts, prövad mot engine/fixtures/rapport.json
// i alla tre språk (scripts/rapport-facit.ts). Avstånden per slag är provmiljöns tal, appens trösklar sedan #637; talen står i
// kontraktsgrinden. Ren logik: appen hämtar filerna, den här typen läser dem och räknar i telefonen. Ingen fråga om förarens väg lämnar den.
import Foundation

public enum RapportSlag: String, CaseIterable {
    case frysrisk, halka, olycka, hinder, vilt, ko, restid, vagarbete, hastighet, omledning, farja, kamera, smhi
}

/// En post i rapportfilens snabba del (schema 2). `p` en punkt [lon, lat], `l` id för en linje i den långsamma delen.
public struct RapportPost {
    public let id: String, slag: RapportSlag, rubrik: String
    public let t: String?, p: [Double]?, l: String?, vag: String?, start: String?, slut: String?
    public let korfalt: Int?, grans: Int?, tid: Int?, normal: Int?, text: String?
    public var sev: Int? = nil   // Trafikverkets påverkan (SeverityCode)
}

/// Rapportfilens snabba del: posterna och stationernas namn och lufttemperatur.
public struct Rapportfil {
    public let generatedAt: String
    public let poster: [RapportPost]
    public let stationer: [String: (namn: String, luft: Double?)]
}

/// Lägesfilens fält som rapporten läser — fler än motorns läsare tar ut (vägen på sträckorna, broarna, SMHI:s områden).
public struct RapportLage {
    public struct Strecka { public let id: String; public let line: [[Double]]; public let info: [String]; public let road: String? }
    public struct Station { public let id: String; public let lon: Double, lat: Double; public let yta: Double?; public let fukt: Bool
        public let regnH: Double?, lutning30: Double? }
    public struct Bro { public let id: String; public let lon: Double, lat: Double; public let road: String?; public let yta: Double?
        public let fukt: Bool }
    public struct Smhi { public let id: String; public let event: String?; public let niva: String?; public let polygoner: [[[[Double]]]] }
    public let segments: [Strecka], weather: [Station], bridges: [Bro], smhi: [Smhi]
}

public struct RapportKamera { public let id: String; public let lon: Double, lat: Double; public let road: String? }

public struct RapportRad: Equatable {
    public let id: String, slag: RapportSlag, rubrik: String, text: String
    public let avstandM: Int, langsM: Int
    public let vag: String?, start: String?
}

public struct RapportGrupp: Equatable {
    public let id: String, slag: RapportSlag, rubrik: String, text: String
    public let antal: Int, ids: [String], langsM: Int
}

public enum ResansRapport {
    /// Favoritsidans viktordning (FAVORITER §3): halka och frysrisk först, SMHI sist.
    public static let ordning: [RapportSlag] = [.halka, .frysrisk, .olycka, .hinder, .vilt, .ko, .restid, .vagarbete, .hastighet,
                                                .omledning, .farja, .kamera, .smhi]
    /// Avståndet till resan per slag, i meter — provmiljöns tal, appens trösklar (DECISIONS #637).
    public static let marginaler: [RapportSlag: Double] = [.halka: 100, .frysrisk: 500, .olycka: 150, .hinder: 150, .vilt: 150,
        .ko: 100, .restid: 100, .vagarbete: 100, .hastighet: 100, .omledning: 100, .farja: 500, .kamera: 100, .smhi: 0]
    /// En linje ligger längs resan först när minst langsAndel av den, eller langsMinstM, ligger inom avståndet.
    public static let langsAndel = 0.5
    public static let langsMinstM = 500.0
    public static let langsStegM = 100.0
    public static let gruppFran = 3
    /// Slagens namn på raden om det tomma (rapport-core.ts RUBRIK): "Inget rapporterat: halt väglag på sträckorna, vilt …".
    public static let namn: [RapportSlag: String] = [.halka: "halt väglag på sträckorna", .frysrisk: "frysrisk vid stationerna",
        .olycka: "olyckor", .hinder: "hinder", .vilt: "vilt", .ko: "köer", .restid: "restider", .vagarbete: "vägarbeten",
        .hastighet: "hastighet", .omledning: "omledningar", .farja: "färjor", .kamera: "fartkameror", .smhi: "SMHI-varningar"]
    public static let rutaGrad = 0.05
    static let efterhalka = EngineConfig()

    // MARK: - Läsarna

    private static func dbl(_ o: [String: Any], _ k: String) -> Double? { (o[k] as? NSNumber)?.doubleValue }
    private static func str(_ o: [String: Any], _ k: String) -> String? { o[k] as? String }
    private static func int(_ o: [String: Any], _ k: String) -> Int? { (o[k] as? NSNumber).map { Int(truncating: $0) } }
    private static func punkter(_ a: Any?) -> [[Double]] {
        ((a as? [[Any]]) ?? []).compactMap { p in
            guard p.count >= 2, let x = p[0] as? NSNumber, let y = p[1] as? NSNumber else { return nil }
            return [x.doubleValue, y.doubleValue]
        }
    }

    public static func lasRapportfil(_ o: [String: Any]) -> Rapportfil? {
        guard let poster = o["poster"] as? [[String: Any]] else { return nil }
        var st: [String: (namn: String, luft: Double?)] = [:]
        for (k, v) in (o["stationer"] as? [String: [String: Any]]) ?? [:] { st[k] = (str(v, "namn") ?? "", dbl(v, "luft")) }
        return Rapportfil(generatedAt: str(o, "generated_at") ?? "", poster: poster.compactMap { p in
            guard let id = str(p, "id"), let slag = str(p, "slag").flatMap(RapportSlag.init(rawValue:)) else { return nil }
            let pp = punkter([p["p"] as Any]).first
            return RapportPost(id: id, slag: slag, rubrik: str(p, "rubrik") ?? "", t: str(p, "t"), p: p["p"] == nil ? nil : pp,
                               l: str(p, "l"), vag: str(p, "vag"), start: str(p, "start"), slut: str(p, "slut"), korfalt: int(p, "korfalt"),
                               grans: int(p, "grans"), tid: int(p, "tid"), normal: int(p, "normal"), text: str(p, "text"),
                               sev: int(p, "sev"))
        }, stationer: st)
    }

    public static func lasLinjer(_ o: [String: Any]) -> [String: [[[Double]]]] {
        var ut: [String: [[[Double]]]] = [:]
        for (k, v) in (o["linjer"] as? [String: Any]) ?? [:] { ut[k] = ((v as? [Any]) ?? []).map { punkter($0) } }
        return ut
    }

    /// Läget utan efterhalkans regnfält (DECISIONS #676, #677): `regnH` töms i varje station, så att S3 inte räknas fram i rapporten för
    /// den som inte slagit på Betatest. Frysrisken på yta och fukt, och allt annat, är orört. Spegel av SnapshotReader.utanEfterhalka.
    public static func utanEfterhalka(_ l: RapportLage) -> RapportLage {
        RapportLage(segments: l.segments, weather: l.weather.map {
            RapportLage.Station(id: $0.id, lon: $0.lon, lat: $0.lat, yta: $0.yta, fukt: $0.fukt, regnH: nil, lutning30: $0.lutning30)
        }, bridges: l.bridges, smhi: l.smhi)
    }

    public static func lasLage(_ o: [String: Any]) -> RapportLage {
        let arr = { (k: String) in (o[k] as? [[String: Any]]) ?? [] }
        let smhi: [RapportLage.Smhi] = arr("smhi").map { w in
            let g = w["geom"] as? [String: Any]
            let c = g?["coordinates"]
            let polys: [[[[Double]]]] = str(g ?? [:], "type") == "Polygon" ? [((c as? [Any]) ?? []).map { punkter($0) }]
                : str(g ?? [:], "type") == "MultiPolygon" ? ((c as? [Any]) ?? []).map { (($0 as? [Any]) ?? []).map { punkter($0) } } : []
            let niva = w["niva"].map { v -> String in (v as? NSNumber).map { "\($0)" } ?? "\(v)" }
            return RapportLage.Smhi(id: "\(w["id"] ?? "")", event: str(w, "event"), niva: w["niva"] is NSNull ? nil : niva, polygoner: polys)
        }
        return RapportLage(
            segments: arr("segments").map { RapportLage.Strecka(id: "\($0["id"] ?? "")", line: punkter($0["line"]), info: ($0["info"] as? [String]) ?? [],
                                                  road: str($0, "road")) },
            weather: arr("weather").compactMap { w in
                guard let lon = dbl(w, "lon"), let lat = dbl(w, "lat") else { return nil }
                return RapportLage.Station(id: "\(w["id"] ?? "")", lon: lon, lat: lat, yta: dbl(w, "yta"), fukt: (w["fukt"] as? Bool) ?? false,
                             regnH: dbl(w, "regn_h"), lutning30: dbl(w, "lutning30"))
            },
            bridges: arr("bridges").compactMap { b in
                guard let lon = dbl(b, "lon"), let lat = dbl(b, "lat") else { return nil }
                return RapportLage.Bro(id: "\(b["id"] ?? "")", lon: lon, lat: lat, road: str(b, "road"), yta: dbl(b, "yta"), fukt: (b["fukt"] as? Bool) ?? false)
            },
            smhi: smhi)
    }

    public static func lasKameror(_ o: [String: Any]) -> [RapportKamera] {
        ((o["cameras"] as? [[String: Any]]) ?? []).compactMap { c in
            guard let lon = dbl(c, "lon"), let lat = dbl(c, "lat") else { return nil }
            return RapportKamera(id: "\(c["id"] ?? "")", lon: lon, lat: lat, road: str(c, "road"))
        }
    }

    // MARK: - Texterna

    private static let stockholm = TimeZone(identifier: "Europe/Stockholm")!
    private static let sv = Locale(identifier: "sv_SE")
    private static func tid(_ iso: String?) -> Date? {
        guard let iso else { return nil }
        let f = ISO8601DateFormatter()
        if let d = f.date(from: iso) { return d }
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso)
    }
    private static func klocka(_ iso: String?) -> String? {
        guard let d = tid(iso) else { return nil }
        let f = DateFormatter(); f.locale = sv; f.timeZone = stockholm; f.dateFormat = "HH:mm"
        return f.string(from: d)
    }
    private static func datum(_ iso: String?) -> String? {
        guard let d = tid(iso) else { return nil }
        let f = DateFormatter(); f.locale = sv; f.timeZone = stockholm; f.dateFormat = "d MMMM"
        return f.string(from: d)
    }

    /// Trafikverkets påverkan (SeverityCode) i texten för vägarbeten, olyckor och hinder (rapport-core.ts PAVERKAN, DECISIONS #641).
    public static let paverkanText: [Int: String] = [1: "ingen påverkan", 2: "liten påverkan", 4: "stor påverkan", 5: "mycket stor påverkan"]

    /// Den läsbara texten för en post, ur fälten — som rapport-core.ts visning().
    public static func visning(_ p: RapportPost) -> String {
        if let text = p.text, !text.isEmpty { return text }
        if p.slag == .restid || (p.slag == .ko && p.id.hasPrefix("tt:")) {
            return p.tid.map { "\($0) minuter, normalt \(p.normal.map(String.init) ?? "–")" } ?? "restid saknas"
        }
        let slut = p.slut == "tv" ? "tills vidare" : (p.slut ?? "").isEmpty ? "" : "till \(datum(p.slut! + "T12:00:00Z") ?? "null")"
        let paverkan = p.sev.flatMap { paverkanText[$0] }.map { [.vagarbete, .olycka, .hinder].contains(p.slag) ? "\($0) enligt Trafikverket" : "" } ?? ""
        let delar = [p.t ?? "", (p.korfalt ?? 0) != 0 ? "\(p.korfalt!) körfält avstängda" : "",
                     (p.grans ?? 0) != 0 ? "\(p.grans!) km/h förbi vägarbetet" : "", paverkan, slut,
                     [.olycka, .hinder, .ko].contains(p.slag) ? "rapporterad \(klocka(p.start) ?? "–")" : ""]
        return delar.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private static func traff(_ re: String, _ s: String) -> String? {
        guard let r = try? NSRegularExpression(pattern: re, options: [.caseInsensitive]),
              let m = r.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)), let g = Range(m.range(at: 1), in: s) else { return nil }
        return String(s[g])
    }

    /// Vägnamnen skrivna lika: E-vägar som "E22", övriga som "väg 17". Inget namn blir nil.
    public static func vagNamn(_ v: String?) -> String? {
        let s = (v ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return nil }
        if let e = traff("^e\\s*(\\d+)$", s) { return "E\(e)" }
        if let n = traff("^(?:väg|rv|riksväg|länsväg)?\\s*(\\d+)$", s) { return "väg \(n)" }
        return String(s.prefix(20))
    }

    private static func grader(_ v: Double?) -> String {
        guard let v else { return "–" }
        let tecken = v > 0 ? "+" : v < 0 ? "−" : ""
        return "\(tecken)\(String(format: "%.1f", abs(v)).replacingOccurrences(of: ".", with: ",")) °C"
    }

    // MARK: - Geometrin

    private static func iRing(_ x: Double, _ y: Double, _ ring: [[Double]]) -> Bool {
        var inne = false
        var j = ring.count - 1
        for i in 0..<ring.count {
            let xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
            if (yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi { inne.toggle() }
            j = i
        }
        return inne
    }

    private static func polygonTraffar(_ polys: [[[[Double]]]], _ rutt: [[Double]]) -> Bool {
        guard rutt.count >= 2 else { return false }
        for i in 0..<(rutt.count - 1) {
            let ax = rutt[i][0], ay = rutt[i][1], bx = rutt[i + 1][0], by = rutt[i + 1][1]
            let n = max(1, Int((hypot(bx - ax, by - ay) / 0.02).rounded(.up)))
            for k in 0...n {
                let x = ax + (bx - ax) * Double(k) / Double(n), y = ay + (by - ay) * Double(k) / Double(n)
                if polys.contains(where: { poly in
                    guard let yttre = poly.first else { return false }
                    return iRing(x, y, yttre) && !poly.dropFirst().contains(where: { iRing(x, y, $0) })
                }) { return true }
            }
        }
        return false
    }

    /// Rutnätet längs resan (rapport-core.ts rutnat): för en kandidat det första och sista sträckindexet som når dess rutor, eller nil.
    private static func rutnat(_ rutt: [[Double]], _ marginM: Double) -> ([Hazard]) -> (Int, Int)? {
        var rutor: [String: [Int]] = [:]
        let nord = rutt.map { abs($0[1]) }.max() ?? 0
        let dy = marginM / 110_000, dx = marginM / (111_320 * cos(nord * Double.pi / 180))
        let cell = { (v: Double) in Int((v / rutaGrad).rounded(.down)) }
        if rutt.count >= 2 {
            for i in 0..<(rutt.count - 1) {
                let ax = rutt[i][0], ay = rutt[i][1], bx = rutt[i + 1][0], by = rutt[i + 1][1]
                for cx in cell(min(ax, bx) - dx)...cell(max(ax, bx) + dx) {
                    for cy in cell(min(ay, by) - dy)...cell(max(ay, by) + dy) { rutor["\(cx),\(cy)", default: []].append(i) }
                }
            }
        }
        return { geo in
            var i0 = Int.max, i1 = Int.min
            for h in geo {
                let ps: [[Double]]
                switch h {
                case .segment(_, let line, _): ps = line
                case .point(_, _, let lon, let lat, _, _): ps = [[lon, lat]]
                case .kandidat: ps = []
                }
                guard !ps.isEmpty else { continue }
                let x0 = ps.map { $0[0] }.min()!, x1 = ps.map { $0[0] }.max()!, y0 = ps.map { $0[1] }.min()!, y1 = ps.map { $0[1] }.max()!
                for cx in cell(x0)...cell(x1) { for cy in cell(y0)...cell(y1) {
                    for s in rutor["\(cx),\(cy)"] ?? [] { i0 = min(i0, s); i1 = max(i1, s) }
                } }
            }
            return i0 == Int.max ? nil : (i0, i1)
        }
    }

    private static func provpunkter(_ line: [[Double]], _ id: (Int) -> String, start: Int = 0) -> [Hazard] {
        Geo.samplePolyline(line, langsStegM).enumerated().map { i, q in
            .point(id: id(start + i), kind: .accident, lon: q[0], lat: q[1], bearing: nil, meta: PointMeta())
        }
    }

    /// Ligger linjen längs resan och inte bara tvärs över den?
    private static func langsVagen(_ geo: [Hazard], _ rutt: [[Double]], _ marginalM: Double) -> Bool {
        var prov: [Hazard] = []
        for h in geo { if case .segment(_, let line, _) = h { prov += provpunkter(line, { "s\($0)" }, start: prov.count) } }
        if prov.isEmpty { return true }
        let inom = Double(RouteFilter.alongRoute(prov, rutt, marginM: marginalM).count)
        return inom / Double(prov.count) >= langsAndel || inom * langsStegM >= langsMinstM
    }

    // MARK: - Rapporten

    private struct Kandidat { let id: String; let slag: RapportSlag; let rubrik: String; let text: String; let geo: [Hazard]
        let vag: String?; let start: String?; let post: RapportPost? }

    private static func sorterad<T>(_ a: [T], slag: (T) -> RapportSlag, langs: (T) -> Int, id: (T) -> String) -> [T] {
        a.enumerated().sorted { x, y in
            let ox = ordning.firstIndex(of: slag(x.element))!, oy = ordning.firstIndex(of: slag(y.element))!
            if ox != oy { return ox < oy }
            if langs(x.element) != langs(y.element) { return langs(x.element) < langs(y.element) }
            if id(x.element) != id(y.element) { return id(x.element) < id(y.element) }
            return x.offset < y.offset
        }.map(\.element)
    }

    /// Det fliken visar för resan: rader i viktordning, inom slagets ordning i körordning (rapport-core.ts favoritRapport).
    public static func favoritRapport(_ rutt: [[Double]], lage: RapportLage, kameror: [RapportKamera], snabb: Rapportfil,
                                      linjer: [String: [[[Double]]]], marginal: [RapportSlag: Double] = marginaler) -> [RapportRad] {
        let pkt = { (id: String, lon: Double, lat: Double) -> [Hazard] in
            [.point(id: id, kind: .accident, lon: lon, lat: lat, bearing: nil, meta: PointMeta())] }
        let lin = { (id: String, delar: [[[Double]]]) -> [Hazard] in
            delar.filter { $0.count >= 2 }.enumerated().map { i, line in .segment(id: "\(id)#\(i)", line: line, meta: SegmentMeta()) } }
        let st = snabb.stationer
        var kand: [Kandidat] = []
        for s in lage.segments {
            let v = vagNamn(s.road)
            kand.append(Kandidat(id: "seg:\(s.id)", slag: .halka, rubrik: "Halt väglag\(v.map { " på \($0)" } ?? "")",
                                 text: s.info.isEmpty ? "halka rapporterad på sträckan" : s.info.joined(separator: ", "),
                                 geo: lin("seg:\(s.id)", [s.line]), vag: v, start: nil, post: nil))
        }
        for w in lage.weather {
            let frys = w.yta.map { $0 <= 1 } == true && w.fukt
            var beta = false
            if !frys, let t = w.yta, let r = w.regnH, let l = w.lutning30 {
                beta = t >= efterhalka.efterhalkaYtaMinC && t <= efterhalka.efterhalkaYtaMaxC && l >= efterhalka.efterhalkaFall30C
                    && r <= efterhalka.efterhalkaRegnH
            }
            if !frys && !beta { continue }
            let namn = st[w.id]?.namn
            kand.append(Kandidat(id: "wx:\(w.id)", slag: .frysrisk,
                                 rubrik: "Frysrisk vid stationen\(namn.map { " i \($0)" } ?? "")\(beta ? " (beta)" : "")",
                                 text: "Vägytan \(grader(w.yta)), luften \(grader(st[w.id]?.luft ?? nil))\(w.fukt ? ", fukt på vägbanan" : "")\(beta ? ", efter regnet" : "")",
                                 geo: pkt("wx:\(w.id)", w.lon, w.lat), vag: nil, start: nil, post: nil))
        }
        for b in lage.bridges where b.yta.map({ $0 <= 3 }) == true && b.fukt {
            kand.append(Kandidat(id: "bro:\(b.id)", slag: .frysrisk, rubrik: "Frysrisk på bron\(vagNamn(b.road).map { " på \($0)" } ?? "")",
                                 text: "närmaste station \(grader(b.yta))", geo: pkt("bro:\(b.id)", b.lon, b.lat), vag: b.road, start: nil, post: nil))
        }
        for c in kameror {
            kand.append(Kandidat(id: "cam:\(c.id)", slag: .kamera, rubrik: "Fartkamera", text: vagNamn(c.road) ?? "",
                                 geo: pkt("cam:\(c.id)", c.lon, c.lat), vag: vagNamn(c.road), start: nil, post: nil))
        }
        for p in snabb.poster {
            let geo = p.l != nil ? lin(p.id, linjer[p.l!] ?? []) : p.p.map { pkt(p.id, $0[0], $0[1]) } ?? []
            if !geo.isEmpty { kand.append(Kandidat(id: p.id, slag: p.slag, rubrik: p.rubrik, text: "", geo: geo, vag: p.vag, start: p.start, post: p)) }
        }
        let skar = rutnat(rutt, (marginal.values.max() ?? 0) + 200)
        var kum = [0.0]
        for i in stride(from: 1, to: rutt.count, by: 1) { kum.append(kum[i - 1] + Geo.haversineM(rutt[i - 1][0], rutt[i - 1][1], rutt[i][0], rutt[i][1])) }
        var rader: [RapportRad] = []
        for k in kand {
            guard let nara = skar(k.geo) else { continue }
            let bit = Array(rutt[nara.0..<min(nara.1 + 2, rutt.count)]), fore = kum[nara.0]
            let m = marginal[k.slag] ?? 0
            guard let t = RouteFilter.alongRoute(k.geo, bit, marginM: m).min(by: { $0.distanceM < $1.distanceM }) else { continue }
            if case .segment = k.geo[0], !langsVagen(k.geo, bit, m) { continue }
            rader.append(RapportRad(id: k.id, slag: k.slag, rubrik: k.rubrik, text: k.post.map(visning) ?? k.text,
                                    avstandM: Int(t.distanceM.rounded()), langsM: Int((fore + t.alongM).rounded()), vag: k.vag, start: k.start))
        }
        for w in lage.smhi where polygonTraffar(w.polygoner, rutt) {
            rader.append(RapportRad(id: "smhi:\(w.id):\(w.event ?? "undefined")", slag: .smhi, rubrik: "SMHI: \(w.event ?? "varning")",
                                    text: "nivå \(w.niva ?? "–")", avstandM: 0, langsM: 0, vag: nil, start: nil))
        }
        return sorterad(rader, slag: \.slag, langs: \.langsM, id: \.id)
    }

    /// Hem: samma väg åt andra hållet.
    public static func vand(_ rutt: [[Double]]) -> [[Double]] { Array(rutt.reversed()) }

    /// Går linjen åt samma håll som resan? 1 samma, −1 motsatt, 0 går inte att avgöra (rapport-app.ts riktning; DECISIONS #637).
    public static func riktning(_ delar: [[[Double]]], _ rutt: [[Double]], marginalM: Double) -> Int {
        var summa = 0.0
        for del in delar {
            let prov = provpunkter(del, { "p\($0)" })
            var langs: [String: Double] = [:]
            for t in RouteFilter.alongRoute(prov, rutt, marginM: marginalM) { langs[t.hazard.id] = t.alongM }
            var fore: Double? = nil
            for i in 0..<prov.count {
                guard let l = langs["p\(i)"] else { continue }
                if let f = fore { summa += l - f }
                fore = l
            }
        }
        return summa > 0 ? 1 : summa < 0 ? -1 : 0
    }

    /// Det appen visar för en sparad resa, eller den vända för Hem, med köer och restider bara åt förarens håll (rapport-app.ts).
    public static func resansRapport(_ rutt: [[Double]], hem: Bool, lage: RapportLage, kameror: [RapportKamera], snabb: Rapportfil,
                                     linjer: [String: [[[Double]]]]) -> [RapportRad] {
        let r = hem ? vand(rutt) : rutt
        var linjeFor: [String: [[[Double]]]] = [:]
        for p in snabb.poster { if let l = p.l { linjeFor[p.id] = linjer[l] ?? [] } }
        return favoritRapport(r, lage: lage, kameror: kameror, snabb: snabb, linjer: linjer).filter { rad in
            !rad.id.hasPrefix("tt:") || riktning(linjeFor[rad.id] ?? [], r, marginalM: marginaler[rad.slag] ?? 0) != -1
        }
    }

    /// Det som är nytt sedan förra kollen: id som inte fanns då. Första kollen har inget nytt.
    public static func nyttSedan(_ fore: [RapportRad]?, _ nu: [RapportRad]) -> [String] {
        guard let fore else { return [] }
        let fanns = Set(fore.map(\.id))
        return nu.filter { !fanns.contains($0.id) }.map(\.id)
    }

    /// Det tomma på en rad: slagen utan något, i viktordning; köerna mäts bara där en restidssträcka går längs resan.
    public static func tomma(_ rader: [RapportRad]) -> (inget: [RapportSlag], koerMatsInte: Bool) {
        let finns = Set(rader.map(\.slag))
        return (ordning.filter { !finns.contains($0) && $0 != .restid }, !rader.contains { $0.id.hasPrefix("tt:") })
    }

    private static let enskild: Set<RapportSlag> = [.halka, .frysrisk, .olycka, .hinder, .vilt, .ko, .farja, .smhi]
    private static let ord: [RapportSlag: (String, String)] = [.kamera: ("fartkamera", "fartkameror"), .vagarbete: ("vägarbete", "vägarbeten"),
        .hastighet: ("hastighetsbegränsning", "hastighetsbegränsningar"), .omledning: ("omledning", "omledningar"),
        .restid: ("restidssträcka", "restidssträckor")]
    private static let tal = ["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"]
    private static func kmText(_ m: Double) -> String { "\(Int((m / 1000).rounded())) km" }

    /// Raderna sammanslagna för skärmen (rapport-core.ts grupperade).
    public static func grupperade(_ rader: [RapportRad]) -> [RapportGrupp] {
        var ut: [RapportGrupp] = []
        var nycklar: [String] = []
        var hinkar: [String: [RapportRad]] = [:]
        for r in rader {
            if enskild.contains(r.slag) {
                ut.append(RapportGrupp(id: r.id, slag: r.slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM)); continue
            }
            let nyckel = r.slag == .restid ? "restid" : "\(r.slag.rawValue)|\(r.vag ?? "")"
            if hinkar[nyckel] == nil { nycklar.append(nyckel) }
            hinkar[nyckel, default: []].append(r)
        }
        for nyckel in nycklar {
            var l = hinkar[nyckel]!
            let slag = l[0].slag, vag = l[0].vag
            if !(slag == .kamera || slag == .restid || l.count >= gruppFran) {
                for r in l { ut.append(RapportGrupp(id: r.id, slag: slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM)) }
                continue
            }
            let (en, flera) = ord[slag]!
            let n = l.count, t = n < tal.count ? tal[n] : "\(n)"
            let rubrik = "\(t.prefix(1).uppercased())\(t.dropFirst()) \(n == 1 ? en : flera)\(slag != .restid && !(vag ?? "").isEmpty ? " på \(vag!)" : "")"
            let fran = l.map(\.langsM).min()!, till = l.map(\.langsM).max()!
            let text: String
            if slag == .kamera { text = "Rösten säger till före varje kamera." }
            else if slag == .restid { text = "Normal trafik på sträckorna längs rutten." }
            else {
                l = l.enumerated().sorted { $0.element.langsM != $1.element.langsM ? $0.element.langsM < $1.element.langsM : $0.offset < $1.offset }.map(\.element)
                let narmast = l[0].text.isEmpty ? l[0].rubrik : l[0].text
                text = "\(n == 1 ? "" : "Mellan \(kmText(Double(fran))) och \(kmText(Double(till))) in på rutten. ")Närmast: \(narmast)"
            }
            ut.append(RapportGrupp(id: "grupp:\(nyckel)", slag: slag, rubrik: rubrik, text: text, antal: n, ids: l.map(\.id), langsM: fran))
        }
        return sorterad(ut, slag: \.slag, langs: \.langsM, id: \.id)
    }

    // MARK: - Fliken och rapportskärmen (steg 3b), som rapport-app.ts

    /// Det som inte är en händelse: fartkamerorna står fast, och en restidssträcka i normal trafik är bara en mätpunkt (en restid
    /// med fördröjning är slaget ko och räknas). De varken ger Nytt eller håller en resa från Lugnt.
    public static let inteHandelser: [RapportSlag] = [.kamera, .restid]

    /// Det som pågår längs resan åt något håll, utom det som inte är händelser. Dit först, sedan det som bara finns Hem.
    public static func pagar(_ dit: [RapportRad], _ hem: [RapportRad]) -> [RapportRad] {
        let d = Set(dit.map(\.id))
        return (dit + hem.filter { !d.contains($0.id) }).filter { !inteHandelser.contains($0.slag) }
    }

    public enum Radlage: Equatable {
        case nytt(antal: Int, viktigast: RapportRad)
        case ingetNytt(storst: RapportRad)
        case lugnt
    }

    /// Radens läge i fliken (FAVORITER §2): Nytt när något tillkommit sedan förra kollen (`sett`: dess id, nil före den första),
    /// annars Inget nytt med det största som pågår, annars Lugnt. Det viktigaste och det största är det första i viktordningen.
    public static func radlage(_ dit: [RapportRad], _ hem: [RapportRad], sett: [String]?) -> Radlage {
        let p = pagar(dit, hem)
        let vikt = { (r: RapportRad) in ordning.firstIndex(of: r.slag) ?? ordning.count }
        let forst = { (a: [RapportRad]) -> RapportRad? in
            var m: RapportRad?
            for r in a where m.map({ vikt(r) < vikt($0) }) ?? true { m = r }
            return m
        }
        if let sett {
            let s = Set(sett)
            let nya = p.filter { !s.contains($0.id) }
            if let v = forst(nya) { return .nytt(antal: nya.count, viktigast: v) }
        }
        if let st = forst(p) { return .ingetNytt(storst: st) }
        return .lugnt
    }

    /// Det nya åt det valda hållet sedan förra kollen, utom det som inte är händelser; före den första kollen finns inget nytt.
    public static func nyttSedanKollen(_ rader: [RapportRad], sett: [String]?) -> [RapportRad] {
        guard let sett else { return [] }
        let s = Set(sett)
        return rader.filter { !s.contains($0.id) && !inteHandelser.contains($0.slag) }
    }

    /// Alla id resan visar åt båda hållen, sorterade som i TypeScript (UTF-16) — det som sparas som förra kollen.
    public static func kollensIds(_ dit: [RapportRad], _ hem: [RapportRad]) -> [String] {
        Set((dit + hem).map(\.id)).sorted { $0.utf16.lexicographicallyPrecedes($1.utf16) }
    }

    /// Rubriken med vägen, när rubriken inte redan säger var: "Olycka på E4", men "Djur på vägen" som den står.
    public static func titel(_ rubrik: String, vag: String?) -> String {
        guard let v = vagNamn(vag), !rubrik.contains(" på ") else { return rubrik }
        return "\(rubrik) på \(v)"
    }

    /// Samma åldersgränser som rösten (appens AgeGate, FAVORITER §3): ur en gammal lägesfil visas varken väglag eller frysrisk, och ur
    /// en gammal rapportfil varken olyckor eller vilt, som läget just nu. Gränserna i minuter bor i AgeGate, inte här.
    public static let vaglagets: [RapportSlag] = [.halka, .frysrisk]
    public static let olyckornas: [RapportSlag] = [.olycka, .vilt]
    private static func dolt(_ s: RapportSlag, _ gammaltVaglag: Bool, _ gamlaOlyckor: Bool) -> Bool {
        (gammaltVaglag && vaglagets.contains(s)) || (gamlaOlyckor && olyckornas.contains(s))
    }

    public static func aldersgrind(_ rader: [RapportRad], gammaltVaglag: Bool, gamlaOlyckor: Bool) -> [RapportRad] {
        rader.filter { !dolt($0.slag, gammaltVaglag, gamlaOlyckor) }
    }

    /// Raden om det tomma (FAVORITER §3): "Inget rapporterat: vilt, färjor och SMHI-varningar. Köer mäts inte längs den här vägen."
    /// Slag som åldersgränsen dolt står inte med — där vet appen inte att det är tomt — och köerna inte heller när de inte mäts.
    public static func tomtRad(_ rader: [RapportRad], gammaltVaglag: Bool, gamlaOlyckor: Bool) -> String? {
        let t = tomma(rader)
        let n = t.inget.filter { !dolt($0, gammaltVaglag, gamlaOlyckor) && !(t.koerMatsInte && $0 == .ko) }.compactMap { namn[$0] }
        var ut = ""
        if let sista = n.last {
            ut = "Inget rapporterat: " + (n.count == 1 ? sista : n.dropLast().joined(separator: ", ") + " och " + sista) + "."
        }
        if t.koerMatsInte { ut += (ut.isEmpty ? "" : " ") + "Köer mäts inte längs den här vägen." }
        return ut.isEmpty ? nil : ut
    }
}
