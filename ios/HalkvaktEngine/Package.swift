// swift-tools-version:5.9
// Swift twin of /engine (TypeScript) and /android/engine (Kotlin).
// Pure module — no UIKit, no CoreLocation, no clocks. Proven identical via the
// shared vectors in ../../engine/vectors/ (VectorTests). iOS app wraps this later.
import PackageDescription

let package = Package(
    name: "HalkvaktEngine",
    products: [.library(name: "HalkvaktEngine", targets: ["HalkvaktEngine"])],
    targets: [
        .target(name: "HalkvaktEngine"),
        .testTarget(name: "HalkvaktEngineTests", dependencies: ["HalkvaktEngine"]),
    ]
)
