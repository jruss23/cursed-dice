# Cursed Dice - Development Progress & Architecture Review

## Last Updated: December 25, 2025

---

## Phaser 3 Best Practices Adherence Score

### **Overall Score: 9.4 / 10** (excluding Testing)

---

## Detailed Breakdown by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Project Structure** | 10/10 | Clean separation: `scenes/`, `systems/`, `ui/`, `data/`, `config/` |
| **TypeScript Integration** | 10/10 | Strict mode. Zero `any` types. Proper interfaces & types. Path aliases |
| **Scene Management** | 10/10 | Proper lifecycle. State machine controls flow. BaseScene abstract class |
| **Performance** | 9/10 | Tweens cleanup. Object pooling (ParticlePool). Logger utility |
| **Code Organization** | 10/10 | Event-driven. UI/logic separation. No file over 1100 lines |
| **Asset Management** | 10/10 | Pre-processed audio. Proper preloading. Optimized sounds |
| **State Management** | 10/10 | GameStateMachine + Service Registry. Clean state flow |
| **Input Handling** | 9/10 | Centralized InputManager. Keyboard bindings. Mobile touch ready |
| **Error Handling** | 9/10 | Global handlers. Logger utility. Services throw on missing deps |
| **Testing** | 9/10 | 103 unit tests via Vitest. Core logic covered (categories 86%, scorecard 80%, state-machine 94%) |
| **Build & Deployment** | 9/10 | Vite. TypeScript. ESLint + Prettier. Path aliases |

---

## Architecture Patterns - Implementation Status

### Fully Implemented

| Pattern | Location | Notes |
|---------|----------|-------|
| **Service Registry** | `systems/services.ts` | Global services (save, progression) with type-safe getters |
| **State Machine** | `systems/state-machine.ts` | Controls game flow: idle→rolling→selecting→scoring→game-over |
| **Event Bus** | `systems/game-events.ts` | Cross-component communication via typed events |
| **Layout Calculator** | `ui/scorecard/layout-calculator.ts` | Pure functions, no Phaser deps, returns LayoutConfig |
| **Data Layer** | `src/data/` | Static game data separated from logic (categories, modes, blessings) |
| **Singleton Managers** | Various | SaveManager, GameProgressionManager, BlessingManager |
| **UI/Logic Separation** | `scenes/gameplay/`, `systems/dice/` | Rendering extracted from game logic |
| **BaseScene Abstract** | `scenes/BaseScene.ts` | Common lifecycle helpers for all scenes |
| **Blessing Factory** | `systems/blessings/blessing-manager.ts` | Factory pattern with registration for extensibility |

### Removed Patterns (Simplification)

| Pattern | Reason for Removal |
|---------|-------------------|
| **Command Pattern** | Undo/redo was never used. Commands just wrapped simple method calls. ~350 lines deleted. |
| **Per-Game Service Registration** | Per-game services were registered but never retrieved via `Services.get()`. Only global services (save, progression) remain registered. |

### Architecture Philosophy
- **Pure logic is testable**: scorecard, categories, state-machine have no Phaser deps
- **UI is cohesive**: rendering code stays together (not split for the sake of splitting)
- **Scenes orchestrate**: GameplayScene wires systems together, doesn't own all logic
- **Simplicity over patterns**: Only use patterns that solve real problems

---

## File Size Targets

| File | Current | Target | Status |
|------|---------|--------|--------|
| GameplayScene.ts | 1,051 | <1,200 | ✅ Under target |
| DiceManager.ts | 865 | <900 | ✅ Under target |
| ScorecardPanel.ts | 1,015 | N/A | ✅ Complex but cohesive |

---

## Project Structure (Updated Dec 24, 2025)

```
src/
├── main.ts                     # Phaser initialization + global services
├── config.ts                   # Re-exports from config/
├── config/
│   ├── index.ts               # Barrel export
│   ├── theme.ts               # PALETTE, COLORS, FONTS
│   ├── sizes.ts               # SIZES, RESPONSIVE
│   ├── game-rules.ts          # GAME_RULES (timeouts, thresholds)
│   └── dev.ts                 # DEV flags
├── data/
│   ├── index.ts               # Barrel export
│   ├── categories.ts          # Category definitions + scoring functions
│   ├── modes.ts               # Mode/Curse configurations
│   ├── blessings.ts           # Blessing definitions
│   └── difficulties.ts        # Difficulty configs (time, labels)
├── scenes/
│   ├── BaseScene.ts           # Abstract base with lifecycle helpers
│   ├── MenuScene.ts           # Main menu
│   ├── GameplayScene.ts       # Core gameplay (1,051 lines)
│   ├── TutorialScene.ts       # Interactive tutorial
│   └── gameplay/              # GameplayScene helpers
│       ├── index.ts
│       ├── blessing-integration.ts  # Blessing UI coordination
│       └── ui-setup.ts        # UI creation helpers
├── systems/
│   ├── services.ts            # Service registry (DI container)
│   ├── state-machine.ts       # GameStateMachine
│   ├── game-events.ts         # Event emitter (trimmed to used events only)
│   ├── scorecard.ts           # Scoring logic (pure, testable)
│   ├── dice-manager.ts        # Dice state + logic (865 lines)
│   ├── audio-manager.ts       # Music/SFX
│   ├── game-progression.ts    # Mode progression
│   ├── mode-mechanics.ts      # Mode-specific rules
│   ├── save-manager.ts        # localStorage
│   ├── input-manager.ts       # Keyboard bindings
│   ├── logger.ts              # Dev/prod logging
│   ├── particle-pool.ts       # Object pool for particles
│   ├── debug-controller.ts    # Debug menu actions
│   ├── dice/                  # Dice rendering (extracted)
│   │   ├── index.ts
│   │   └── dice-renderer.ts   # All dice visuals/animations
│   ├── blessings/             # Blessing system
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── blessing-manager.ts
│   │   ├── blessing-expansion.ts  # Abundance (4 extra categories)
│   │   ├── blessing-sixth.ts      # The Sixth (6th die charges)
│   │   ├── blessing-mercy.ts      # Mercy (hand reset)
│   │   └── blessing-sanctuary.ts  # Sanctuary (bank/restore)
│   └── tutorial/              # Tutorial system
│       ├── index.ts
│       ├── interfaces.ts
│       └── tutorial-controller.ts
└── ui/
    ├── ui-utils.ts            # createText, createPanelFrame helpers
    ├── base/                  # Base UI components
    │   ├── index.ts
    │   └── base-button.ts
    ├── scorecard-panel.ts     # Main scorecard (~1,015 lines)
    ├── scorecard/             # Scorecard helpers
    │   ├── index.ts
    │   ├── layout-config.ts   # Types
    │   ├── layout-calculator.ts # Pure positioning functions
    │   └── state-manager.ts   # UI state (hover, input lock, etc.)
    ├── blessing-choice-panel.ts
    ├── pause-menu.ts
    ├── dice/                  # Dice controls
    │   ├── index.ts
    │   └── dice-controls.ts
    ├── gameplay/              # Gameplay UI
    │   ├── index.ts
    │   ├── header-panel.ts
    │   ├── debug-panel.ts
    │   ├── end-screen-overlay.ts
    │   ├── sixth-blessing-button.ts
    │   ├── mercy-blessing-button.ts
    │   └── sanctuary-blessing-button.ts
    ├── menu/                  # Menu UI
    │   ├── index.ts
    │   ├── difficulty-button.ts
    │   ├── flickering-title.ts
    │   ├── high-scores-panel.ts
    │   └── spooky-background.ts
    └── tutorial/              # Tutorial UI
        └── tutorial-overlay.ts
```

---

## Recent Session Work (Dec 24, 2025)

### Architecture Simplification - COMPLETE
- [x] **Deleted command pattern** (5 files, ~350 lines) - undo/redo was never used
- [x] **Trimmed unused events** - Removed 15 event definitions with zero listeners
- [x] **Extracted BlessingIntegration** - Blessing UI coordination to `scenes/gameplay/`
- [x] **Extracted ui-setup.ts** - UI creation helpers (390 lines)
- [x] **Extracted DiceRenderer** - All dice visuals/animations (602 lines)
- [x] **Categories counter** - Always visible next to scorecard title

**Final file sizes:**
- GameplayScene.ts: 1456 → 1051 lines (-405)
- DiceManager.ts: 1227 → 865 lines (-362)
- commands/ directory: deleted (-350 lines)

### Blessing Simplification - COMPLETE
- [x] **Removed Foresight** - Too complex for time-pressure game (preview UX added cognitive load)
- [x] **Added Mercy** - Simple one-click hand reset (new dice + fresh rerolls)

**Design decision**: Foresight required multiple decisions per use (preview → accept/reject) which conflicts with the game's time pressure. Mercy is instant: click once, get a fresh start.

### Sanctuary Blessing - COMPLETE
- [x] Created `SanctuaryBlessing` class with bank/restore mechanics
- [x] Created `SanctuaryBlessingButton` UI with gold (bank) / green (restore) theme
- [x] Integrated with `BlessingIntegration` and `DiceManager`
- [x] Added `restoreFromSanctuary()` method to DiceManager
- [x] Fixed balance: must take action before restore, double-dip protection

**How it works**: BANK → BANKED (waiting) → BANKED (ready, green) → click to restore → SPENT

### Tutorial Polish
- [x] Fixed highlight flash animation
- [x] Added dark background to hint text
- [x] Fixed race condition during step transitions
- [x] Improved text for non-Yahtzee players
- [x] Layout-agnostic terminology

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
- **Gauntlet available**: Pulsing green (3 at a time)

### Panel Styling Pattern
1. Background (PALETTE.purple[700-900], high alpha)
2. Border stroke (PALETTE.purple[500])
3. Corner accents (4 L-shaped corners)
4. Shadow (offset rectangle, low alpha)

### Blessing Button Themes
- **Abundance**: Purple (expansion theme)
- **The Sixth**: Cyan/teal (mystical extra die)
- **Mercy**: Gold (divine intervention)
- **Sanctuary**: Gold → Green (bank → restore)

---

## Game Modes (Curses)

| Curse | Name | Mechanic |
|-------|------|----------|
| 1 | THE AWAKENING | Standard Yahtzee |
| 2 | SHACKLED DIE | Highest die becomes cursed |
| 3 | SEALED PATHS | 3 random categories locked |
| 4 | THE GAUNTLET | Only 3 categories available |

---

## Blessings Implementation Status

| Blessing | Status | Specialist Curse | Notes |
|----------|--------|------------------|-------|
| Abundance | ✅ Complete | Curse 3 | 4 bonus categories, pick 13 of 17 |
| Mercy | ✅ Complete | Curse 4 | Reset hand completely, 1 use per curse |
| Sanctuary | ✅ Complete | Curse 2 | Bank/restore dice, 1 use per curse |
| The Sixth | ✅ Complete | General | 6th die, 3 charges per curse |

**All 4 blessings are now implemented!**

### Blessing Balance Analysis

| Blessing | Curse 2 (Shackled) | Curse 3 (Sealed) | Curse 4 (Gauntlet) |
|----------|-------------------|------------------|-------------------|
| Abundance | Medium - more targets | **Strong** - 4 extra unlocked cats | Medium - more options |
| Mercy | Medium - escape bad locks | Medium - fresh start | **Strong** - escape dead hands |
| Sanctuary | **Strong** - preserve pre-curse dice | Medium - save good rolls | Medium - save good rolls |
| The Sixth | Good - 6th die helps everywhere | Good - more scoring options | Good - flexibility |

---

## Architectural Decisions Log

### 2024-12-24: Foresight → Mercy Replacement

**Problem**: Foresight blessing (preview next roll with accept/reject) added complexity:
- Required understanding the preview UI
- Added decision points during time pressure
- Felt like "more rerolls with extra steps"

**Solution**: Replaced with Mercy (single-click hand reset):
- Zero cognitive load
- Instant effect
- Clear use case: escape a dead hand

**Trade-off**: Lost the "skill expression" of Foresight, but gained accessibility and flow.

### 2024-12-24: Command Pattern Removal

**Problem**: Command pattern (undo/redo) was implemented but never used:
- Players don't expect undo in a time-pressure game
- Added ~350 lines of abstraction

**Solution**: Deleted entire `systems/commands/` directory. Scenes call manager methods directly.

**Trade-off**: Can't add undo later without re-implementing. Acceptable since design intent is no-undo.

### 2024-12-24: Per-Game Services Removal

**Problem**: Services like `scorecard`, `events`, `stateMachine` were registered but never retrieved via `Services.get()`.

**Solution**: Keep only truly global services (save, progression). Scene-local services are just private properties.

---

## Testing Session (Dec 24, 2025)

### Unit Testing - COMPLETE
- [x] **Set up Vitest** with path aliases and coverage support
- [x] **Fixed large straight bug** - `[1,2,3,4,4,5]` now correctly detects as large straight (deduplicate before checking)
- [x] **103 tests passing** across 3 test files:
  - `data/categories.test.ts` (45 tests) - All scoring functions
  - `systems/scorecard.test.ts` (24 tests) - Scoring, bonuses, completion, 6-dice selection
  - `systems/state-machine.test.ts` (34 tests) - Transitions, callbacks, pause/resume

### UI Fixes
- [x] **Fixed pause menu positioning** - Panel was offset (top-left at center instead of centered)
- [x] **Removed BasePanel abstraction** - Only had one consumer (PauseMenu), inlined the code

---

## Recent Session Work (Dec 25, 2025)

### Code Quality Fixes
- [x] **Fixed special category scoring duplication** - categories.ts and scorecard.ts had different implementations (sumAll vs fixed 45). Centralized to `SCORING.SPECIAL_CATEGORY` in config for balance tuning.
- [x] **Removed duplicate helper functions** - Deleted `isAllOdd`, `isAllEven`, `isAllHigh` from scorecard.ts (now uses inline logic matching categories.ts)

### Tutorial UI Improvements
- [x] **Fixed popup text overlap** - Increased popup height from 140px to 160px, adjusted layout so message doesn't overlap NEXT button
- [x] **Expanded dice highlight bounds** - New `getDiceAreaBounds()` method includes "Tap dice to lock" text and checkmark icons
- [x] **Fixed hint z-index** - "Tap the 1s to lock them!" hint now appears above gold pulse highlight (depth 1100 vs 1000)

### Tutorial Enhancements - COMPLETE
- [x] **Added section-specific header highlights** - New `TutorialHighlightableHeader` interface with `getCurseBounds()`, `getTimerBounds()`, `getTotalBounds()`
- [x] **New tutorial steps added**:
  - Curse counter explanation (header-curse highlight)
  - Timer explanation with "timer is off while you practice" note
  - Total score explanation (header-total highlight)
  - Categories counter (0/13) explanation
  - Numbers bonus (>=63) explanation
  - Pass threshold (250+) explanation
- [x] **Fixed highlight targets** - Updated from generic 'header' to 'header-curse', 'header-timer', 'header-total'

### UI Terminology Update
- [x] **Renamed "Upper/Lower" to "Numbers/Combos"** - Better terminology for 2-column mobile layout
  - Section headers in both layouts now show "NUMBERS" and "COMBOS"
  - Bonus progress shows "Numbers (X) >= 63" instead of "Upper (X) >= 63"
  - Tutorial text updated to reference "Numbers section"
  - Internal code identifiers remain 'upper'/'lower' for clarity

---

## Next Steps

### Polish
1. [ ] Performance profiling on mobile
2. [ ] Sound effects and haptic feedback refinement
3. [ ] Capacitor mobile deployment
