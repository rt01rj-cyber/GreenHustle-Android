#!/usr/bin/env bash
set -euo pipefail
mkdir -p evidence
adb install -r out/HotBox-0.3.0.apk
adb install -r out/HotBox-0.3.0-tests.apk
adb logcat -c
adb shell am instrument -w uk.co.hotbox.afterhours.test/uk.co.hotbox.cardgame.HotBoxSmoke | tee evidence/native-smoke.txt
adb logcat -d > evidence/logcat.txt
adb shell am start -W -n uk.co.hotbox.afterhours/uk.co.hotbox.cardgame.MainActivity
sleep 3
adb exec-out screencap -p > evidence/android-launch.png
grep -q 'HOTBOX_SMOKE:PASS' evidence/native-smoke.txt
! grep -q 'HOTBOX_SMOKE:FAIL' evidence/native-smoke.txt
