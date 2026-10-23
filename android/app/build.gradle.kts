plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "se.halkvakt.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "se.halkvakt.app"
        minSdk = 26; targetSdk = 36
        // Femma åtta (4), DECISIONS #377: i takt med iOS FÖRE första Play-uppladdningen, som låser versionCode-spåret.
        versionCode = 32; versionName = "0.3.13"   // 19/10: påverkan i rapporten, rösten släpper musiken, statusfältet (DECISIONS #643), i takt med iOS 0.3.13 (32)
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        // Betatestet bara i testbyggen (Bengt 22/10, DECISIONS #681): Android kan inte se ett testspår i Google Play, så
        // produktionens AAB byggs med -Phalkvakt.betatest=false och saknar då brytaren. Allt annat är ett testbygge.
        buildConfigField("boolean", "BETATEST_TILLATEN", (project.findProperty("halkvakt.betatest") ?: "true").toString())
    }
    sourceSets.getByName("androidTest") {
        // Replays the SAME frozen fixture as the TS and Kotlin JVM suites — one truth.
        assets.srcDir(rootProject.file("../engine/fixtures"))
        assets.srcDir(rootProject.file("../engine/vectors"))
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    signingConfigs {
        create("upload") {
            val ksPath = System.getenv("HV_KEYSTORE_PATH")
            if (ksPath != null) {
                storeFile = file(ksPath)
                storePassword = System.getenv("HV_KEYSTORE_PASS")
                keyAlias = "halkvakt"
                keyPassword = System.getenv("HV_KEYSTORE_PASS")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (System.getenv("HV_KEYSTORE_PATH") != null) signingConfig = signingConfigs.getByName("upload")
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }
}
dependencies {
    implementation(project(":engine"))
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")   // läsarkontraktet (#289): riktig org.json i JVM-testerna, som :engine
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
