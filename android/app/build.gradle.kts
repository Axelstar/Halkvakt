plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "se.halkvakt.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "se.halkvakt.app"
        minSdk = 26; targetSdk = 35
        // Femma åtta (4), DECISIONS #377: i takt med iOS FÖRE första Play-uppladdningen, som låser versionCode-spåret.
        versionCode = 17; versionName = "0.3.9"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
    buildFeatures { compose = true }
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
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
