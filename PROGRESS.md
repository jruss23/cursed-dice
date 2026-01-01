# Cursed Dice - Development Progress & Architecture Review

## Last Updated: January 1, 2026

---

## Phaser 3 Best Practices Adherence Score

### **Overall Score: 9.5 / 10** (Updated Dec 26, 2025 - All issues addressed)

---

## Detailed Breakdown by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Project Structure** | 10/10 | Clean separation: `scenes/`, `systems/`, `ui/`, `data/`, `config/` |
| **TypeScript Integration** | 10/10 | Strict mode. Zero `any` types. Proper interfaces & types. Path aliases |
| **Scene Management** | 10/10 | Proper lifecycle. State machine controls flow. BaseScene abstract class |
| **Configuration Management** | 10/10 | Zero magic numbers. Modular config files. Semantic color naming |
| **Code Organization** | 9/10 | Event-driven. UI/logic separation. Some files have cleanup gaps |
| **Asset Management** | 9/10 | Pre-processed audio. MP3+OGG fallbacks. Missing async error handling |
| **State Management** | 9/10 | GameStateMachine + Service Registry. Minor blessing cleanup issue |
| **Memory Management** | 9/10 | Good patterns, blessing cleanup fixed, buttons cascade properly |
| **Error Handling** | 9/10 | Async audio wrapped in try-catch, graceful degradation |
| **Testing** | 8/10 | Core logic tested (103 tests), manual testing for UI deemed sufficient |
| **Build & Deployment** | 9/10 | Vite. TypeScript. ESLint + Prettier. Path aliases |

---

## Honest Code Review (Dec 25, 2025)

### STRENGTHS - Where the Code Excels

**1. TypeScript Quality - EXCELLENT**
- Zero `any` types throughout entire codebase (74 files)
- Comprehensive interface definitions for all systems
- Type-safe event system (`GameEvents` interface maps all event names to payloads)
- Proper generic typing in service registry (`Services.get<T>()`)
- Safe type narrowing instead of unsafe coercions

**2. Architecture & Organization - EXCELLENT**
- Clear separation: Scene orchestrates → Systems handle logic → UI renders
- BaseScene pattern provides common lifecycle helpers
- Service registry pattern for dependency injection
- State machine properly encapsulates game flow with valid transitions
- Event-driven communication prevents tight coupling
- Object pooling implemented for particles (`particle-pool.ts`)

**3. Configuration Management - EXCELLENT**
- Zero magic numbers/strings - all constants centralized in `config/`
- Modular config: `theme.ts`, `sizes.ts`, `game-rules.ts`, `dev.ts`
- Semantic color naming (`PALETTE` raw values + `COLORS` for usage context)
- Responsive design helpers built into config (`getViewportMetrics`)
- Device pixel ratio handling in `createText()` helper

**4. Scene Cleanup - VERY GOOD**
- Comprehensive `destroy()` methods on most components
- `GameplayScene.onShutdown()` properly cleans up:
  - Timer events (lines 1002-1005)
  - Music manager disposal
  - SFX cancellation via `stopAllSFX()`
  - Delayed calls tracked and destroyed (lines 1016-1018)
  - Event listeners explicitly removed before emitter destruction
- Input manager stores bound callbacks for proper unbinding
- Tutorial controller removes all listeners on cleanup

### WEAKNESSES - Issues Addressed

**1. UI Button Cleanup Gap - RESOLVED (Low Risk)**
- **File**: `src/ui/ui-utils.ts`
- **Status**: `createButton()` used in overlays that destroy container (cascades to children)
- **Note**: `BaseButton` class has proper `destroy()` method for new code

**2. Blessing Instance Not Destroyed on Recreation - FIXED**
- **File**: `src/systems/blessings/blessing-manager.ts:88`
- **Fix**: Added `this.activeBlessing?.destroy?.();` before creating new instance

**3. Async Operations Lack Error Handling - FIXED**
- **File**: `src/scenes/GameplayScene.ts:332-339`
- **Fix**: `setupAudio()` now wrapped in try-catch, logs warning and continues

**4. Technical Debt TODO - LOW PRIORITY**
- **File**: `src/ui/scorecard-panel.ts:38`
- **Issue**: `TODO: Unify RowDisplayState interfaces before migrating`
- **Status**: Deferred - working code, cosmetic cleanup only

**5. Testing Coverage - REVIEWED**
- **Current**: 3 test files (103 tests) covering core logic
- **Decision**: Additional tests (DiceManager, BlessingManager, integration) deemed low value vs effort
- **Rationale**: Game is manually tested extensively, core scoring logic is tested

**6. DiceRenderer Event Cleanup - ACCEPTABLE**
- **Status**: Works correctly via `sprite.destroy()` cascade
- **Note**: Explicit removal not needed, Phaser handles cleanup

### Summary

| Area | Status |
|------|--------|
| TypeScript | ✅ Excellent - no issues |
| Architecture | ✅ Excellent - clean patterns |
| Config | ✅ Excellent - fully centralized |
| Cleanup (Scenes) | ✅ Very good - comprehensive |
| Cleanup (UI) | ✅ Fixed - blessing cleanup added, buttons cascade |
| Error Handling | ✅ Fixed - async audio wrapped in try-catch |
| Testing | ✅ Reviewed - core logic tested, manual testing for UI |

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

## iOS Safari Audio Fix (Dec 25, 2025)

### Problem
Audio wasn't playing on iOS Safari (iPhone). Game music worked on desktop Safari but failed silently on mobile.

### Root Cause
iOS Safari doesn't support OGG audio format at all. The game was loading `.ogg` files which Chrome/Firefox support, but Safari requires MP3.

### Solution (v1.1.4)
1. **Converted all OGG files to MP3** using ffmpeg:
   ```bash
   ffmpeg -i file.ogg -c:a libmp3lame -q:a 2 file.mp3
   ```

2. **Updated all audio loading to provide fallbacks**:
   ```typescript
   // Before (OGG only - fails on iOS)
   this.load.audio('menu-music', 'sounds/menu.ogg');

   // After (OGG + MP3 fallback)
   this.load.audio('menu-music', ['sounds/menu.ogg', 'sounds/menu.mp3']);
   ```

3. **Files updated**:
   - `audio-manager.ts` - SONGS config uses `string[]` for all tracks
   - `MenuScene.ts` - menu-music and preloadGameplayTracks
   - `TutorialScene.ts` - tutorial-music
   - `GameplayScene.ts` - warning-sound

4. **Audio files with both formats**:
   - `chill.ogg` / `chill.mp3` (gameplay + tutorial)
   - `normal.ogg` / `normal.mp3` (gameplay)
   - `intense.ogg` / `intense.mp3` (gameplay)
   - `menu.ogg` / `menu.mp3` (menu music)
   - `siren_warning.ogg` / `siren_warning.mp3` (low time warning)

### Why Keep Both Formats?
- **OGG**: Better compression, preferred by Chrome/Firefox
- **MP3**: Required for Safari/iOS compatibility
- Phaser automatically picks the first supported format

### Version History
- v1.1.1: First audio unlock attempt (sound.locked check)
- v1.1.2: Changed to context.resume() approach
- v1.1.3: Added MP3 fallback for main gameplay tracks
- v1.1.4: Complete MP3 fallback coverage (tutorial + warning sound)
- v1.1.5: MP3 first in load order, OGG excluded from web build (vite plugin)

---

## Text Sharpness Investigation (Dec 25, 2025)

### Problem
Text looked great at DPR 2 (Retina Mac) but degraded at DPR 3 (iPhone Pro).

### Current Implementation
Using Phaser's text resolution fix:
```typescript
text.setResolution(window.devicePixelRatio * 2);
```

### Investigation
Created `text-sharpness-test.html` comparing:
- Row 1: Current implementation (resolution = DPR × 2 + padding)
- Row 2: Fixed 4× supersampling (resolution = 4, regardless of DPR)

### Findings
- DPR 1 and 2 look good with current approach
- DPR 3 shows degradation
- Fixed 4× supersampling provides consistent quality but higher memory usage
- MSDF (Multi-channel Signed Distance Field) fonts would be ideal but require pre-generated atlas

### Status
Monitoring for now. If DPR 3 quality complaints arise, consider:
1. Fixed 4× resolution for all text
2. MSDF font implementation (requires tooling setup)

---

## Recent Session Work (Dec 27, 2025)

### Responsive Layout Refactoring - COMPLETE
- [x] **Removed dead `isMobile` code** - Game locked to 430px width via CSS, so `isMobile` always true
- [x] **Removed desktop code paths** from: blessing-choice-panel, end-screen-overlay, header-panel, debug-panel, tutorial-debug-panel
- [x] **Simplified config** - Removed `_MOBILE`/`_DESKTOP` suffix pattern, single values now

### BlessingButtonBase Extraction - COMPLETE
- [x] **Created abstract base class** `src/ui/gameplay/blessing-button-base.ts`
- [x] **Reduced duplication** - mercy-blessing-button (150→81 lines), sixth-blessing-button, sanctuary-blessing-button all extend base
- [x] **Shared methods** - `createButtonBase()`, `setAvailableState()`, `setSpentState()`, `show()`, `hide()`, `destroy()`

### PANEL_PRESETS Addition - COMPLETE
- [x] **Added to ui-utils.ts** - `modal`, `subtle`, `overlay` presets for consistent panel styling
- [x] **Updated panels** - pause-menu, menu-settings-panel, tutorial-complete-overlay now use presets

### Scorecard Layout Improvements - COMPLETE
- [x] **Separated internal/external padding** - New `INTERNAL_BOTTOM_PADDING` (10px) vs external `BOTTOM_PADDING` (45px)
- [x] **Removed dead space** below "TOTAL (250+ to pass)" text
- [x] **Added tip.GAP** (18px) - Space between "Tap dice to lock" and dice for new content

### Dice Icon Improvements - COMPLETE
- [x] **Bigger checkmarks** - Increased from size 6 to 9, stroke 3 to 4
- [x] **Fixed checkmark proportions** - Y coordinates now relative to checkSize
- [x] **Bigger skull icon** - Matched checkmark size (skullSize = 9 * iconScale)
- [x] **Lowered icons** - Added 2px offset down
- [x] **Increased icon spacing** - GAP_BASE 12→14, HEIGHT_BASE 10→16

### Tutorial Highlight Fixes - COMPLETE
- [x] **Taller header highlights** - Reduced SECTION_PADDING from 8 to 2
- [x] **Tighter seal counter bounds** - Reduced width by 12px, re-centered
- [x] **Tighter total score bounds** - Reduced width by 6px
- [x] **Fixed categories counter (0/13)** - Adjusted x offset and width
- [x] **Fixed dice area bounds** - layoutTipOffset now calculated from actual layout positions

### Config Constant Additions
- `LAYOUT.gameplay.SCORECARD_RIGHT_MARGIN` (15) - Landscape scorecard margin
- `LAYOUT.scorecard.INTERNAL_BOTTOM_PADDING` (10) - Inside panel padding
- `LAYOUT.scorecard.INTERNAL_BOTTOM_PADDING_COMPACT` (6)
- `LAYOUT.tip.GAP` increased to 18 - Space for new content above dice

### Current Version: v1.1.17

---

## Recent Session Work (Jan 1, 2026)

### DPR Scaling Fixes - COMPLETE
- [x] **Comprehensive stroke width audit** - All `setStrokeStyle()` and `lineStyle()` calls now use `toDPR()`
- [x] **79 total DPR fixes** across 20+ files including:
  - Menu components (settings-panel, spooky-background, high-scores-panel, difficulty-button)
  - Blessing panels and buttons (blessing-choice-panel, blessing-button-base, sanctuary, sixth)
  - Scorecard panel (stroke widths, lineStyles, column borders)
  - Tutorial overlays (tutorial-overlay, tutorial-debug-panel, tutorial-complete-overlay)
  - Gameplay UI (ui-setup, end-screen-overlay, debug-panel, dice-controls)
  - Dice renderer (SIZES.DICE_BORDER_WIDTH now wrapped in toDPR)
  - Scene files (MenuScene, TutorialScene, GameplayScene)
- [x] **SIZES constants now DPR-wrapped** - PANEL_BORDER_WIDTH, DICE_BORDER_WIDTH, GLOW_STROKE_MEDIUM

### Sanctuary Blessing Bug Fix - COMPLETE
- [x] **Fixed cursed die unlock on restore** - Sanctuary's `restoreFromSanctuary()` was unlocking ALL dice including cursed die
- [x] **Fix**: `this.state.locked[i] = (i === this.state.cursedIndex)` - Cursed die stays locked on restore

### Victory Celebration Enhancement
- [x] **Doubled fireworks duration** - `FIREWORK_COUNT: 12 → 24` (same firing rate, twice as long)

### Capacitor Mobile Builds - First Commit
- [x] **iOS and Android build files committed** - Capacitor setup from Dec 28 now tracked in git
- See "Capacitor Mobile Deployment (Dec 28, 2025)" section below for full setup details

---

## Recent Session Work (Dec 28, 2025)

### Audio Processing Overhaul - COMPLETE
- [x] **Pitch-shifted gameplay tracks** - All tracks shifted down 1 octave using `rubberband=pitch=0.5`
- [x] **Removed Beware track** - Didn't fit the vibe, simplified to Keep + Battling only
- [x] **New track structure**:
  - CHILL: 3 min Keep + 1 min Battling = 4:00 total
  - NORMAL: 2 min Keep + 1 min Battling = 3:00 total
  - INTENSE: 1 min Keep + 1 min Battling = 2:00 total
- [x] **Crossfade stitching** - 2-second triangular crossfade between Keep and Battling segments
- [x] **Volume balancing** - Gameplay tracks at 0.60x, Menu at 1.25x
- [x] **Reduced bitrate** - 96kbps (no audible difference from 192kbps on mobile)
- [x] **Stripped embedded artwork** - Removed PNG album art that was bloating file sizes

### Build Size Optimization
- **Before**: 16M (192kbps audio)
- **After**: 9.5M (96kbps audio, stripped artwork)
- **Audio breakdown**:
  - chill.mp3: 2.7M (4:00)
  - normal.mp3: 2.1M (3:00)
  - intense.mp3: 1.4M (2:00)
  - menu.mp3: 865K (1:14)
  - siren_warning.mp3: 19K

### Music Test Page - COMPLETE
- [x] **Created `music-test.html`** - Dev tool for audio comparison
- [x] **Bitrate selector** - Compare 192/128/96 kbps versions
- [x] **Volume balancing controls** - Separate sliders for gameplay vs menu tracks
- [x] **Skip controls** - +10s/-10s for quick navigation
- [x] **Track type labels** - Shows [gameplay] or [menu] for volume slider context

### Audio Processing Notes
```bash
# Pitch shift (1 octave down, no tempo change)
ffmpeg -i input.mp3 -af "rubberband=pitch=0.5:pitchq=quality" -b:a 96k output.mp3

# Crossfade stitch
ffmpeg -i keep.mp3 -i battling.mp3 -filter_complex "acrossfade=d=2:c1=tri:c2=tri" -b:a 96k output.mp3

# Volume adjustment
ffmpeg -i input.mp3 -af "volume=0.60" -b:a 96k output.mp3

# Strip artwork
ffmpeg -i input.mp3 -vn -c:a copy output.mp3
```

---

## Recent Session Work (Dec 27, 2025)

### Audio System Improvements - COMPLETE
- [x] **Music toggle now mutes/unmutes** - Keeps track playing at volume 0 to maintain timing sync with stitched song transitions
- [x] **SFX toggle respects warning siren** - Added `isSFXEnabled()` check to `playWarningSound()`
- [x] **Menu/Tutorial music respects setting** - Added `isMusicEnabled()` helper, both scenes start muted if disabled
- [x] **Exported `isMusicEnabled()`** - For scenes not using MusicManager

### Menu Settings Overlay - COMPLETE
- [x] **Cog button in bottom-right** - Opens settings overlay on click
- [x] **Settings overlay matches pause menu** - Same panel styling, animations
- [x] **MUSIC ON/OFF toggle** - Immediately mutes/unmutes menu music
- [x] **SFX ON/OFF toggle** - Same as pause menu
- [x] **CLOSE button** - Red (danger) style, click overlay to dismiss

### Pause Menu Polish - COMPLETE
- [x] **Changed QUIT TO MENU → QUIT** - Cleaner label
- [x] **Audio toggles use secondary style** - Purple ON, ghost OFF (not green like Resume)
- [x] **Visual hierarchy** - Resume (green) > Quit (red) > Audio toggles (purple/ghost)

### Game Size Review - COMPLETE
- **Total build**: 11 MB (mostly music)
- **JS bundle**: 1.4 MB / 389 KB gzipped
- **Initial load**: ~1.1 MB (menu music + JS)
- **Lazy loading**: Game tracks load on-demand ✓
- **Verdict**: Well optimized for a Phaser game

### Magic Color Extraction - COMPLETE
Extracted all hardcoded hex colors to `PALETTE` in `config/theme.ts`:

| New PALETTE Section | Purpose |
|---------------------|---------|
| `PALETTE.blue` | Normal difficulty colors (was hardcoded 0x55aaff, 0x2a3a5a) |
| `PALETTE.spooky` | Menu atmospheric effects (eyes, candles, fog, floating dice, ghosts) |
| `PALETTE.menu` | Learn to Play button colors |
| `PALETTE.gameplay` | Background gradient corners and ambient particles |

**Files updated to use PALETTE:**
- `spooky-background.ts` - ~30 hardcoded colors → `PALETTE.spooky.*`
- `MenuScene.ts` - Play button + vignette → `PALETTE.menu.*`, `PALETTE.black`
- `gameplay/ui-setup.ts` - Background gradient → `PALETTE.gameplay.*`
- `dice-renderer.ts` - Shadow, shine, pips → `PALETTE.black`, `PALETTE.white`
- `difficulty-button.ts` - Glow, highlight → `PALETTE.black`, `PALETTE.white`
- `difficulties.ts` - Normal difficulty → `PALETTE.blue[400/600]`
- `base-button.ts` - Ghost style bg → `PALETTE.black`
- `TutorialScene.ts` - Background gradient → `PALETTE.gameplay.*`
- `BaseScene.ts` - Transition overlay → `PALETTE.black`
- `particle-pool.ts` - Particle color → `PALETTE.white`

**Result:** All hex colors now live in `theme.ts` only - single source of truth.

### Tutorial Complete Overlay - IMPROVED
- [x] **Centered score in divided space** - Score was too high when no subtext present
- [x] **Calculated section center** - `(DIVIDER_1_Y + DIVIDER_2_Y) / 2` for proper centering

### Code Cleanup
- [x] **Fixed ESLint warning** - Removed unused `e` variable in catch block (`music-manager.ts`)
- [x] **Zero lint warnings** - Clean ESLint pass

### Current Version: v1.1.13

---

## Capacitor Mobile Deployment (Dec 28, 2025)

### iOS Deployment - COMPLETE ✅

**Setup:**
- Capacitor 8 with `@capacitor/ios`, `@capacitor/splash-screen`, `@capacitor/status-bar`
- `@capacitor-community/safe-area@8.0.1` for safe area support
- App ID: `com.jruss.curseddice`

**Safe Area Handling:**
- `contentInset: 'never'` in Capacitor config (edge-to-edge web view)
- CSS `env(safe-area-inset-*)` positions game container within safe areas
- Native window background set to `#0a0a1a` in `AppDelegate.swift` for purple bars in unsafe areas

**Key Fixes:**
1. **Touch offset issue** - Fixed by using `contentInset: 'never'` + CSS safe area positioning
2. **Settings cog missing on initial load** - Fixed with `this.scale.refresh()` after splash hides
3. **Horizontal stretching on first load** - Fixed by waiting for Phaser's resize event before creating UI

**MenuScene Timing Fix:**
```typescript
// Wait for dimensions to stabilize before creating UI
this.scale.once('resize', () => {
  requestAnimationFrame(() => {
    this.scale.refresh();
    this.createUI();
  });
});
this.time.delayedCall(150, createUIOnce); // Fallback
SplashScreen.hide();
```

**Files Modified:**
- `capacitor.config.ts` - Core Capacitor config
- `index.html` - CSS safe area positioning
- `ios/App/App/AppDelegate.swift` - Native window background color
- `src/scenes/MenuScene.ts` - Splash screen + resize timing
- `src/config/dev.ts` - `IS_DEVELOPMENT: true` for iOS testing (revert before release)

### Android Deployment - COMPLETE ✅

**Setup:**
- Capacitor 8 with `@capacitor/android`
- App ID: `com.jruss.curseddice`
- Uses Android Studio's bundled JDK (Java 21)

**Environment Configuration:**
- `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- `JAVA_TOOL_OPTIONS="-Djava.net.preferIPv4Stack=true"` (required for Gradle networking)

**Key Fixes:**
1. **Java version mismatch** - System Java 25 incompatible with Android Gradle plugin, switched to Android Studio's bundled JDK 21
2. **Hostname resolution** - Added hostname to `/etc/hosts` for proper Java networking
3. **IPv4 preference** - Set `preferIPv4Stack=true` to fix Gradle dependency downloads

**Build Script:** `/Users/joe/Documents/cursed-dice/android/build-android.sh`
```bash
#!/bin/bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
export JAVA_TOOL_OPTIONS="-Djava.net.preferIPv4Stack=true"
cd "$(dirname "$0")"
./gradlew "$@"
```

**Build Output:**
- APK: `android/app/build/outputs/apk/debug/app-debug.apk` (12MB)
- Build time: ~1m 47s

**Files Modified:**
- `android/app/src/main/res/values/colors.xml` - Dark theme colors (#0a0a1a)
- `android/gradle.properties` - JVM args for IPv4 preference
- `~/.gradle/gradle.properties` - Global Gradle settings

---

## Recent Session Work (Dec 28, 2025 - Evening)

### Tutorial Choice Dialog - COMPLETE
- [x] **Added returning user dialog** - When tutorial is completed, clicking "Learn to Play" shows choice:
  - "PRACTICE" (green) - Skips tutorial, goes to free play
  - "FULL TUTORIAL" (purple) - Full tutorial walkthrough
- [x] **Uses shared UI helpers** - `createPanelFrame()`, `createButton()`, `PANEL_PRESETS.modal`
- [x] **Click backdrop to dismiss** - Standard modal pattern
- [x] **Button flash effects** - Green flash for Practice, purple flash for Full Tutorial
- [x] **Save manager integration** - `hasTutorialCompleted()` / `setTutorialCompleted()` flags

### Tutorial Popup Fixes - COMPLETE
- [x] **Fixed "The Scorecard" popup** - Added `tallPopup` flag for longer messages (160→190px height)
- [x] **Dynamic corner accents** - Corner graphics now redraw when popup resizes
- [x] **Added to TutorialStepConfig interface** - `tallPopup?: boolean` option

### PANEL Config Constants - COMPLETE
- [x] **Added `PANEL` to theme.ts** - Centralized panel styling values:
  - Glow size/color/alpha
  - Background color/alpha
  - Border width/color/alpha
  - Corner inset/length/thickness/color/alpha
  - Backdrop color/alpha for modals
- [x] **Exported from config.ts** - Available via `import { PANEL } from '@/config'`

### End Screen Preview Box Fix - COMPLETE
- [x] **Increased preview box height** - `PREVIEW_BOX_HEIGHT: 58 → 70` in sizes.ts
- [x] **Fixed "NEXT:" section padding** - Bottom text no longer touches edge of red box

### Capacitor Config Fix - COMPLETE
- [x] **Fixed duplicate plugins object** - capacitor.config.ts had two `plugins` keys (second overwrote first)
- [x] **Merged SafeArea config** - Now properly inside single plugins object

### Android Gradle Performance - IN PROGRESS
- [x] **Added performance settings to gradle.properties**:
  - `org.gradle.daemon=true` - Keep daemon running
  - `org.gradle.parallel=true` - Build in parallel
  - `org.gradle.configureondemand=true` - Only configure needed projects
  - `org.gradle.caching=true` - Build cache
  - `org.gradle.configuration-cache=true` - Skip config phase when unchanged (saves ~5 min!)
  - Timeout settings for network calls
- [x] **Fixed @capacitor/cli** - Was missing, reinstalled as devDependency
- [ ] **Offline mode** - Enabled in Android Studio but still downloading (180s files download)

### Files Modified
- `src/config/theme.ts` - Added `PANEL` constants
- `src/config.ts` - Export `PANEL`
- `src/config/sizes.ts` - `PREVIEW_BOX_HEIGHT: 70`
- `src/scenes/MenuScene.ts` - Tutorial choice dialog with shared helpers
- `src/systems/save-manager.ts` - `tutorialCompleted` flag + methods
- `src/systems/tutorial/interfaces.ts` - `tallPopup` option
- `src/systems/tutorial/tutorial-controller.ts` - `tallPopup: true` on scorecard-intro
- `src/ui/tutorial/tutorial-overlay.ts` - Dynamic corner accent repositioning
- `capacitor.config.ts` - Fixed duplicate plugins object
- `android/gradle.properties` - Performance optimizations

---

## Next Steps

### Polish
1. [ ] Performance profiling on mobile
2. [x] ~~Sound effects and haptic feedback refinement~~ - Audio toggles complete
3. [x] ~~iOS Capacitor deployment~~ - Complete
4. [x] ~~Android Capacitor deployment~~ - Complete
5. [ ] DPR 3 text sharpness solution (if needed)
6. [ ] Android build performance investigation (still slow despite caching)

### Pre-Release
1. [ ] Replace gameplay music with original/royalty-free tracks (current tracks are pitch-shifted - copyright concern)
2. [ ] Set `IS_DEVELOPMENT: false` in `src/config/dev.ts`
3. [ ] Generate signed release builds for both platforms
