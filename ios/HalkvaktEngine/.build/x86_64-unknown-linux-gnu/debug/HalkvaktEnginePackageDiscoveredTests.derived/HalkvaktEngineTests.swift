import XCTest
@testable import HalkvaktEngineTests

fileprivate extension VectorTests {
    @available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
    static nonisolated(unsafe) let __allTests__VectorTests = [
        ("testAllSharedVectorsIdentical", testAllSharedVectorsIdentical),
        ("testDeterminism", testDeterminism),
        ("testRealSkaneFixtureIdentical", testRealSkaneFixtureIdentical)
    ]
}
@available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
func __HalkvaktEngineTests__allTests() -> [XCTestCaseEntry] {
    return [
        testCase(VectorTests.__allTests__VectorTests)
    ]
}