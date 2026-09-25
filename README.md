# HOT BOX: AFTER HOURS — CYMRA 0.4.0

A Rage of Streets story in fictional Wales (Cymra) and fictional Ireland (Eireannach).
Riz, Caz and Geth are undercover investigators exposing Korvex, Y Ddraig's corporate front.
The card economy is an abstract game resource, not real prices, criminal logistics or legal advice.

## What changed
- Eight playable encounters: The Cwtch; Last Light Arcade (Blaenport); Mrs Sippy's Back Room (Llanfaen); The County Boundary (Pen-Sarn); The Glass Office (Trallwyn); Dockjaw's Breakwater (Ynysbrig); The Crossing (Mor Cymra); The Korvex Dossier (Eireannach).
- Reach the Story target and the encounter ends immediately, including when a counter bonus reaches the target. Classic still ends on Raptor.
- Rewards are credited once. Between-table purchases spend the wallet, not run score. Failed attempts restore the entry checkpoint without awarding money.
- Seven-card Story hand limit with explicit free discard selection; bots obey the same cap. Classic is unchanged.
- Identical hand cards are grouped with counts, with dealt/type/value sorting and preserved hand scroll.
- Reactions offer three clear choices. Dash It uses a grouped product selector and previews the consequence of taking a hit.
- Approved Cymra comic illustration windows are integrated in card faces, principal operative portraits and venues. Text and values render separately. These are adapted concept illustrations, not newly painted individual production masters; some secondary portraits and equipment still use vector art.
- Safe screen insets retained. Local saves stay in the app, no account required.

## Continuity
Rage of Streets is the modern buried conspiracy. Copper Axe explores the mythology of fictional Cymra. Beastbound explores its legendary creatures. Hot Box is the undercover north-coast investigation. Real towns, real routes and real organisations are not playable logistics.

## Install
The playtest package is `uk.co.hotbox.cymra`, app label **Hot Box: Cymra**, version code 40.
It installs alongside the earlier prototypes. Version 0.3 saves are not imported because the story and stopping rules changed. No Internet, location, storage, camera or microphone permission. No adverts, accounts, purchases or real-money play.

## Build
JDK 17, Gradle 8.9, Android Gradle Plugin 8.7.3, compile/target SDK 35, minimum SDK 26.

    python3 update04/unpack.py
    node tests/engine.test.js
    node tests/simulate.js
    node tests/cymra.test.js
    gradle :app:assembleDebug :app:assembleDebugAndroidTest

`update04/unpack.py` verifies the checksums of the UTF-8 source transport and bundled comic artwork. After a successful build and API 29/35 emulator tests, the workflow publishes the readable source without force-pushing or replacing concurrent changes.

The native smoke tests exercise the actual APK: classic and campaign launch, art decoding, ability selection, saving and Activity recreation, screen insets, target-based completion, rewards/shop, purchases, next encounter, compact reactions and explicit hand trimming. Inspect the workflow outcome before assuming they passed.

This is a debug-signed playtest, not a Play Store release. The wider Rage games are separate projects; they are not bundled inside this APK.
