plugins {
    id("com.android.application")
}

android {
    namespace = "uk.co.greenhustle.cardgame"
    compileSdk = 35

    defaultConfig {
        applicationId = "uk.co.greenhustle.cardgame"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
