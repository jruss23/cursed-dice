# Cursed Dice - Development Progress & Architecture Review

## Last Updated: December 24, 2025

---

## Phaser 3 Best Practices Adherence Score

### **Overall Score: 9.2 / 10** (excluding Testing)

---

## Detailed Breakdown by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Project Structure** | 10/10 | Clean separation: `scenes/`, `systems/`, `ui/`, `data/`, `config/` |
| **TypeScript Integration** | 10/10 | Strict mode. Zero `any` types. Proper interfaces & types. Path aliases |
| **Scene Management** | 9/10 | Proper lifecycle. State machine controls flow. Missing BaseScene abstract |
| **Performance** | 9/10 | Tweens cleanup. Object pooling (ParticlePool). Logger utility |
| **Code Organization** | 9/10 | Event-driven. Service registry. Some incomplete patterns (see below) |
| **Asset Management** | 10/10 | Pre-processed audio. Proper preloading. Optimized sounds |
| **State Management** | 10/10 | GameStateMachine + Service Registry + Command pattern (partial) |
| **Input Handling** | 9/10 | Centralized InputManager. Keyboard bindings. Mobile touch ready |
| **Error Handling** | 9/10 | Global handlers. Logger utility. Services throw on missing deps |
| **Testing** | 0/10 | No test files. No testing framework configured |
| **Build & Deployment** | 9/10 | Vite. TypeScript. ESLint + Prettier. Path aliases |

---

## Architecture Patterns - Implementation Status

### Fully Implemented

| Pattern | Location | Notes |
|---------|----------|-------|
| **Service Registry** | `systems/services.ts` | Global + scene-scoped services with type-safe getters |
| **State Machine** | `systems/state-machine.ts` | Controls game flow: idle→rolling→selecting→scoring→game-over |
| **Event Bus** | `systems/game-events.ts` | Cross-component communication via typed events |
| **Layout Calculator** | `ui/scorecard/layout-calculator.ts` | Pure functions, no Phaser deps, returns LayoutConfig |
| **Data Layer** | `src/data/` | Static game data separated from logic (categories, modes, blessings) |
| **Singleton Managers** | Various | SaveManager, GameProgressionManager, BlessingManager |

### Partially Implemented

| Pattern | Status | Issue |
|---------|--------|-------|
| **Command Pattern** | ✅ 100% | All commands wired up: `ScoreCategoryCommand`, `RollDiceCommand`, `ToggleDiceLockCommand` |
| **Base UI Components** | 60% | `BasePanel` + `BaseButton` used by `PauseMenu`. Exception: `DebugPanel` (intentionally different styling) |
| **Object Pooling** | ✅ Sufficient | `ParticlePool` for score effects. Dice sprites are persistent (no pooling needed) |
| **BaseScene Abstract** | ✅ 100% | `BaseScene` class created. `MenuScene` and `GameplayScene` now extend it |

### Not Implemented

| Pattern | Priority | Description |
|---------|----------|-------------|
| **Observer Pattern** | N/A | Using EventBus instead - acceptable alternative |

### Recently Completed

| Pattern | Date | Notes |
|---------|------|-------|
| **RowStyleConfig Strategy** | Dec 23, 2025 | Mode-specific styling in LayoutConfig eliminates isTwoCol conditionals |

---

## Code Health Issues

### 1. ~~Command Pattern Incomplete~~ ✅ RESOLVED (Dec 23, 2025)
Dice commands (`RollDiceCommand`, `ToggleDiceLockCommand`) are now wired up via `DiceManager.executeRoll()` and Services.

### 2. ~~Scorecard isTwoCol Branches~~ ✅ RESOLVED (Dec 23, 2025)
**Problem**: Render methods had `isTwoCol` branches everywhere
**Solution**: Added `RowStyleConfig` to `LayoutConfig` with mode-specific values:
- `namePaddingLeft`, `labelPaddingLeft` - text positioning
- `scoreOriginX` - alignment (1=right for two-col, 0.5=center for single)
- `useShortNames` - whether to use abbreviated category names
- `showTotalDivider` - single-column only divider line
- `potentialOffsetFromRight`, `scoreOffsetFromRight` - score positioning

Render methods now use `layoutConfig.rowStyle` instead of conditional logic.
Removed 29 net lines while adding cleaner separation of concerns.

### 3. BasePanel Adoption (Low Priority) - Partially Resolved
**Panels using BasePanel**:
- ✅ `PauseMenu` (uses BasePanel + BaseButton)

**Panels NOT using BasePanel** (by design or complexity):
- `ScorecardPanel` (too complex, custom layout)
- `HeaderPanel` (simple, doesn't need it)
- `EndScreenOverlay` (custom animation needs)
- `BlessingChoicePanel` (custom card layout)
- `DebugPanel` (intentionally different styling - gold/orange debug theme)

**Note**: Not all panels need BasePanel. Use it for standard purple-themed modal panels.

### 4. ~~Missing BaseScene~~ ✅ RESOLVED (Dec 23, 2025)
`BaseScene` abstract class created and both `MenuScene` and `GameplayScene` now extend it.
Provides: registerShutdown(), fadeIn/fadeOut/transitionTo(), setupResizeListener(), getMetrics().

---

## Responsive Layout Strategy

### Current Approach
The scorecard uses a **Layout Calculator** pattern:
1. `calculateLayout()` returns complete `LayoutConfig` with all positions pre-computed
2. `buildContentUnified()` iterates `LayoutConfig.rows` array
3. Same render methods for both layouts, just different positions

### Architecture ✅ Complete
- ~~15+ sizing getters still in scorecard-panel.ts~~ ✅ RESOLVED
- ~~Row rendering has inline `isTwoCol` checks~~ ✅ RESOLVED via `RowStyleConfig`
- Font sizes, paddings, and styling all come from `LayoutConfig`
- Render methods are now pure: `renderRow(row)` reads `layoutConfig.rowStyle` with no conditionals

---

## Project Structure (Updated Dec 23, 2025)

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
│   ├── MenuScene.ts           # Main menu
│   ├── GameplayScene.ts       # Core gameplay (uses state machine)
│   └── TutorialScene.ts       # Interactive tutorial
├── systems/
│   ├── services.ts            # Service registry (DI container)
│   ├── state-machine.ts       # GameStateMachine
│   ├── game-events.ts         # Event emitter
│   ├── scorecard.ts           # Scoring logic
│   ├── dice-manager.ts        # Dice UI + logic
│   ├── audio-manager.ts       # Music/SFX
│   ├── game-progression.ts    # Mode progression
│   ├── mode-mechanics.ts      # Mode-specific rules
│   ├── save-manager.ts        # localStorage
│   ├── input-manager.ts       # Keyboard bindings
│   ├── logger.ts              # Dev/prod logging
│   ├── particle-pool.ts       # Object pool for particles
│   ├── debug-controller.ts    # Debug menu actions
│   ├── commands/              # Command pattern
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── command-invoker.ts
│   │   ├── dice-commands.ts   # NOT USED - wire up!
│   │   └── score-commands.ts  # Used for scoring
│   ├── blessings/             # Blessing system
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── blessing-manager.ts
│   │   ├── blessing-expansion.ts
│   │   └── blessing-sixth.ts
│   └── tutorial/              # Tutorial system
│       ├── index.ts
│       ├── interfaces.ts
│       └── tutorial-controller.ts
└── ui/
    ├── ui-utils.ts            # createText, createPanelFrame helpers
    ├── base/                  # Base UI components (adopt more!)
    │   ├── index.ts
    │   ├── base-panel.ts
    │   └── base-button.ts
    ├── scorecard-panel.ts     # Main scorecard (1232 lines - still large)
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
    │   └── sixth-blessing-button.ts
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

## Refactor TODO List

### ✅ Completed (Dec 23, 2025)
- [x] **Wire up dice commands** - RollDiceCommand and ToggleDiceLockCommand via DiceManager
- [x] **Move sizing to LayoutConfig** - All sizing now via `layoutConfig`
- [x] **Create BaseScene abstract class** - MenuScene and GameplayScene extend it
- [x] **RowStyleConfig strategy** - Eliminates isTwoCol conditionals in render methods
- [x] **Migrate PauseMenu to BasePanel** - Uses BasePanel + BaseButton
- [x] **Fix event leaks** - GameplayScene uses bound handlers with explicit cleanup
- [x] **Add destroy() methods** - StateMachine and CommandInvoker now have proper cleanup

### Low Priority (Remaining)
- [ ] **Extract ScorecardRenderer** - Would separate rendering from state/logic (~1000 lines still)
- [ ] **Add vitest + unit tests** - No testing framework yet

---

## Recent Session Work (Dec 24, 2025)

### Architecture Simplification
- [x] **Deleted command pattern** (5 files, ~350 lines) - undo/redo was never used
- [x] **Trimmed unused events** - Removed 15 event definitions with zero listeners
- [x] **Extracted BlessingIntegration** - Moved blessing UI/handlers to `src/scenes/gameplay/`
- [x] GameplayScene reduced from 1456 → 1272 lines (-184 lines)

**Files deleted:**
- `src/systems/commands/` directory (types.ts, command-invoker.ts, dice-commands.ts, score-commands.ts, index.ts)

**Files created:**
- `src/scenes/gameplay/blessing-integration.ts` (209 lines) - blessing UI coordination
- `src/scenes/gameplay/index.ts` - barrel export

**Remaining large files:**
- GameplayScene.ts: 1272 lines (target: <800)
- DiceManager.ts: 1227 lines (target: <800)
- ScorecardPanel.ts: 1037 lines (complex, may stay as-is)

### Foresight Blessing Implementation
- [x] Created `ForesightBlessing` class with 3 charges
- [x] Created `ForesightBlessingButton` UI with mystical purple theme
- [x] Created `ForesightPreviewPanel` showing ghost dice with accept/reject buttons
- [x] Integrated with `GameplayScene` (button position, handlers, cleanup)
- [x] Added foresight events to `GameEvents` interface
- [x] Marked foresight as `implemented: true` in blessings.ts

**How it works**: Click button → spend 1 reroll + 1 charge → see preview of next roll → accept (apply values) or reject (discard preview)

### Tutorial Polish & Bug Fixes
- [x] Fixed highlight flash animation (pulse was conflicting with fade-in tween)
- [x] Added dark background to hint text for readability on green dice area
- [x] Fixed race condition where user could roll during step transition delay
- [x] Improved tutorial text for non-Yahtzee players (clearer explanations)
- [x] Pre-fill number categories (1s-6s) before zero-out scenario
- [x] Layout-agnostic terminology (no more "upper/lower section")

### Testing Strategy
- [x] Created `TESTING.md` with comprehensive testing plan
- [x] Vitest + @vitest/coverage-v8 recommended
- [x] Testability analysis of all modules
- [x] Detailed test cases for scorecard, state-machine, commands, etc.
- [x] Coverage goals defined (85%+ overall, 95%+ for core logic)

### Misc Fixes
- [x] Fixed audio paths in `assets/audio-test.html`

---

## Previous Session Work (Dec 23, 2025)

### Scorecard Refactor
- [x] Deleted `scorecard-row.ts` (premature abstraction with duplicate state)
- [x] Created `layout-calculator.ts` for pure layout computation
- [x] Created `layout-config.ts` for layout types
- [x] Created `state-manager.ts` for UI state (hover, input lock, allowed categories)
- [x] Unified build methods: `buildContentUnified()` iterates `layoutConfig.rows`
- [x] Deleted ~680 lines of legacy duplicate code (was 1910, now 1232 lines)

### State Machine Fixes
- [x] Added `paused -> mode-transition` transition (quit from pause)
- [x] Removed `transitioning -> paused` (no timer during popups)

### Architecture Improvements
- [x] Service registry pattern implemented (`systems/services.ts`)
- [x] Command pattern infrastructure added (commands/)
- [x] `ScoreCategoryCommand` wired up in GameplayScene
- [x] Fixed overlay click-through (EndScreenOverlay.setInteractive)

---

## Previous Session Work (Dec 23, 2025 - Earlier)

### Tutorial System - Complete Implementation
- [x] Full interactive tutorial with 13 guided steps
- [x] Scripted dice rolls for consistent learning
- [x] Zero-out scenario teaches sacrificing categories
- [x] Practice mode after tutorial completion

### Tutorial Overlay System
- [x] Gold pulsing highlight border
- [x] Synchronized fade transitions
- [x] Graphics-based rendering

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

---

## Game Modes (Curses)

| Curse | Name | Mechanic |
|-------|------|----------|
| 1 | THE AWAKENING | Standard Yahtzee |
| 2 | SHACKLED DIE | Highest die becomes cursed |
| 3 | SEALED PATHS | 3 random categories locked |
| 4 | THE GAUNTLET | Only 3 categories available |

---

## Next Steps (Suggested Priority)

### Soon - Blessings
1. [x] Implement Foresight blessing (preview next roll) ✅ Dec 24, 2025
2. [ ] Implement Sanctuary blessing (bank/restore dice)

### Later - Polish
3. [ ] Add vitest + unit tests
4. [ ] Performance profiling on mobile
5. [ ] Sound effects and haptic feedback refinement
