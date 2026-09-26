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
p=root/'app/src/androidTest/java/uk/co/hotbox/cardgame/HotBoxSmoke.java'
s=p.read_text()
old='            check("HotBoxUI.state().reserve.length>0 && HotBoxUI.state().initialDeck<60", "Shorter Story encounter deck");'
new=old+'\n            check("(function(){var a=document.querySelector(\'.risk-meter\').getBoundingClientRect(),b=document.querySelector(\'.action-banner\').getBoundingClientRect();return a.bottom<=b.top+1;})()", "Deadline does not overlap the action banner");'
if 'Deadline does not overlap' not in s:
    if old not in s:raise SystemExit('Missing native test insertion point')
    p.write_text(s.replace(old,new,1))
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
''')
print('Positioning correction and release notes prepared')
