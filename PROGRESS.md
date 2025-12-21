# Cursed Dice - Development Progress & Best Practices Review

## Last Updated: December 20, 2025 (Evening)

---

## Phaser 3 Best Practices Adherence Score

### **Overall Score: 9.6 / 10** (excluding Testing)

---

## Detailed Breakdown by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Project Structure** | 9/10 | Clean separation: `scenes/`, `systems/`, `ui/`. Barrel exports. UI components extracted to `ui/menu/`, `ui/gameplay/` |
| **TypeScript Integration** | 10/10 | Strict mode. Zero `any` types. Proper interfaces & types. Path aliases (`@/`) |
| **Scene Management** | 9/10 | Proper `init()`, `create()`, `shutdown()` lifecycle. Scene data passing. Smooth transitions |
| **Performance** | 9/10 | Tweens cleanup. Fixed drift bugs. Logger utility. Object pooling for particles |
| **Code Organization** | 9/10 | Event-driven architecture. Singleton managers. UI components extracted. Consistent styling |
| **Asset Management** | 10/10 | Pre-processed audio via ffmpeg. Audio test page for A/B testing. Proper preloading |
| **State Management** | 9/10 | `GameProgressionManager` + `BlessingManager` singletons. `SaveManager` for localStorage |
| **Input Handling** | 9/10 | Centralized InputManager. Keyboard bindings. Prepared for customization |
| **Error Handling** | 9/10 | Global error handlers. Logger utility. Systems log state changes and errors |
| **Testing** | 0/10 | No test files. No testing framework configured |
| **Build & Deployment** | 9/10 | Vite config. TypeScript build. ESLint + Prettier. Path aliases |

---

## Key Strengths

1. **Zero `any` types** - Excellent TypeScript discipline
2. **Event-driven architecture** - Clean scene/component communication via `game-events.ts`
3. **Clean folder structure** - Logical separation (`scenes/`, `systems/`, `ui/`)
4. **UI Component Extraction** - Menu and gameplay UI split into dedicated components
5. **Memory cleanup** - Proper `destroy()` methods throughout codebase
6. **Consistent Visual Language** - Palette/colors centralized, panel styling pattern documented

---

## Current Priorities (Ranked)

### P1: Polish & UX
1. **Sound Effects** - Dice roll sounds, score sounds, UI feedback sounds
2. **Mobile Touch Controls** - Virtual joystick, proper touch targets (44px minimum)
3. **Accessibility** - High contrast mode, larger text option

### P2: Code Quality
4. **BaseScene Abstract Class** - Reduce duplication between MenuScene/GameplayScene
5. **Texture Atlases** - Bundle sprites for better performance

### P3: Deferred
6. **Testing (0/10)** - User learning this separately

---

## Recent Session Work (Dec 20, 2025 - Evening)

### Audio System Overhaul
- [x] Replaced Tone.js with pre-processed audio files via ffmpeg
- [x] Created 3 gameplay tracks: `chill.mp3`, `normal.mp3`, `intense.mp3`
- [x] Each track is a stitch of Keep, Beware, Battling songs with effects:
  - **Chill**: 4 steps down, chorus, reverb (4 min: 2m Keep + 1m Beware + 1m Battling)
  - **Normal**: Same effects + 15% faster (3 min: 1m each)
  - **Intense**: Same effects + 30% faster (2 min: 30s + 30s + 1m)
- [x] Menu music processed with spooky effects (4 steps down, chorus, reverb)
- [x] Created `assets/audio-test.html` for A/B testing audio files

### Menu Visual Improvements
- [x] Spooky animated background (floating skulls, dice, fog, candles, glowing eyes, wisps)
- [x] Flickering title with glow and glitch effects
- [x] Themed difficulty buttons with corner accents
- [x] High scores panel with matching visual style
- [x] Pulsing vignette effect

### High Scores Panel
- [x] Corner accents matching difficulty buttons
- [x] Section headers: "4-Curse Run" and "Best Single Curse"
- [x] Clearer labels for what each score means
- [x] Proper depth ordering (renders above background effects)

### Performance Optimization
- [x] Added `ParticlePool` for score celebration particles
- [x] Pool of 30 reusable circles instead of create/destroy per score
- [x] Performance score: 8/10 → 9/10

---

## Previous Session Work (Dec 19-20, 2025)

### Bugs Fixed
- [x] Pause button not working after quit/pause sequences
- [x] Safari trackpad zoom/bounce
- [x] Canvas resize flicker on load
- [x] Scorecard special categories overflow
- [x] Timer pulse causing zoom drift
- [x] Dice position drift after roll animations
- [x] Reroll button burning rerolls when all dice locked
- [x] Container.setInteractive warning
- [x] Gauntlet mode showing 4 categories instead of 1

### Features Implemented
- [x] Mode 2 curse follows highest value die
- [x] Thematic mode names: THE AWAKENING, SHACKLED DIE, SEALED PATHS, THE GAUNTLET
- [x] Green checkmark for user-held dice, purple skull for cursed dice
- [x] Scorecard hover brings row to top
- [x] Red X for locked categories
- [x] Gauntlet single category pulses green

### Systems Added
- [x] `src/systems/logger.ts` - Dev/prod logging utility
- [x] `src/systems/save-manager.ts` - localStorage for high scores
- [x] `src/systems/input-manager.ts` - Centralized keyboard handling
- [x] Global error handlers in `main.ts`

---

## Visual Language

### Dice States
- **Normal**: Gray background
- **Held (user)**: Green background + green checkmark
- **Cursed (system)**: Purple background + purple skull

### Scorecard States
- **Available**: Normal row
- **Locked**: Gray background + red X
- **Scored**: Dimmed/filled
- **Gauntlet available**: Pulsing green text + green background

### Panel Styling Pattern
1. Outer glow (PALETTE.purple[500], low alpha)
2. Background (PALETTE.purple[700-900], high alpha)
3. Border stroke (PALETTE.purple[500])
4. Corner accents (4 L-shaped corners)

---

## Project Structure

```
src/
├── main.ts                 # Phaser game initialization
├── config.ts               # Game constants, colors, sizes
├── scenes/
│   ├── MenuScene.ts        # Main menu with difficulty selection
│   └── GameplayScene.ts    # Core gameplay (all 4 modes)
├── systems/
│   ├── audio-manager.ts    # Audio handling with fade/transitions
│   ├── dice-manager.ts     # Dice UI and logic
│   ├── game-events.ts      # Event emitter for scene communication
│   ├── game-progression.ts # Mode progression singleton
│   ├── input-manager.ts    # Centralized keyboard input
│   ├── logger.ts           # Dev/prod logging utility
│   ├── mode-mechanics.ts   # Mode-specific game rules
│   ├── save-manager.ts     # localStorage persistence
│   ├── scorecard.ts        # Yahtzee scoring logic
│   └── blessings/          # Blessing system
└── ui/
    ├── blessing-choice-panel.ts
    ├── pause-menu.ts
    ├── scorecard-panel.ts
    ├── ui-utils.ts         # Shared UI helpers (createText, etc.)
    ├── gameplay/           # In-game UI components
    │   ├── debug-panel.ts
    │   ├── end-screen-overlay.ts
    │   └── header-panel.ts
    └── menu/               # Menu UI components
        ├── difficulty-button.ts
        ├── flickering-title.ts
        └── spooky-background.ts
```

---

## Game Modes

| Mode | Name | Mechanic |
|------|------|----------|
| 1 | THE AWAKENING | Standard Yahtzee - fill all categories |
| 2 | SHACKLED DIE | Highest value die becomes cursed after each score |
| 3 | SEALED PATHS | 3 random categories locked, new locks after each score |
| 4 | THE GAUNTLET | Only 1 category available at a time |

---

## Audio Files

```
assets/sounds/
├── menu.mp3           # Menu music (processed with spooky effects)
├── chill.mp3          # Chill mode (4 min, Keep+Beware+Battling)
├── normal.mp3         # Normal mode (3 min, 15% faster)
├── intense.mp3        # Intense mode (2 min, 30% faster)
├── Police_signal.wav  # Timer warning sound
└── test-sources/      # Pre-stitch audio for testing
    ├── Keep.mp3, Beware.mp3, Battling.mp3, Dungeon.mp3
    ├── chill_*.mp3, normal_*.mp3, intense_*.mp3
    └── menu_original.mp3, menu_processed.mp3
```

---

## Next Steps (Suggested)

### Immediate
1. [ ] Add vitest + first unit tests for scorecard.ts
2. [ ] Add sound effects (dice roll, score, UI clicks)

### Soon
3. [ ] Implement object pooling for particle effects
4. [ ] Create BaseScene abstract class
5. [ ] Mobile touch controls optimization

### Later
6. [ ] Texture atlases for sprites
7. [ ] Accessibility options
8. [ ] Leaderboard / cloud saves
