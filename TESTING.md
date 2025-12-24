# Cursed Dice - Testing Strategy

## Testing Framework Recommendation

### Setup
- **Test Runner**: Vitest (native Vite integration, same config)
- **Coverage**: Vitest's built-in coverage with `@vitest/coverage-v8`
- **Assertion**: Vitest's built-in (chai-compatible)

### Installation
```bash
npm install -D vitest @vitest/coverage-v8
```

### Config (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/scenes/',      // Phaser scenes - integration test only
        'src/ui/',          // Phaser UI - integration test only
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

---

## Testability Analysis

### Already Testable (No Changes Needed)

| Module | Path | Notes |
|--------|------|-------|
| **Scorecard** | `systems/scorecard.ts` | Pure logic, no deps |
| **State Machine** | `systems/state-machine.ts` | Pure class |
| **Layout Calculator** | `ui/scorecard/layout-calculator.ts` | Pure functions |
| **Layout Config** | `ui/scorecard/layout-config.ts` | Types only |
| **State Manager** | `ui/scorecard/state-manager.ts` | Pure class |
| **Game Progression** | `systems/game-progression.ts` | Pure class |
| **Mode Mechanics** | `systems/mode-mechanics.ts` | Pure functions |
| **Save Manager** | `systems/save-manager.ts` | Uses localStorage (mockable) |
| **Logger** | `systems/logger.ts` | Pure utility |
| **Commands** | `systems/commands/*.ts` | Command pattern classes |
| **Categories Data** | `data/categories.ts` | Pure scoring functions |
| **Modes Data** | `data/modes.ts` | Pure data |
| **Blessings Data** | `data/blessings.ts` | Pure data |

### Requires Phaser (Not Unit Testable)

| Module | Path | Phaser Usage |
|--------|------|--------------|
| **DiceManager** | `systems/dice-manager.ts` | Sprites, tweens, containers |
| **AudioManager** | `systems/audio-manager.ts` | Sound objects |
| **ParticlePool** | `systems/particle-pool.ts` | Particle emitters |
| **InputManager** | `systems/input-manager.ts` | Keyboard events |
| **DebugController** | `systems/debug-controller.ts` | Scene access |
| **GameEventEmitter** | `systems/game-events.ts` | Phaser.Events.EventEmitter |
| **All UI components** | `ui/**/*.ts` | Phaser GameObjects |
| **All Scenes** | `scenes/**/*.ts` | Phaser.Scene |

### Potential Decoupling (Optional)

#### 1. GameEventEmitter - LOW PRIORITY
**Current**: Uses `Phaser.Events.EventEmitter`
**Could**: Use Node's `EventEmitter` or custom implementation
**Benefit**: Makes event-dependent code testable
**Cost**: Minor refactor, ~30 min
**Recommendation**: Skip for now. Mock the emitter in tests.

#### 2. DiceManager Logic - MEDIUM PRIORITY
**Current**: DiceState logic mixed with Phaser sprites
**Could**: Extract `DiceLogic` class with pure state management
**Benefit**: Test rolling, locking, curse logic without Phaser
**Cost**: ~1 hour refactor
**Recommendation**: Consider if dice bugs emerge. Current code is stable.

---

## Test Cases by Module

### 1. Scorecard (`systems/scorecard.ts`)

#### Category Scoring
```typescript
describe('Scorecard - Category Scoring', () => {
  // Upper section
  it('scores ones correctly: [1,1,3,4,5] = 2', () => {});
  it('scores sixes correctly: [6,6,6,2,1] = 18', () => {});

  // Lower section - Three of a Kind
  it('scores three of a kind: [3,3,3,4,5] = 18', () => {});
  it('rejects invalid three of a kind: [1,2,3,4,5] = 0', () => {});

  // Lower section - Four of a Kind
  it('scores four of a kind: [4,4,4,4,2] = 18', () => {});
  it('five of a kind counts as four of a kind: [5,5,5,5,5] = 25', () => {});

  // Full House
  it('scores full house: [2,2,3,3,3] = 25', () => {});
  it('rejects invalid full house: [1,1,1,1,2] = 0', () => {});

  // Straights
  it('scores small straight: [1,2,3,4,6] = 30', () => {});
  it('scores large straight: [2,3,4,5,6] = 40', () => {});
  it('rejects invalid small straight: [1,2,3,5,6] = 0', () => {});

  // Five Dice (Yahtzee)
  it('scores five dice: [4,4,4,4,4] = 50', () => {});

  // Chance
  it('scores chance as sum: [1,2,3,4,5] = 15', () => {});
  it('scores chance with any dice: [6,6,6,6,6] = 30', () => {});

  // Special categories (expansion)
  it('scores two pair: [2,2,4,4,6] = 12', () => {});
  it('scores all odd: [1,3,3,5,5] = 17', () => {});
  it('scores all even: [2,4,4,6,6] = 22', () => {});
  it('scores all high: [4,5,5,6,6] = 26', () => {});
  it('rejects invalid all high: [3,4,5,6,6] = 0', () => {});
});
```

#### Scorecard State
```typescript
describe('Scorecard - State Management', () => {
  it('starts with all categories available', () => {});
  it('marks category as filled after scoring', () => {});
  it('prevents scoring same category twice', () => {});
  it('calculates upper section bonus at 63+', () => {});
  it('tracks total score correctly', () => {});
  it('resets all scores on reset()', () => {});

  // Special section
  it('special section disabled by default', () => {});
  it('enableSpecialSection() adds 4 categories', () => {});

  // Locking (Mode 3)
  it('lockCategories() prevents scoring locked categories', () => {});
  it('locked categories do not count toward total', () => {});
});
```

### 2. State Machine (`systems/state-machine.ts`)

```typescript
describe('GameStateMachine', () => {
  // Basic transitions
  it('starts in idle state', () => {});
  it('transitions idle -> rolling', () => {});
  it('transitions rolling -> selecting', () => {});
  it('transitions selecting -> scoring', () => {});
  it('transitions scoring -> transitioning', () => {});
  it('transitions transitioning -> rolling (next turn)', () => {});

  // Invalid transitions
  it('rejects idle -> scoring (must roll first)', () => {});
  it('rejects scoring -> idle', () => {});

  // Pause flow
  it('can pause from rolling', () => {});
  it('can pause from selecting', () => {});
  it('can pause from scoring', () => {});
  it('cannot pause from transitioning', () => {});
  it('resume returns to previous state', () => {});

  // Game over paths
  it('transitions scoring -> game-over on timer expiry', () => {});
  it('transitions transitioning -> game-over when complete', () => {});

  // Blessing flow
  it('transitions transitioning -> blessing-choice', () => {});
  it('transitions blessing-choice -> mode-transition', () => {});

  // Callbacks
  it('calls onEnter callback when entering state', () => {});
  it('calls onExit callback when leaving state', () => {});

  // Utility methods
  it('isPlayable() returns true for rolling/selecting/scoring', () => {});
  it('isPlayable() returns false for paused/game-over', () => {});
  it('getPreviousState() returns state before current', () => {});
});
```

### 3. Layout Calculator (`ui/scorecard/layout-calculator.ts`)

```typescript
describe('Layout Calculator', () => {
  // Mode detection
  it('returns two-column for width < 900', () => {});
  it('returns single-column for width >= 900', () => {});

  // Two-column layout
  describe('Two-Column Layout', () => {
    it('calculates correct panel width', () => {});
    it('positions upper section in left column', () => {});
    it('positions lower section in right column', () => {});
    it('calculates correct row heights', () => {});
    it('includes rowStyle with two-column values', () => {});

    // Compact mode (special section enabled)
    it('reduces row height when special section enabled', () => {});
    it('positions special section as 2x2 grid', () => {});
  });

  // Single-column layout
  describe('Single-Column Layout', () => {
    it('calculates correct panel width', () => {});
    it('stacks all sections vertically', () => {});
    it('includes rowStyle with single-column values', () => {});
  });

  // Row generation
  it('generates correct number of rows', () => {});
  it('assigns correct categoryId to each row', () => {});
  it('marks rows with correct section', () => {});
  it('alternates isEven flag', () => {});
});
```

### 4. Game Progression (`systems/game-progression.ts`)

```typescript
describe('GameProgressionManager', () => {
  // Mode progression
  it('starts at mode 1', () => {});
  it('advances to next mode on completeMode()', () => {});
  it('returns correct mode data for current mode', () => {});
  it('reports game complete after mode 4', () => {});

  // Pass/fail logic
  it('isModePassed() returns true when score >= threshold', () => {});
  it('isModePassed() returns false when score < threshold', () => {});

  // Blessing eligibility
  it('allows blessing choice after mode 1 pass', () => {});
  it('blessing choice available each mode', () => {});

  // Reset
  it('reset() returns to mode 1', () => {});
  it('reset() clears all stored blessings', () => {});
});
```

### 5. Mode Mechanics (`systems/mode-mechanics.ts`)

```typescript
describe('Mode Mechanics', () => {
  // Mode 1 - No special mechanics
  it('mode 1 has no locked categories', () => {});
  it('mode 1 has no cursed die', () => {});

  // Mode 2 - Shackled Die
  it('mode 2 curses highest die after first roll', () => {});
  it('cursed die cannot be unlocked', () => {});
  it('tie-breaker: rightmost die gets cursed', () => {});

  // Mode 3 - Sealed Paths
  it('mode 3 locks 3 random categories', () => {});
  it('locked categories cannot be scored', () => {});
  it('same categories stay locked entire mode', () => {});

  // Mode 4 - Gauntlet
  it('mode 4 only allows 3 categories at a time', () => {});
  it('scoring advances available categories', () => {});
  it('maintains order of available categories', () => {});
});
```

### 6. Command Pattern (`systems/commands/`)

```typescript
describe('Command Invoker', () => {
  it('executes command and returns success', () => {});
  it('adds undoable commands to history', () => {});
  it('undo() reverts last command', () => {});
  it('redo() re-executes undone command', () => {});
  it('new command clears redo stack', () => {});
  it('respects maxHistorySize limit', () => {});
  it('canUndo() reflects history state', () => {});
  it('canRedo() reflects redo stack state', () => {});
});

describe('ScoreCategoryCommand', () => {
  it('scores category on execute', () => {});
  it('unscores category on undo', () => {});
  it('canExecute returns false if category filled', () => {});
  it('canExecute returns false if category locked', () => {});
});
```

### 7. Scoring Functions (`data/categories.ts`)

```typescript
describe('Scoring Functions', () => {
  // These are the pure scoring functions used by scorecard

  describe('countValue()', () => {
    it('counts occurrences correctly', () => {});
  });

  describe('hasNOfAKind()', () => {
    it('detects three of a kind', () => {});
    it('detects four of a kind', () => {});
    it('five of a kind counts as four', () => {});
  });

  describe('isFullHouse()', () => {
    it('detects valid full house', () => {});
    it('rejects five of a kind as full house', () => {});
  });

  describe('hasSmallStraight()', () => {
    it('detects 1-2-3-4', () => {});
    it('detects 2-3-4-5', () => {});
    it('detects 3-4-5-6', () => {});
    it('works with duplicates: [1,2,3,4,4]', () => {});
  });

  describe('hasLargeStraight()', () => {
    it('detects 1-2-3-4-5', () => {});
    it('detects 2-3-4-5-6', () => {});
  });

  describe('isFiveDice()', () => {
    it('detects five of same value', () => {});
  });

  describe('hasTwoPair()', () => {
    it('detects two different pairs', () => {});
    it('four of a kind is not two pair', () => {});
  });

  describe('isAllOdd()', () => {
    it('all 1,3,5 is valid', () => {});
    it('any even number invalidates', () => {});
  });

  describe('isAllEven()', () => {
    it('all 2,4,6 is valid', () => {});
    it('any odd number invalidates', () => {});
  });

  describe('isAllHigh()', () => {
    it('all 4,5,6 is valid', () => {});
    it('any 1,2,3 invalidates', () => {});
  });
});
```

### 8. Save Manager (`systems/save-manager.ts`)

```typescript
describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves high score to localStorage', () => {});
  it('retrieves saved high score', () => {});
  it('returns 0 for missing high score', () => {});
  it('saves difficulty setting', () => {});
  it('saves audio preferences', () => {});
  it('handles corrupted data gracefully', () => {});
  it('clearAll() removes all saved data', () => {});
});
```

---

## Coverage Goals

| Module | Target | Reason |
|--------|--------|--------|
| `scorecard.ts` | 95%+ | Core game logic |
| `state-machine.ts` | 95%+ | Critical flow control |
| `data/categories.ts` | 100% | Scoring must be bug-free |
| `game-progression.ts` | 90%+ | Mode advancement |
| `mode-mechanics.ts` | 90%+ | Mode-specific rules |
| `commands/*.ts` | 85%+ | Undo/redo reliability |
| `layout-calculator.ts` | 80%+ | Responsive layout |
| `save-manager.ts` | 80%+ | Data persistence |

**Overall Target**: 85%+ for testable modules

---

## Test Execution

### Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch

# Run specific file
npx vitest run src/systems/scorecard.test.ts
```

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Implementation Order

### Phase 1: Core Game Logic (Highest Value)
1. `data/categories.ts` - Scoring functions
2. `systems/scorecard.ts` - Scorecard state & scoring
3. `systems/state-machine.ts` - Game flow

### Phase 2: Game Rules
4. `systems/mode-mechanics.ts` - Mode-specific rules
5. `systems/game-progression.ts` - Mode advancement
6. `systems/commands/*.ts` - Command pattern

### Phase 3: Supporting Systems
7. `ui/scorecard/layout-calculator.ts` - Layout math
8. `systems/save-manager.ts` - Persistence

---

## Mocking Strategies

### Mocking GameEventEmitter
```typescript
const mockEvents = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
};
```

### Mocking localStorage
```typescript
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
global.localStorage = localStorageMock as any;
```

---

## Notes

- UI components (`ui/**`) are tested via manual QA and browser dev tools
- Phaser-dependent systems can be tested with Playwright/Cypress for E2E if needed later
- Focus unit tests on business logic where bugs are most costly
