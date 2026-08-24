// Pure JVM module — the Kotlin twin of /engine/src (TypeScript). No Android deps.
// Correctness contract: src/test VectorTest replays ../../engine/vectors/*.json and
// the real Skåne fixture; output must equal the frozen TS logs field-for-field.
plugins { id("org.jetbrains.kotlin.jvm") }
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
dependencies {
    testImplementation(kotlin("test"))
    testImplementation("org.json:json:20240303")
}
tasks.test { useJUnitPlatform(); testLogging { events("failed"); showStackTraces = true } }
