plugins { id("com.android.application") }
android {
    namespace = "uk.co.hotbox.cardgame"
    compileSdk = 35
    defaultConfig {
        applicationId = "uk.co.hotbox.cardgame"
        minSdk = 26
        targetSdk = 35
        versionCode = 20
        versionName = "0.2.0"
        testInstrumentationRunner = "uk.co.hotbox.cardgame.HotBoxSmoke"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildTypes { release { isMinifyEnabled = false } }
}
