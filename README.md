# best-card-game-20261122-1826-r2

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/nandorp28/best-card-game-20261122-1826-r2/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/nandorp28/best-card-game-20261122-1826-r2/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

TIDEBOUND — duel of moon tides: 4 suits, 36 cards, 5 tide combos, 2 harbours, 20 life. A complete original card game for the make.fun best-card-game bounty. You are the tide-caller; Rin holds the far harbour. Play cards to the table — each costs tide. Play 2 of one suit in a turn and its tide combo fires: Wave draws a card, Coral deals +3 damage, Kelp heals 3, Pearl raises +3 shield. Rin announces the suit she is gathering — read her, then counter her. Sink her harbour (20 life) before she sinks yours.

## Run it

```sh
node --experimental-strip-types main.ts
```

Or play directly: serve `game/` with any static server and open `game/index.html` in a desktop browser. Keyboard: 1–7 play a card, Enter ends the turn.

## Layout

- `game/index.html` — table layout, title / win / loss overlays
- `game/styles.css` — moonlit harbour table, card art, slide/flip animations
- `game/cards.js` — 4 suits, 36 cards, tide-combo rules
- `game/ai.js` — Rin's readable brain: telegraphed intent, greedy plays, pair completion
- `game/game.js` — state machine, turn flow, rendering, screenshot states (`?shot=title|play|win|loss`)
- `game/sound.js` — generated WebAudio sounds, no audio files
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `screenshots/` — 4 real renders of the game's own code (cover = peak gameplay)

---

<sub>Entered on [make.fun](https://make.fun/?ref=qyk2abaw&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
