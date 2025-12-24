# Cursed Dice - Development Progress & Architecture Review

## Last Updated: December 23, 2025

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
| **Strategy Pattern** | P3 | Would improve responsive layout code (row renderers) |
| **Observer Pattern** | N/A | Using EventBus instead - acceptable alternative |

---

## Code Health Issues

### 1. ~~Command Pattern Incomplete~~ ✅ RESOLVED (Dec 23, 2025)
Dice commands (`RollDiceCommand`, `ToggleDiceLockCommand`) are now wired up via `DiceManager.executeRoll()` and Services.

### 2. Scorecard Still Complex (Medium Priority)
**Problem**: `scorecard-panel.ts` is ~1000 lines despite layout-calculator refactor and sizing getter removal
**Root Cause**:
- ~~Sizing getters still inline~~ ✅ RESOLVED - All sizing now via `layoutConfig`
- Render methods have `isTwoCol` branches throughout
- State and rendering coupled

**Fix Options**:
1. ~~Move ALL sizing into `layout-calculator.ts`~~ ✅ DONE
2. Extract `ScorecardRenderer` class that takes LayoutConfig
3. Use Strategy pattern: `TwoColumnRenderer` vs `SingleColumnRenderer`

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

### Remaining Complexity
- ~~15+ sizing getters still in scorecard-panel.ts~~ ✅ RESOLVED
- Font sizes and paddings now come from LayoutConfig
- Row rendering has inline `isTwoCol` checks (could use Strategy pattern)

### Recommended Improvement
Move ALL styling/sizing into LayoutConfig:
```typescript
// layout-config.ts additions
interface LayoutConfig {
  // ...existing...
  styles: {
    nameTextPadding: number;
    scoreTextAlign: 'left' | 'center' | 'right';
    potentialTextX: number;
    // etc.
  }
}
```

Then render methods become pure: `renderRow(row, styles)` with no conditionals.

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

### High Priority
- [ ] **Wire up dice commands** - RollDiceCommand and ToggleDiceLockCommand exist but unused
- [ ] **Move sizing to LayoutConfig** - Eliminate inline getters from scorecard-panel.ts

### Medium Priority
- [ ] **Migrate panels to BasePanel** - Start with simpler panels (PauseMenu, DebugPanel)
- [ ] **Extract ScorecardRenderer** - Separate rendering from state/logic

### Low Priority
- [ ] **Create BaseScene abstract class** - Reduce scene duplication
- [ ] **Strategy pattern for row rendering** - TwoColumnRowRenderer vs SingleColumnRowRenderer
- [ ] **Object pooling for dice** - Currently re-created on scene restart

---

## Recent Session Work (Dec 23, 2025)

### Scorecard Mega-Refactor
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

### Immediate - Code Quality
1. [ ] Wire up dice commands (RollDiceCommand, ToggleDiceLockCommand)
2. [ ] Move all sizing getters into LayoutConfig

### Soon - Blessings
3. [ ] Implement Foresight blessing (preview next roll)
4. [ ] Implement Sanctuary blessing (bank/restore dice)

### Later - Architecture
5. [ ] Create BaseScene abstract class
6. [ ] Migrate panels to BasePanel
7. [ ] Add vitest + unit tests
