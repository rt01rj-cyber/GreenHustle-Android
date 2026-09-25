# Hot Box: After Hours — v0.3.0 playtest

An offline, adult, fictional card tournament. **After Hours** is a non-canon Rage of the Valleys spin-off; characters are competing at card tables, not being rewritten as real-world drug dealers. Classic multiplayer and solo are included, with separate campaign and Classic saves.

## What is actually included

A complete first chapter: The Cwtch in Abernant, Mrs Sippy's Back Room in Porth Derw, then Morgan “Dockjaw” at the Breakwater. Clear the respective £40k / £65k / £100k banking targets before Operation Raptor. Campaign tables use a target rather than Classic's winner-takes-all total. Dockjaw caps the human player's exposed stash at two cards. The wider Wales circuit, Nerys and Y Ddraig finale are not playable in this build.

Choose Rhys “Riz” Morgan (one free single-card replacement per encounter), Carys “Caz” Samuels (first successful counter queues one extra card on the next regular draw), or Gethin “Geth” Hughes (one extra stash slot, except at Dockjaw). Portraits are new stylised interpretations of the established descriptions, not recovered original Rage sprite faces.

Between cleared tables, earnings add separately to spending cash and run score. Purchases reduce only spending cash. Four passive slots, two consumable slots, twelve implemented passive upgrades and three consumables. A fourth-slot replacement explicitly discards the old passive. No refund. Shop offers, purchases and random state persist across save/resume; simply reopening the shop does not reroll it.

Three chances per run. A failed table gives no earnings. Wallet and consumables return to that encounter's entry checkpoint, one chance is lost, and a retry makes a fresh deal. Temporary upgrades reset on a new run. The codex keeps discovered upgrades, seen story tables, best completed-run score and a winner badge. All three initial heroes are available without grinding. No permanent statistical advantages.

## The twelve passives

Pocket Rocket (+£5k per £5k product); Double Drop (bank two exposed £5k products in one action); Colin's Toolkit (+1 stash slot outside Dockjaw); Cwtch Cushion (prevent the first £5k exposed product loss to Section 60); Oracle's Tip (reveal all future table targets/rules from the map); Mrs Sippy's Special (one free refresh per shop); Comeback Bonus (+£5k on the first successful counter); Third Time Lucky (+£10k every third bank action); Pocket Premium (+£5k per vape bank); Fancy Packaging (+£10k per Cali bank); Rainy Day Fund (+£10k on the first bank action); Full Charge (start with an active line).

Fake Batch halves the value, including per-product bonuses, of the first product in the next bank action. Once-per-action flat bonuses are added afterward. Double Drop therefore does not waste an entire pair under Fake Batch. No power-up disables Operation Raptor. Draw/replacement powers can themselves draw Raptor and end the encounter.

Consumables: Bara Brith Break replaces one or two selected hand cards; Cwtch Flask clears Raid; Lucky Receipt adds £10k to the next bank action. Use them after the normal draw on the player's turn, without spending the main action. Invalid uses do not consume the item.

## Presentation and phone fixes

Native inset padding is on a FrameLayout parent, reducing the WebView's actual measured viewport rather than merely padding its content. This accounts for status/navigation bars and display cutouts. The hand uses larger, separately readable, horizontally scrollable cards rather than overlapping titles. A single rival gets a compact panel; the centre no longer expands into empty space. The current turn and latest meaningful action have separate labels. Action presentation pauses before the next AI step. Banking previews include story bonuses.

Original standalone vector comic panels are bundled for the cards and cast. They stay sharp when enlarged and do not contain labels cropped from the promotional sheet. This is a stylised vector pass, not a claim of fully painted production card masters. Existing promotional atlas data is retained for backward compatibility and asset validation. No external font files or network image requests.

## Install, safety and saves

This playtest deliberately installs side-by-side as **Hot Box: After Hours**, application ID `uk.co.hotbox.afterhours`. The old Hot Box v0.2 app and saves are not overwritten or imported. Both Classic and Story are available in this new app. It is debug-signed, not a Play Store release. Future seamless updates require the same signing certificate; do not commit private production signing keys.

No Internet, camera, microphone, external storage or location permission. No account, trackers, purchases, real money or server. The on-device WebView intercepts the private `https://hotbox.local` origin and serves only bundled resources; it does not contact a website. Save export/import is a local text transfer via the codex. Imports are validated before replacing the saved run. Do not share saves that you have manually modified to contain personal information.

## Source and validation

`expansion/` holds the new modules. Run `python3 expansion/prepare.py` before development or tests. It applies checked, idempotent integration patches to the retained Classic engine/UI, then copies expansion modules to Android assets. This preserves original rules tests while keeping campaign code separate.

```
python3 expansion/prepare.py
python3 scripts/check_assets.py
node tests/engine.test.js
node tests/simulate.js
node expansion/tests/campaign.test.js
gradle :app:assembleDebug :app:assembleDebugAndroidTest
```

The original 14 rules checks and 1,000 Classic simulations are retained. Expansion checks cover reward idempotence, checkpoint rollback, three-chance failure, deterministic shops, prices/slots, all mechanical bonuses, two-card banks, hero skills, consumables, Raptor, three-table completion, save restoration and 300 complete scripted campaigns. Simulations are not proof of human difficulty balance; this is a deliberately approachable opening chapter.

The native instrumentation tests the actual installed app on Android API 29 and 35: launch, bundled assets, Classic draw/inspect/save, character selection, story briefing, story draw and Riz replacement, distinct save slots, Activity recreation and status-bar bounds. Browser UI checks use an in-memory Storage adapter only because the sandbox blocks browser navigation. Android instrumentation, not that adapter, is the persistence test. See the actual Actions run result and its evidence before treating tests as passed.

The initial transport bundle is checksum verified and expanded by the build; after native tests pass, the workflow publishes the expanded reviewed source without force-pushing or overwriting any concurrent main-branch commit. The APK/source artifacts contain the exact prepared files used by the run.
