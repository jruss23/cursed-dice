# Cursed Dice - Development Progress & Architecture Review

## Last Updated: December 24, 2025

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
| **Testing** | 0/10 | No test files. No testing framework configured |
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

### Architecture Philosophy
- **Pure logic is testable**: scorecard, categories, state-machine have no Phaser deps
- **UI is cohesive**: rendering code stays together (not split for the sake of splitting)
- **Scenes orchestrate**: GameplayScene wires systems together, doesn't own all logic

---

## File Size Targets

| File | Current | Target | Status |
|------|---------|--------|--------|
| GameplayScene.ts | 1051 | <1200 | ✅ Acceptable |
| DiceManager.ts | 777 | <800 | ✅ Under target |
| ScorecardPanel.ts | ~1000 | N/A | ✅ Complex but cohesive |

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
│   ├── GameplayScene.ts       # Core gameplay (1051 lines)
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
│   ├── dice-manager.ts        # Dice state + logic (777 lines)
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
│   │   ├── blessing-expansion.ts
│   │   ├── blessing-sixth.ts
│   │   └── blessing-foresight.ts
│   └── tutorial/              # Tutorial system
│       ├── index.ts
│       ├── interfaces.ts
│       └── tutorial-controller.ts
└── ui/
    ├── ui-utils.ts            # createText, createPanelFrame helpers
    ├── base/                  # Base UI components
    │   ├── index.ts
    │   ├── base-panel.ts
    │   └── base-button.ts
    ├── scorecard-panel.ts     # Main scorecard (~1000 lines)
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
    │   ├── foresight-blessing-button.ts
    │   └── foresight-preview-panel.ts
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
- DiceManager.ts: 1227 → 777 lines (-450)
- commands/ directory: deleted (-350 lines)

### Foresight Blessing - COMPLETE
- [x] Created `ForesightBlessing` class with 3 charges
- [x] Created `ForesightBlessingButton` UI with mystical purple theme
- [x] Created `ForesightPreviewPanel` showing ghost dice with accept/reject
- [x] Integrated with `GameplayScene` via `BlessingIntegration`

**How it works**: Click button → spend 1 reroll + 1 charge → see preview → accept or reject

### Sanctuary Blessing - COMPLETE
- [x] Created `SanctuaryBlessing` class with bank/restore mechanics
- [x] Created `SanctuaryBlessingButton` UI with gold (bank) / green (restore) theme
- [x] Integrated with `BlessingIntegration` and `DiceManager`
- [x] Added `restoreFromSanctuary()` method to DiceManager

**How it works**: Click BANK to save current dice → button changes to RESTORE → click RESTORE to get banked dice back with fresh rerolls

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

| Blessing | Status | Notes |
|----------|--------|-------|
| Abundance | ✅ Complete | 4 bonus categories, pick 13 of 17 |
| Foresight | ✅ Complete | Preview next roll, 3 charges |
| Sanctuary | ✅ Complete | Bank/restore dice, 1 use, gold/green theme |
| The Sixth | ✅ Complete | 6th die, 3 charges |

**All 4 blessings are now implemented!**

---

## Next Steps

### Polish
1. [ ] Add vitest + unit tests for pure logic modules
2. [ ] Performance profiling on mobile
3. [ ] Sound effects and haptic feedback refinement
