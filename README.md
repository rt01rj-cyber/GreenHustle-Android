# Green Hustle — Android card game prototype v0.1

Green Hustle is an original offline Android take-that card game inspired by the broad draw/play/tableau tension of classic competitive card games. It does **not** copy the Grass card deck, wording, artwork, logo or exact rules.

## Included in v0.1

- 2–6 players.
- Solo mode with 1–5 AI opponents.
- Three AI styles: Casual, Sharp and Ruthless.
- Local pass-and-play with a privacy screen between turns.
- Fully offline play; the Android manifest requests no Internet permission.
- Save/continue using WebView local storage.
- Three game lengths: £150k, £300k and £500k winning totals.
- 100-card original deck covering Markets, Stock, Pressure, Relief, Protection, Actions and Risk cards.
- Round scoring, protected/exposed value, penalties, price effects and a round-winner bonus.
- Original responsive mobile UI and launcher artwork.

## Core rules

1. Draw one card at the start of your turn.
2. Play one card, or bin one card.
3. A **Pitch Open** card is required before Stock can be placed on your table.
4. Pressure cards disrupt rivals. **Supply Freeze** blocks Stock; other pressure damages exposed value or forces losses.
5. Relief cards clear pressure. Protection secures stock or cancels future pressure.
6. **Cash Out** ends the round when your pitch is open and you have no active pressure. The round also ends when the deck runs out.
7. Protected Stock scores in full. Exposed Stock can be reduced by active pressure or Price Crash effects. Risk cards left in hand subtract from the round.
8. Totals carry between rounds until a player reaches the selected target.

## Project structure

- `app/src/main/java/.../MainActivity.java` — minimal native Android WebView shell.
- `app/src/main/assets/www/engine.js` — pure game/rules engine.
- `app/src/main/assets/www/app.js` — game UI/controller, AI turn scheduling and saves.
- `app/src/main/assets/www/styles.css` — responsive game styling.
- `tests/engine.test.js` — focused rules tests.
- `tests/simulate.js` — 100-game AI stress test.
- `.github/workflows/build-apk.yml` — cloud APK build workflow.

## Build

The GitHub Actions workflow runs the rule tests, simulates 100 games, then builds a debug APK. The artifact is named **GreenHustle-v0.1-debug-apk**.

The APK path inside the build is:

`app/build/outputs/apk/debug/app-debug.apk`
