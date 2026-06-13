# The Alchemist 

A hardcore, browser-based rogue-lite deckbuilder built entirely with pure Vanilla JavaScript, HTML, and CSS. No libraries, no canvas (except for particle VFX), no image files—just pure code and procedural generation!

## Features

- **3 Unique Classes:** 
  - **Alchemist:** Master of poison and fire mechanics.
  - **Bloodmage:** High-risk, high-reward lifesteal and self-damage abilities.
  - **Elementalist:** Defensive powerhouse utilizing shield accumulation and engine mechanics.
- **Rogue-lite Meta Progression:** Dying is not the end. Collect souls based on the floor you reached and permanently upgrade your stats (Max HP, Starting Strength, or Relics) at the Dark Shrines.
- **Dynamic Web Audio Synthesizer:** All sound effects (swish, hit, shield, heal, click) are procedurally generated in real-time using the browser's native Web Audio API. Zero external audio files!
- **30 Floors of Agony:** Battle through 30 floors of scaling enemies. Face the Act 1 Boss at Floor 15, and the Final Boss (The Grand Alchemist) at Floor 30.
- **Relic Drafting:** Defeat Elite enemies to draft 1 of 3 legendary Relics that fundamentally change your run.
- **Campfire Smithing:** Rest at forced camps to heal, remove weak cards from your deck, or permanently upgrade (Smith) your cards to '+' versions.
- **Card Compendium:** Discover all 30 unique cards and 10 relics to fill up your in-game Compendium.
- **Ascension Mode (Difficulty Scaling):** Beat the game to unlock Ascension levels, permanently increasing the difficulty of Elites, Camps, and Bosses for endless replayability.

## How to Play

Since the game is built with zero dependencies and no external assets, installation is instantaneous.

1. Clone or download this repository.
2. Double-click on `index.html`.
3. The game will launch directly in your browser. No local server required!

## Technical Details

- **UI & Styling:** Built with Vanilla CSS, leveraging CSS Grid/Flexbox, custom CSS variables for theming, and complex `clip-path` geometry for procedurally generated card arts.
- **Logic:** 100% Vanilla ES6 JavaScript. The entire game engine, deck drafting, turn-based combat, and state management is handled in a single script.

*Built with passion, sweat, and a little bit of dark magic.*
