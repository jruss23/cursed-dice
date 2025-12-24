# Cursed Dice - Development Progress & Best Practices Review

## Last Updated: December 22, 2025

---

## Phaser 3 Best Practices Adherence Score

### **Overall Score: 9.7 / 10** (excluding Testing)

---

## Detailed Breakdown by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Project Structure** | 10/10 | Clean separation: `scenes/`, `systems/`, `ui/`. All major UI extracted to `ui/menu/`, `ui/gameplay/` |
| **TypeScript Integration** | 10/10 | Strict mode. Zero `any` types. Proper interfaces & types. Path aliases (`@/`) |
| **Scene Management** | 9/10 | Proper `init()`, `create()`, `shutdown()` lifecycle. Scene data passing. Smooth transitions |
| **Performance** | 9/10 | Tweens cleanup. Fixed drift bugs. Logger utility. Object pooling for particles |
| **Code Organization** | 10/10 | Event-driven architecture. Singleton managers. All UI components extracted. Consistent patterns |
| **Asset Management** | 10/10 | Pre-processed audio via ffmpeg. Audio crackling fixed. Proper preloading |
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

## Recent Session Work (Dec 23, 2025)

### Tutorial System - Complete Implementation
- [x] Full interactive tutorial with 13 guided steps
- [x] Context-first approach: Welcome → Header → Scorecard → Dice explanation
- [x] Scripted dice rolls for consistent learning experience
- [x] "No luck" step to show realistic reroll failures
- [x] 5 Dice celebration (50 points!)
- [x] Zero-out scenario with junk roll [1,1,2,3,3] - teaches sacrificing 4 of a Kind
- [x] Practice mode after tutorial completion

### Tutorial Overlay System
- [x] Gold pulsing highlight border (3px, PALETTE.gold[500])
- [x] No padding - border hugs highlighted elements tightly
- [x] Synchronized fade transitions (120ms out, 150ms in)
- [x] Highlight targets: header, scorecard, dice, roll-button, specific categories
- [x] Graphics-based rendering for proper stroke display

### Tutorial Controls
- [x] Dice locking restricted to only valid dice (1s) throughout tutorial
- [x] setLockableIndices([]) prevents locking during reroll steps
- [x] Forced roll values for consistent tutorial experience
- [x] Score display updates properly with updateDisplay() call
- [x] Proper reset() before zero-out scenario to clear locks

### New Files
- `src/scenes/TutorialScene.ts` - Full tutorial scene
- `src/ui/tutorial/tutorial-overlay.ts` - Popup and highlight system

---

## Previous Session Work (Dec 22, 2025 - Evening)

### Sixth Blessing Implementation
- [x] Full implementation of "The Sixth" blessing - roll 6 dice, score with best 5
- [x] 3 charges per run, activates mid-hand for a "panic reroll" option
- [x] 6th die rolls immediately when activated, animates in smoothly
- [x] Scorecard evaluates all 6 choose 5 combinations for optimal scoring
- [x] Button integrated into dice controls panel with 3-column layout

### Dice Controls Panel Refactor
- [x] Clean 3-column layout: [Blessing] | [Rerolls] | [Roll]
- [x] Equal column widths (120px mobile, 130px desktop)
- [x] Content centered in each column with proper dividers
- [x] Blessing button: gold theme, shows "+1🎲 (3/3)" charges
- [x] Active state: transparent background to show it's been used

### Mobile Layout Improvements
- [x] Viewport-relative positioning using `scene.scale.gameSize`
- [x] Percentage-based layout with min/max constraints
- [x] Fixed 100px overflow on iPhone Safari with browser chrome
- [x] Responsive header, dice, and scorecard zones

### Blessing System Architecture
- [x] `BlessingManager` singleton for blessing state across run
- [x] Event-driven communication (`blessing:sixth:activated`, etc.)
- [x] `SixthBlessingButton` UI component with proper state management
- [x] Blessing choice panel shows all 4 blessings

---

## Previous Session Work (Dec 22, 2025 - Earlier)

### Audio System Polish
- [x] Fixed audio crackling in chill.mp3 tracks
- [x] Keep track: 12kHz lowpass, removed chorus effect (was causing crackle)
- [x] Beware track: Lowered 1 octave (pitch=0.5) for deeper sound
- [x] Final stitch with validated audio quality

### Visual Polish - Removed Panel Glows
- [x] Removed `outerGlow` rectangles from ALL gameplay panels
- [x] Affected: dice-manager, pause-menu, scorecard-panel, header-panel, blessing-choice-panel, end-screen-overlay
- [x] Only difficulty buttons retain pulsing glow effect (as intended)

### Code Quality - Component Extraction
- [x] Extracted `HighScoresPanel` to `src/ui/menu/high-scores-panel.ts`
- [x] MenuScene reduced from ~535 lines to 369 lines
- [x] Panel supports `depth` config for render ordering
- [x] Added to `@/ui/menu` barrel export

### Text Rendering
- [x] All panels use `createText()` helper with DPR fix
- [x] `resolution: devicePixelRatio` + `padding: { x: 4, y: 4 }`
- [x] Crisp AND smooth text on retina displays

---

## Previous Session Work (Dec 20, 2025 - Evening)

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
- [x] Gauntlet mode showing correct number of available categories (3)

### Features Implemented
- [x] Mode 2 curse follows highest value die
- [x] Thematic mode names: THE AWAKENING, SHACKLED DIE, SEALED PATHS, THE GAUNTLET
- [x] Green checkmark for user-held dice, purple skull for cursed dice
- [x] Scorecard hover brings row to top
- [x] Red X for locked categories
- [x] Gauntlet available categories pulse green (3 at a time)

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
- **Gauntlet available**: Pulsing green text + green background (3 categories at a time)

### Panel Styling Pattern
1. Background (PALETTE.purple[700-900], high alpha)
2. Border stroke (PALETTE.purple[500])
3. Corner accents (4 L-shaped corners)
4. Shadow (offset rectangle, low alpha)

---

## Project Structure

```
src/
├── main.ts                 # Phaser game initialization
├── config.ts               # Game constants, colors, sizes
├── scenes/
│   ├── MenuScene.ts        # Main menu with difficulty selection
│   ├── GameplayScene.ts    # Core gameplay (all 4 modes)
│   └── TutorialScene.ts    # Interactive tutorial
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
│       ├── index.ts            # Barrel export + BlessingManager
│       ├── types.ts            # Blessing interfaces & configs
│       ├── blessing-manager.ts # Singleton manager
│       ├── blessing-expansion.ts # Abundance blessing
│       └── blessing-sixth.ts   # The Sixth blessing
└── ui/
    ├── blessing-choice-panel.ts
    ├── pause-menu.ts
    ├── scorecard-panel.ts
    ├── ui-utils.ts         # Shared UI helpers (createText, etc.)
    ├── gameplay/           # In-game UI components
    │   ├── debug-panel.ts
    │   ├── end-screen-overlay.ts
    │   ├── header-panel.ts
    │   └── sixth-blessing-button.ts
    ├── menu/               # Menu UI components
    │   ├── index.ts            # Barrel export
    │   ├── difficulty-button.ts
    │   ├── flickering-title.ts
    │   ├── high-scores-panel.ts
    │   └── spooky-background.ts
    └── tutorial/           # Tutorial UI components
        └── tutorial-overlay.ts # Popup and highlight system
```

---

## Game Modes (Curses)

| Curse | Name | Mechanic |
|-------|------|----------|
| 1 | THE AWAKENING | Standard Yahtzee - fill all 13 categories |
| 2 | SHACKLED DIE | Highest value die becomes cursed after each score (locked, can't reroll) |
| 3 | SEALED PATHS | 3 random categories locked, new locks after each score |
| 4 | THE GAUNTLET | Only 3 categories available at a time |

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

### Immediate - Blessings
1. [ ] Implement Foresight blessing (preview next roll, 3 charges)
2. [ ] Implement Sanctuary blessing (bank/restore dice, 1 use)

### Soon - Polish
3. [ ] Add sound effects (dice roll, score, UI clicks)
4. [x] ~~Tutorial scene with coach marks~~ **COMPLETE** (Dec 23, 2025)

### Later
5. [ ] Create BaseScene abstract class
6. [ ] Texture atlases for sprites
7. [ ] Add vitest + unit tests
8. [ ] Accessibility options
9. [ ] Leaderboard / cloud saves
