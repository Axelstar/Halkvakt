plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "se.halkvakt.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "se.halkvakt.app"
        minSdk = 26; targetSdk = 34
        versionCode = 1; versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    sourceSets.getByName("androidTest") {
        // Replays the SAME frozen fixture as the TS and Kotlin JVM suites — one truth.
        assets.srcDir(rootProject.file("../engine/fixtures"))
        assets.srcDir(rootProject.file("../engine/vectors"))
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation(project(":engine"))
    implementation("com.google.android.gms:play-services-location:21.3.0")
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
