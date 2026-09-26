from pathlib import Path
root=Path(__file__).resolve().parents[1]
w=root/'app/src/main/assets/www'
css='''
/* CYMRA_041_POSITION: cancel offsets inherited from the old absolute deadline badge. */
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
p=root/'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java'
s=p.read_text()
old='            check("HotBoxUI.state().reserve.length>0 && HotBoxUI.state().initialDeck<60", "Shorter Story encounter deck");'
new=old+'\n            check("(function(){var a=document.querySelector(\'.risk-meter\').getBoundingClientRect(),b=document.querySelector(\'.action-banner\').getBoundingClientRect();return a.bottom<=b.top+1;})()", "Deadline does not overlap the action banner");'
if 'Deadline does not overlap' not in s:
    if old not in s:raise SystemExit('Missing native test insertion point')
    p.write_text(s.replace(old,new,1))
(root/'app/src/androidTest/java/uk/co/hotbox/cardgame/ColdMenuSmoke.java').write_bytes((root/'fix041/ColdMenuSmoke.java').read_bytes())
p=root/'scripts/smoke.sh';s=p.read_text()
if 'HOTBOX_COLD_VISIBLE_MENU' not in s:
    marker='if [ -f evidence/cold-menu.xml ]; then'
    if marker not in s:raise SystemExit('Cold-start script boundary not found')
    s=s[:s.index(marker)]+'''# UIAutomator may return an empty WebView text tree on API 35.
# Require an actual cold-launched menu, visible native surface and successful interaction instead.
adb shell am force-stop uk.co.hotbox.cymra
adb shell am instrument -w uk.co.hotbox.cymra.test/uk.co.hotbox.cardgame.ColdMenuSmoke | tee evidence/cold-visible-menu.txt
grep -q 'HOTBOX_COLD_VISIBLE_MENU:PASS' evidence/cold-visible-menu.txt
! grep -q 'HOTBOX_COLD_VISIBLE_MENU:FAIL' evidence/cold-visible-menu.txt
adb shell am start -W -n uk.co.hotbox.cymra/uk.co.hotbox.cardgame.MainActivity
sleep 3
adb exec-out screencap -p > evidence/android-cold-interactive.png
'''
    p.write_text(s)
(root/'FIXES-0.4.1.md').write_text('''# Hot Box: Cymra 0.4.1

Scoped update to the existing eight-encounter Rage of Streets story and Classic mode.

- End-of-turn seven-card Story limit; drawing to eight never interrupts a normal play. Saved old pre-action trims resume with the action available.
- Shorter, announced Story encounter decks with an inactive reserve; Classic retains the full deck. No hidden change to an already saved deal.
- Supply-tier shop prices, escalating refresh fees, stable saved quotes, and unchanged run score when spending. Existing open shops retain their original quoted prices.
- Dockjaw, Auditor, Director, Nerys and supporting cast use distinct portrait assets. Updated illustrated product/sabotage cards; upgrade tiles use scene-backed symbolic equipment art. Some illustrations are shared or adapted from concept sheets, not print-resolution unique card masters.
- Venue backgrounds, explicit suspended equipment/Heavy Lifting feedback, and case-evidence rewards.
- Disabled Dash It explains a missing card or missing sacrifice. Deck deadline and action feedback do not overlap.

Version code 41; application ID uk.co.hotbox.cymra. Debug/playtest signing, not a production or Play Store release. Export a save before removing an older differently signed build. Existing version-4 save imports are supported. A newly imported old battle keeps its original deadline; the new balance starts with the next encounter.

Build from this expanded source with Python 3, Node and Android SDK/Gradle: run fix041/prepare.py, fix041/post.py, tests/engine.test.js, tests/simulate.js, tests/cymra.test.js, fix041/regression.js, then gradle :app:assembleDebug :app:assembleDebugAndroidTest. Consult the exact workflow outcome for native validation; the presence of tests is not proof they passed.

The cold-start test interacts with a freshly launched native WebView and opens/closes character selection. It does not use an empty UIAutomator accessibility text dump as evidence that a WebView failed to render. Screenshots remain in the evidence artifact for visual inspection.
''')
print('Positioning correction, cold-launch checks and release notes prepared')
