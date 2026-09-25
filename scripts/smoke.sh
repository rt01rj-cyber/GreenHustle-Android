#!/usr/bin/env bash
set -euo pipefail
mkdir -p evidence
adb install -r out/HotBox-0.3.0.apk
adb install -r out/HotBox-0.3.0-tests.apk
adb logcat -c
adb shell am instrument -w uk.co.hotbox.afterhours.test/uk.co.hotbox.cardgame.HotBoxSmoke | tee evidence/native-smoke.txt
adb logcat -d > evidence/logcat.txt
grep -q 'HOTBOX_SMOKE:PASS' evidence/native-smoke.txt
! grep -q 'HOTBOX_SMOKE:FAIL' evidence/native-smoke.txt
# Verify a normal cold start separately from the instrumentation process.
adb shell input keyevent 224
adb shell wm dismiss-keyguard || true
adb shell am force-stop uk.co.hotbox.afterhours
adb logcat -c
adb shell am start -W -n uk.co.hotbox.afterhours/uk.co.hotbox.cardgame.MainActivity
ready=0
for attempt in $(seq 1 45); do
  adb logcat -d > evidence/cold-start-logcat.txt
  if grep -q 'HOTBOX_WEB_READY' evidence/cold-start-logcat.txt; then ready=1; break; fi
  sleep 1
done
if [ "$ready" != 1 ]; then echo 'Cold launch never reached game readiness'; exit 1; fi
# Allow software GPU composition to settle before taking evidence.
sleep 10
adb exec-out screencap -p > evidence/android-launch.png
printf 'HOTBOX_COLD_PAGE_READY:PASS\n' > evidence/cold-start-result.txt
# Accessibility metadata is supplementary. Some headless emulator images return
# a null UiTestAutomationBridge root even with a visible, functional WebView.
# The native test above and the captured frames remain independent evidence.
for attempt in 1 2 3; do
  adb shell uiautomator dump /sdcard/hotbox-window.xml || true
  if adb pull /sdcard/hotbox-window.xml evidence/cold-menu.xml; then break; fi
  sleep 2
done
adb exec-out screencap -p > evidence/android-launch-settled.png
python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
import re
xml=Path('evidence/cold-menu.xml')
if not xml.exists():
    print('Accessibility root unavailable; review cold-start PNGs alongside native test results.')
    raise SystemExit(0)
root=ET.parse(xml).getroot()
texts=' '.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in root.iter('node'))
Path('evidence/accessibility-text.txt').write_text(texts)
for n in root.iter('node'):
    label=n.attrib.get('text','')+' '+n.attrib.get('content-desc','')
    if 'Continue Riz' not in label: continue
    box=list(map(int,re.findall(r'\d+',n.attrib.get('bounds',''))))
    if len(box)==4 and box[2]>box[0] and box[3]>box[1]:
        Path('evidence/resume-tap.txt').write_text('%d %d\n' % ((box[0]+box[2])//2,(box[1]+box[3])//2))
        break
PY
if [ -f evidence/resume-tap.txt ]; then
  read -r tap_x tap_y < evidence/resume-tap.txt
  adb shell input tap "$tap_x" "$tap_y"
  sleep 5
  adb exec-out screencap -p > evidence/android-story-table.png
fi
adb logcat -d > evidence/cold-start-logcat.txt
