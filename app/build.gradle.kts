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
        versionCode = 2
        versionName = "0.1.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
