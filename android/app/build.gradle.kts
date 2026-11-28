plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "se.halkvakt.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "se.halkvakt.app"
        minSdk = 26; targetSdk = 36
        // Femma åtta (4), DECISIONS #377: i takt med iOS FÖRE första Play-uppladdningen, som låser versionCode-spåret.
        versionCode = 81; versionName = "0.4.3"   // 28/11: i takt med iOS 0.4.3 (81), TestFlight-bygget med nya introduktionen, Resor och startsidan
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        // Betatestet bara i testbyggen (Bengt 22/10, DECISIONS #681): Android kan inte se ett testspår i Google Play, så
        // produktionens AAB byggs med -Phalkvakt.betatest=false och saknar då brytaren. Allt annat är ett testbygge.
        buildConfigField("boolean", "BETATEST_TILLATEN", (project.findProperty("halkvakt.betatest") ?: "true").toString())
        // Google Maps-nyckeln (DECISIONS #941): läses ur hemligheten GOOGLE_MAPS_KEY vid bygget och står aldrig i repot. Den är
        // låst i Google Cloud till appens paket, signeringsnycklarna och tre tjänster. Utan hemligheten byggs appen med en tom
        // nyckel, och Planera resa får då inga svar.
        buildConfigField("String", "GOOGLE_MAPS_KEY", "\"${System.getenv("GOOGLE_MAPS_KEY") ?: ""}\"")
        manifestPlaceholders["GOOGLE_MAPS_KEY"] = System.getenv("GOOGLE_MAPS_KEY") ?: ""   // kartan läser den ur manifestet
    }
    // Orterna och kommunerna (Sverigedata.kt) läggs i appen ur data/, så att det finns en kopia.
    sourceSets.getByName("main") {
        assets.srcDir(rootProject.file("../data/sverige"))
        assets.srcDir(rootProject.file("../data/kommuner"))
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
    implementation("com.google.android.gms:play-services-maps:19.0.0")   // kartan på Planerad resa (kort #659, DECISIONS #941)
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
