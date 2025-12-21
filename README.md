# Cursed Dice

A fast-paced, music-driven dice game with progressive cursed mechanics. Race against the soundtrack to fill your scorecard before time runs out!

## Game Modes

Complete all 4 modes to win. Score 250+ in each mode to advance. Fail any mode and you start over from the beginning!

### Mode 1: Classic Sprint
Standard dice game - fill all 13 categories in any order before time runs out.

### Mode 2: Cursed Dice
One die is cursed each turn - it's locked and you can't reroll it. The cursed die changes position after each score.

### Mode 3: Cursed Categories (3 Locked)
3 random categories are locked and unavailable each turn. After scoring, 3 new random categories become locked.

### Mode 4: Final Challenge
Only 1 category is available at a time. Score what you can with what you get!

## Difficulty Levels

- **Chill**: 4 minutes per mode
- **Normal**: 3 minutes per mode
- **Intense**: 2 minutes per mode (music speeds up as time runs out!)

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
