from pathlib import Path
root=Path(__file__).resolve().parents[1]
w=root/'app/src/main/assets/www'
css='''
/* CYMRA_041_POSITION: cancel the old deadline badge offsets. */
@media(orientation:portrait),(min-height:481px){
.campaign-table .arena>.risk-meter{top:auto;right:auto;bottom:auto;left:auto;grid-row:2}
.campaign-table .arena>.piles{grid-row:2}
.campaign-table .arena>.current-turn{grid-row:1}
.campaign-table .arena>.action-banner{grid-row:3}
}
.campaign-table .empty-stash .stash-placeholder{min-height:22px}
.campaign-table .empty-stash .stash{min-height:22px}
'''
p=w/'cymra.css'
if 'CYMRA_041_POSITION' not in p.read_text():p.write_text(p.read_text()+css)
p=root/'tests/cymra.test.js';s=p.read_text()
s=s.replace("function take(s,id){let i=s.deck.findIndex(c=>c.id===id);assert(i>=0);return s.deck.splice(i,1)[0];}","function take(s,id){let pool=s.deck.some(c=>c.id===id)?s.deck:s.reserve||[];let i=pool.findIndex(c=>c.id===id);assert(i>=0);return pool.splice(i,1)[0];}")
p.write_text(s)
p=root/'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java';s=p.read_text()
old='            check("HotBoxUI.state().reserve.length>0 && HotBoxUI.state().initialDeck<60", "Shorter Story encounter deck");'
new=old+'\n            check("(function(){var a=document.querySelector(\'.risk-meter\').getBoundingClientRect(),b=document.querySelector(\'.action-banner\').getBoundingClientRect();return a.bottom<=b.top+1;})()", "Deadline does not overlap the action banner");'
if 'Deadline does not overlap' not in s:
    if old not in s:raise SystemExit('Missing native test insertion point')
    p.write_text(s.replace(old,new,1))
(root/'app/src/androidTest/java/uk/co/hotbox/cardgame/ColdMenuSmoke.java').write_bytes((root/'fix041/ColdMenuSmoke.java').read_bytes())
(root/'app/src/androidTest/AndroidManifest.xml').write_text('''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
<instrumentation android:name="uk.co.hotbox.cardgame.ColdMenuSmoke" android:targetPackage="uk.co.hotbox.cymra" />
</manifest>
''')
(root/'scripts/smoke.sh').write_text('''#!/usr/bin/env bash
set -euo pipefail
mkdir -p evidence
trap 'adb logcat -d > evidence/logcat.txt 2>&1 || true' EXIT
adb install -r out/HotBox-0.4.1.apk
adb install -r out/HotBox-0.4.1-tests.apk
adb logcat -c
adb shell am instrument -w uk.co.hotbox.cymra.test/uk.co.hotbox.cardgame.HotBoxSmoke | tee evidence/native-smoke.txt
grep -q 'HOTBOX_SMOKE:PASS' evidence/native-smoke.txt
! grep -q 'HOTBOX_SMOKE:FAIL' evidence/native-smoke.txt
adb shell am force-stop uk.co.hotbox.cymra
adb shell am instrument -w uk.co.hotbox.cymra.test/uk.co.hotbox.cardgame.ColdMenuSmoke | tee evidence/cold-visible-menu.txt
grep -q 'HOTBOX_COLD_VISIBLE_MENU:PASS' evidence/cold-visible-menu.txt
! grep -q 'HOTBOX_COLD_VISIBLE_MENU:FAIL' evidence/cold-visible-menu.txt
adb shell am start -W -n uk.co.hotbox.cymra/uk.co.hotbox.cardgame.MainActivity | tee evidence/cold-start.txt
sleep 3
adb exec-out screencap -p > evidence/android-cold-interactive.png
''')
(root/'FIXES-0.4.1.md').write_text('''# Hot Box: Cymra 0.4.1

The existing eight-encounter Rage of Streets story and Classic mode, with scoped fixes.

- Seven-card Story hand limit after the action, not after drawing. Legacy pre-action trims resume with the action available.
- Announced, shorter Story encounter decks; Classic retains the full deck. Existing saved battles keep their original deal.
- Supply-tier shop prices, increasing refresh fees and stable saved quotes. Spending does not reduce run score. Already-open v0.4 shops retain their original prices.
- Distinct Dockjaw, Auditor, Director, Nerys and supporting portraits. Updated product/sabotage illustrations. Equipment uses scene-backed symbolic art. Some images remain shared or adapted from concepts, rather than unique print-resolution masters.
- Venue backgrounds, explicit suspended Heavy Lifting/Toolkit labels and case-evidence rewards.
- Unavailable Dash It explains why; the deck deadline does not overlap the action banner.

Version code 41; application ID uk.co.hotbox.cymra. This is a debug/playtest APK. Export Story saves before uninstalling a differently signed old build. Version-4 imports are supported; new deadlines begin at the next encounter for an imported battle.

Run fix041/prepare.py and fix041/post.py, then tests/engine.test.js, tests/simulate.js, tests/cymra.test.js and fix041/regression.js. Compile with Gradle 8.9 and Android SDK 35. Do not replay older expansion/transport scripts. The native suite checks gameplay and persistence plus a separate cold launch that opens/closes operative selection. It does not treat an empty UIAutomator WebView text export as a blank game. Check the exact CI outcome before calling tests passed.
''')
print('0.4.1 finishing patches and direct cold-start tests prepared')
