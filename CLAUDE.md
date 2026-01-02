# Claude Code Guidelines for Cursed Dice

## Session Start (MANDATORY)

**On first message of a new conversation (no prior messages):**

1. Check `.claude/plans/` for any `.md` files
2. If none → proceed with my request normally
3. If found → list them:
   ```
   📋 Found active plan(s):
   1. [filename] - [first line of file]
   2. Skip - start fresh
   
   Which should I load?
   ```
4. After selection → read full plan, summarize where we left off, then proceed

**Do not skip this check.**

---

## Project Overview

Phaser 3 + TypeScript dice game wrapped in Ionic Capacitor for iOS/Android.

**Scenes:** MenuScene, GameplayScene, TutorialScene  
**Current state:** Feature-complete, pre-release polish phase  
**Roadmap:** See README.md under '🔮 Roadmap' section

---

## Before Creating New Code (MANDATORY)

### Check existing helpers first

Before creating ANY utility function, UI helper, or reusable code:

1. **Search these locations:**
   ```bash
   grep -rn "keyword" src/ui/ui-utils.ts src/config/ src/ui/base/
   ```

2. **Check the helper table below**

3. **If similar code exists** → extend it, don't duplicate

4. **If creating new utility** → ask: "Should this go in ui-utils.ts or a shared location?"

---

## Maintaining This File

When creating new shared helpers, utilities, or config constants:
1. Update the relevant table in this file (Available Helpers, Config Locations, or Event Names)
2. Include the function signature and brief description
3. If adding a new event, document its payload type

When deleting or renaming helpers:
1. Remove or update the corresponding table entry

**Do not create shared utilities without updating this documentation.**

---

### Available Helpers (ALWAYS USE)

#### Text & UI Creation (`ui/ui-utils.ts`)

| Helper | Signature | Description |
|--------|-----------|-------------|
| `createText()` | `(scene, x, y, content, style) → Text` | Retina-safe text creation. **Always use instead of scene.add.text()** |
| `createPanelFrame()` | `(scene, config: PanelFrameConfig) → PanelFrameResult` | Panel with glow, background, border, corner accents |
| `addPanelFrameToContainer()` | `(container, frame) → void` | Add all panel elements to a container |
| `createButton()` | `(scene, config: ButtonConfig) → ButtonResult` | Styled button with hover effects. Returns `{ container, destroy }` |
| `PANEL_PRESETS` | `{ default, modal, subtle, overlay }` | Spread into createPanelFrame config |

#### Color Utilities (`ui/ui-utils.ts`)

| Helper | Signature | Description |
|--------|-----------|-------------|
| `hexToColorString()` | `(hex: number) → string` | Convert hex number to CSS string `#rrggbb` |
| `darkenColor()` | `(hex, factor=0.5) → number` | Create darker version of a color |
| `hexToRgb()` | `(hex: number) → {r, g, b}` | Extract RGB components from hex |
| `createColorTween()` | `(scene, from, to, options) → Tween` | Animate between two colors |

#### Button Class (`ui/base/base-button.ts`)

| Class | Methods | Description |
|-------|---------|-------------|
| `BaseButton` | `setDisabled()`, `setLabel()`, `setVisible()`, `pulse()`, `setStyle()`, `destroy()` | Reusable button with disabled state, style switching |

#### DPR Scaling (`systems/responsive.ts`)

| Helper | Signature | Description |
|--------|-----------|-------------|
| `toDPR()` | `(cssValue: number) → number` | Scale CSS pixels to device pixels. **Use for all stroke widths, padding, etc.** |
| `DPR` | `const` | Current device pixel ratio |
| `getViewportMetrics()` | `(scene) → ViewportMetrics` | Get viewport dimensions and safe areas |
| `getGameplayLayout()` | `(scene) → GameplayLayout` | Complete gameplay positioning (dice, header, scorecard, controls) |
| `getMenuSizing()` | `(scene) → ViewportSizing` | Menu button positions and sizes |
| `scaleValue()` | `(value, min, max, factor) → number` | Scale a value within bounds |

### Config Locations (NEVER HARDCODE)

| What | Location | Constants |
|------|----------|-----------|
| Colors | `config/theme.ts` | `PALETTE.*` (raw hex), `COLORS.*` (semantic) |
| Flash effects | `config/theme.ts` | `FLASH.GREEN`, `FLASH.RED`, `FLASH.GOLD`, `FLASH.PURPLE` |
| Alpha values | `config/theme.ts` | `ALPHA.GLOW_*`, `ALPHA.PANEL_*`, `ALPHA.BORDER_*` |
| Scale values | `config/theme.ts` | `SCALE.CLICK`, `SCALE.HOVER`, `SCALE.PULSE_*` |
| Fonts | `config/theme.ts` | `FONTS.SIZE_*`, `FONTS.FAMILY` |
| Panel styling | `config/theme.ts` | `PANEL.*` |
| Sizes/spacing | `config/sizes.ts` | `SIZES.*`, `TIMING.*`, `LAYOUT.*`, `DEPTH.*` |
| Celebration | `config/sizes.ts` | `CELEBRATION.*`, `END_SCREEN.*` |
| Game rules | `config/game-rules.ts` | `GAME_RULES.*`, `SCORING.*` |
| Dev flags | `config/dev.ts` | `DEV.DEBUG_*` flags |
| Responsive | `config/index.ts` | `RESPONSIVE.*`, `BREAKPOINTS.*` |

### Event Names (`systems/game-events.ts`)

| Event | Payload | Description |
|-------|---------|-------------|
| `dice:rolled` | `{ values, isInitial, sixthDieActive? }` | Dice roll completed |
| `dice:locked` | `{ index, locked }` | Single die lock toggled |
| `dice:unlockAll` | `void` | All dice unlocked |
| `score:category` | `{ categoryId, dice }` | Category selected for scoring |
| `score:updated` | `{ categoryId, score, total }` | Score recorded |
| `score:complete` | `{ total, timeRemaining }` | All categories filled |
| `timer:tick` | `{ remaining, formatted }` | Timer update |
| `game:end` | `{ completed, score }` | Game ended |
| `ui:categoryHover` | `{ categoryId \| null }` | Category hover state |
| `ui:menuRequested` | `void` | Pause menu requested |
| `blessing:expansion:enable` | `void` | Expansion blessing activated |
| `blessing:sixth:activated` | `{ chargesRemaining }` | 6th die blessing used |
| `blessing:sixth:deactivated` | `void` | 6th die deactivated |
| `blessing:sixth:reset` | `{ charges }` | 6th die charges reset |
| `blessing:mercy:used` | `{}` | Mercy blessing used |
| `blessing:mercy:reset` | `{ used }` | Mercy reset for new turn |
| `blessing:sanctuary:banked` | `{ values, locked }` | Dice state banked |
| `blessing:sanctuary:restored` | `{ values, locked }` | Dice state restored |
| `blessing:sanctuary:reset` | `{ canBank, canRestore, bankedDice }` | Sanctuary state reset |
| `mode:gauntlet` | `boolean` | Gauntlet mode active |
| `mode:lockedCategories` | `Set<CategoryId>` | Categories locked by mode |

---

## Code Conventions

### Text Creation
**Always use `createText()`** — never `scene.add.text()` directly:

```typescript
import { createText } from '@/ui/ui-utils';

// Good
const label = createText(this, x, y, 'Hello', {
  fontSize: FONTS.SIZE_BODY,
  fontFamily: FONTS.FAMILY,
  color: COLORS.TEXT_PRIMARY,
});

// Bad - bypasses retina fix
const text = this.add.text(x, y, 'Hello', style);
```

### Panel Creation
**Use `createPanelFrame()`** for consistent panel styling:

```typescript
import { createPanelFrame, PANEL_PRESETS } from '@/ui/ui-utils';

// Modal dialog
const panel = createPanelFrame(this, x, y, width, height, PANEL_PRESETS.modal);

// Custom styling
const panel = createPanelFrame(this, x, y, width, height, {
  glowAlpha: 0.08,
  bgAlpha: 0.92,
  borderAlpha: 0.6,
});
```

### Colors and Fonts
```typescript
import { COLORS, PALETTE, FONTS, PANEL } from '@/config';

// Good
color: COLORS.TEXT_PRIMARY
fontSize: FONTS.SIZE_BODY
bg.setFillStyle(PALETTE.purple[700])
glow.setAlpha(PANEL.GLOW_ALPHA)

// Bad
color: '#ffffff'
fontSize: '18px'
bg.setFillStyle(0x2a1a3a)
```

### Button Styles
- **Primary** (green): Main actions — ROLL, CONTINUE
- **Secondary** (neutral): Less important actions
- **Danger** (red): Destructive actions — QUIT

### Animation Durations
Use `SIZES.ANIM_*` constants:
- `ANIM_INSTANT`: 50ms
- `ANIM_FAST`: 100ms
- `ANIM_NORMAL`: 200ms
- `ANIM_SLOW`: 400ms
- `ANIM_PULSE`: 2000ms

---

## Architecture

### File Organization
```
src/
├── main.ts                 # Phaser init + global services
├── config.ts               # Re-exports from config/
├── config/
│   ├── theme.ts            # PALETTE, COLORS, FONTS, PANEL
│   ├── sizes.ts            # SIZES, RESPONSIVE
│   ├── game-rules.ts       # GAME_RULES
│   └── dev.ts              # IS_DEVELOPMENT flag
├── data/
│   ├── categories.ts       # Scoring functions
│   ├── modes.ts            # Mode/Curse configs
│   ├── blessings.ts        # Blessing definitions
│   └── difficulties.ts     # Difficulty settings
├── scenes/
│   ├── BaseScene.ts        # Abstract base
│   ├── MenuScene.ts        # Main menu
│   ├── GameplayScene.ts    # Core gameplay
│   └── TutorialScene.ts    # Interactive tutorial
├── systems/
│   ├── state-machine.ts    # GameStateMachine
│   ├── scorecard.ts        # Scoring logic (pure, testable)
│   ├── dice-manager.ts     # Dice state + logic
│   ├── game-events.ts      # Event emitter
│   ├── save-manager.ts     # localStorage
│   ├── blessings/          # Blessing system
│   └── tutorial/           # Tutorial system
└── ui/
    ├── ui-utils.ts         # createText, createPanelFrame, createButton
    ├── base/               # BaseButton
    ├── scorecard-panel.ts  # Main scorecard
    ├── scorecard/          # Layout helpers
    ├── gameplay/           # Header, EndScreen, blessing buttons
    ├── menu/               # Menu components
    └── tutorial/           # Tutorial overlay
```

### Component Pattern
```typescript
export class PauseMenu {
  constructor(scene: Phaser.Scene) { ... }
  show(): void { ... }
  hide(): void { ... }
  destroy(): void { ... }  // REQUIRED
}
```

### Event Communication
```typescript
// Emit
GameEventEmitter.emit('game:paused');

// Listen
GameEventEmitter.on('game:paused', this.handler);

// Cleanup in destroy()
GameEventEmitter.off('game:paused', this.handler);
```

### Memory Management
- Always implement `destroy()` methods
- Remove event listeners on cleanup
- Remove keyboard listeners: `this.scene.input.keyboard?.off('keydown-X')`
- Destroy containers and their children

---

## Common Pitfalls

1. **Blurry text** → Used `scene.add.text()` instead of `createText()`
2. **Duplicate helpers** → Didn't check `ui-utils.ts` before creating utility
3. **Hardcoded values** → Use config constants
4. **Memory leaks** → Forgot to remove event listeners in `destroy()`
5. **Inconsistent panels** → Use `createPanelFrame()` not manual rectangles
6. **Giant scenes** → Extract UI components to separate files

---

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run typecheck    # Type checking
npm run lint         # ESLint
npm run test         # Vitest

# Mobile
npm run build && npx cap sync    # Sync to native
npx cap open ios                 # Open Xcode
npx cap open android             # Open Android Studio
```

---

## Current Work

When a plan exists, it will be in `.claude/plans/`. Check there on session start.