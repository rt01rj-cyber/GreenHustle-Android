# HOT BOX — playtest 0.2.0

A fictional, adult, UK street-satire card game. Reboot of the Green Hustle prototype. An original deck and game implementation; not a digital reproduction of Grass.

## Play

Android 8.0 or later. Install the signed **debug/playtest** APK from the successful GitHub Actions build. The app is called **Hot Box**, with its own package `uk.co.hotbox.cardgame`. It can sit alongside Green Hustle; it does not import the old game or save. No Internet, storage, camera, microphone or location permission is requested. No accounts, trackers, adverts, payment system or real-money play.

Solo against 1–5 AI rivals, or 2–6 local players sharing one device. Choose 3, 5 or 7 rounds and Casual, Sharp or Ruthless AI. Highest banked total wins, with shared wins on exact ties.

## Implemented

- 101-card deck, guaranteed opening Burner Phone in each five-card starting hand.
- Illustrated, colour-coded cards and full-size tap-to-read views.
- Fan hand, draw/discard piles, visible rival stashes, inspectable public tables and private hands.
- Separate exposed stash and banked cash; banking uses an entire action.
- Real out-of-turn police reactions, with no countdown rushing a human decision.
- Operation Raptor randomly inserted into the final third after dealing; only banked cash survives.
- Event banners, card-play motion, private pass-and-play handoffs, readable round tally.
- Six-step tutorial, full rules, browsable deck, sound toggle, reduced motion and adjustable AI pace.
- Save after every action; AI timers stop on menus, modals and pause. Local hands are concealed on resume.
- Offline HTTPS-origin WebView serving only assets bundled inside the APK. No JavaScript/native bridge or external navigation.

## Playtest rule decisions

Draw one, then play a card, bank one exposed product, or bin one card. Stash capacity is six cards. Products first go to the table and can only be banked on a later turn.

Raid blocks selling/banking for two affected turns, but does not prevent drawing or countering. This deliberately avoids permanent lockouts. No Comment can react to cancel police hits, or clear your own active Raid. Good Solicitor clears your Raid and Fake Batch. Dash It reacts by sacrificing a product from your own hand; there is no monetary fine in this build.

Section 60 removes the target's highest-value exposed product, or highest-value hand product if their exposed stash is empty. Taxed randomly steals a hidden hand product, without revealing the rest of that hand. Smart Whip protects only £5k hand products from Taxed. Fake Batch halves one future bank and cannot stack.

All titles/effects are fiction. In particular, No Comment is not a real legal shield, Section 60 is not explained by this game, and these are not real prices or operating instructions. The original user-provided concept has been translated into abstract card-game rules, not legal advice.

## Artwork

The atlas reuses/crops the approved Hot Box concept artwork supplied in the conversation. Cards render fresh, accurate rule text rather than using baked-in mock-up text. Some scenes share illustrations. This is not a claim that a complete set of independently painted, print-resolution card masters has been produced. No external fonts or online image requests. The seven tracked binary chunks in `art-src/` reconstruct the atlas during `scripts/check_assets.py`; its SHA-256 is checked before every build.

## Build and validation

Pinned toolchain: Android Gradle Plugin 8.7.3, Gradle 8.9, JDK 17, compile/target SDK 35, minimum SDK 26.

```
node tests/engine.test.js
node tests/simulate.js
python3 scripts/check_assets.py
gradle :app:assembleDebug :app:assembleDebugAndroidTest
```

The workflow builds and verifies the APK signature, then installs it and its framework-only instrumentation test on Android API 29 and 35 emulators. `HotBoxSmoke` checks JavaScript boot, bundled WebP decoding, opening a solo table, drawing, inspecting, saving, resuming and Activity recreation. Inspect the actual run outcome before assuming the native tests passed.

The game engine has 14 targeted checks and a 1,000-match simulation across player counts and difficulties. The local browser harness uses bundled HTML and an in-memory Storage adapter because sandbox browser navigation is blocked. Native instrumentation, not that adapter, tests Android localStorage persistence.

## Existing project and upgrade notes

The former app is retained in the `backup/green-hustle-0.1.1` branch. Hot Box uses a new app ID so it does not overwrite Green Hustle. These are automatically debug-signed playtest APKs, not a Play Store release. A future release needs an owner-managed signing key; never commit private signing keys to this repository.
