plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "se.halkvakt.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "se.halkvakt.app"
        minSdk = 26; targetSdk = 34
        versionCode = 1; versionName = "0.1.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation(project(":engine"))
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
