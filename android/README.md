# Guardian Protocol Android

Native Kotlin/Jetpack Compose companion for the Guardian Protocol safety console.

## Local setup

Open this `android/` directory in Android Studio. The project uses the checked-in Gradle wrapper and the Android Studio bundled JDK. If Android Studio does not detect the SDK automatically, create the ignored `local.properties` file with the SDK path used by the local installation:

```properties
sdk.dir=C:\\androidstudio
```

Run the JVM checks from PowerShell:

```powershell
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:lintDebug
.\gradlew.bat :app:assembleDebug
```

Huawei Health Kit credentials and signing values are supplied through local Gradle properties when the Health Kit adapter is enabled. They must not be committed.

The Android client is only a telemetry and response client. Q0-Q4 timing, server timestamps, incidents, and contact cascades remain server-authoritative.
