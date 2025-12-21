# Claude Code Guidelines for Cursed Dice

## Project Overview
Phaser 3 + TypeScript dice game. Single-page game with MenuScene and GameplayScene.

## Code Conventions

### Text Creation
**Always use a `createText()` helper method** - never call `this.scene.add.text()` directly.
The helper must apply high-DPI resolution fix:

```typescript
private createText(
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text {
  const text = this.scene.add.text(x, y, content, style);
  text.setResolution(window.devicePixelRatio * 2);
  return text;
}
```

### Colors and Fonts
- **Never hardcode colors** - use `PALETTE.*` for hex values, `COLORS.*` for semantic usage
- **Never hardcode font sizes** - use `FONTS.SIZE_*` constants
- Import from `@/config`

```typescript
import { COLORS, PALETTE, FONTS } from '@/config';

// Good
color: COLORS.TEXT_PRIMARY
fontSize: FONTS.SIZE_BODY
bg.setFillStyle(PALETTE.purple[700])

// Bad
color: '#ffffff'
fontSize: '18px'
bg.setFillStyle(0x2a1a3a)
```

### Panel Styling Pattern
All panels use this consistent style:
1. Outer glow (PALETTE.purple[500], 0.06-0.12 alpha)
2. Background (PALETTE.purple[700-900], 0.88-0.95 alpha)
3. Border stroke (PALETTE.purple[500], 0.5-0.8 alpha)
4. Corner accents (4 L-shaped corners with PALETTE.purple[400])

```typescript
// Outer glow
const glow = this.add.rectangle(x, y, w + 12, h + 12, PALETTE.purple[500], 0.08);

// Background
const bg = this.add.rectangle(x, y, w, h, PALETTE.purple[800], 0.92);
bg.setStrokeStyle(2, PALETTE.purple[500], 0.6);

// Corner accents (draw after content)
const corners = [
  { x: inset, y: inset, ax: 1, ay: 1 },           // top-left
  { x: w - inset, y: inset, ax: -1, ay: 1 },      // top-right
  { x: w - inset, y: h - inset, ax: -1, ay: -1 }, // bottom-right
  { x: inset, y: h - inset, ax: 1, ay: -1 },      // bottom-left
];
```

### Button Styles
Use semantic button types:
- **Primary** (green): Main actions like ROLL, CONTINUE
- **Secondary** (neutral): Less important actions
- **Danger** (red): Destructive actions like QUIT

### Component Extraction
Large scenes should delegate to UI component classes:
- Each visual "chunk" (panel, overlay, menu) gets its own file
- Components receive `scene` in constructor
- Components emit events via `GameEventEmitter`, not direct callbacks
- Components have a `destroy()` method for cleanup

```typescript
// Good: Extracted component
export class PauseMenu {
  constructor(scene: Phaser.Scene) { ... }
  show(): void { ... }
  hide(): void { ... }
  destroy(): void { ... }
}

// In scene
this.pauseMenu = new PauseMenu(this);
```

### Event-Driven Communication
Use `GameEventEmitter` for cross-component communication:

```typescript
// Emit
GameEventEmitter.emit('game:paused');

// Listen
GameEventEmitter.on('game:paused', () => { ... });

// Cleanup in destroy()
GameEventEmitter.off('game:paused', this.handler);
```

### Memory Management
- Always implement `destroy()` methods
- Remove event listeners on cleanup
- Remove keyboard listeners: `this.scene.input.keyboard?.off('keydown-X')`
- Destroy containers and their children

### Animation Durations
Use `SIZES.ANIM_*` constants:
- `ANIM_INSTANT`: 50ms
- `ANIM_FAST`: 100ms
- `ANIM_NORMAL`: 200ms
- `ANIM_SLOW`: 400ms
- `ANIM_PULSE`: 2000ms

### File Organization
```
src/
  config.ts          # All constants (PALETTE, COLORS, FONTS, SIZES)
  scenes/            # Phaser scenes (coordinators)
  systems/           # Game logic (DiceManager, Scorecard, BlessingManager)
  ui/                # Visual components (panels, overlays, menus)
```

## Common Pitfalls

1. **Blurry text** - Forgot `setResolution(window.devicePixelRatio * 2)`
2. **Memory leaks** - Forgot to remove event listeners in destroy()
3. **Hardcoded values** - Use config constants instead
4. **Giant scenes** - Extract UI components to separate files
5. **Direct coupling** - Use events instead of direct method calls between systems
