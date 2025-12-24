# Cursed Dice

A fast-paced, music-driven dice game with progressive cursed mechanics. Race against the soundtrack to fill your scorecard before time runs out!

## Game Modes (Curses)

Complete all 4 curses to win. Score 250+ in each curse to advance. Fail any curse and you start over from the beginning!

### Curse 1: THE AWAKENING
Standard dice game - fill all 13 categories in any order before time runs out.

### Curse 2: SHACKLED DIE
Your highest value die becomes cursed after each score. Cursed dice are locked and can't be rerolled.

### Curse 3: SEALED PATHS
3 random categories are locked and unavailable. After scoring, 3 new random categories become locked.

### Curse 4: THE GAUNTLET
Only 3 categories are available at a time. Score what you can with what you get!

## Blessings

After completing each curse, choose a blessing to help you in the next round. Each blessing can only be chosen once per run!

| Blessing | Effect |
|----------|--------|
| **Abundance** | Unlocks 4 bonus categories (All Even, All Odd, Pairs, No Pairs). Fill any 13 of 17 total. |
| **Mercy** | Reset your hand completely: new dice, full rerolls. One use per curse. |
| **Sanctuary** | Bank your current dice to restore later. One use per curse. |
| **The Sixth** | Roll 6 dice instead of 5 - scoring uses the best 5. 3 charges per curse. |

## Difficulty Levels

- **Chill**: 4 minutes per curse
- **Normal**: 3 minutes per curse
- **Intense**: 2 minutes per curse

## Tutorial

New to Cursed Dice? The interactive tutorial teaches you:
- How the timer and scoring work
- Locking dice to build combinations
- When to reroll vs. when to score
- Strategic "zeroing out" when nothing fits

Access the tutorial from the main menu.

## How to Play

1. Select a difficulty level
2. Roll dice by clicking the ROLL button
3. Click dice to lock/unlock them between rolls (3 rerolls per turn)
4. Click a category in the scorecard to score your dice
5. Fill all 13 categories before time runs out!
6. Score 250+ to advance to the next mode

## Scoring

### Upper Section
- Ones through Sixes: Sum of matching dice
- Bonus: +35 if upper section totals 63+

### Lower Section
- Three of a Kind: Sum of all dice (if 3+ match)
- Four of a Kind: Sum of all dice (if 4+ match)
- Full House: 25 points (3 of one + 2 of another)
- Small Straight: 30 points (4 in sequence)
- Large Straight: 40 points (5 in sequence)
- Five Dice: 50 points (5 of a kind)
- Chance: Sum of all dice

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Tech Stack

- [Phaser 3](https://phaser.io/) - Game framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## License

ISC
