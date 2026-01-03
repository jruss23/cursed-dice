# Cleanup: Centralize Hardcoded Layout Values

## Problem
Many UI components have hardcoded pixel values instead of using centralized LAYOUT config.
This makes responsive design inconsistent and harder to maintain.

## Files with hardcoded values:

### High Priority (user-facing)
- [ ] `src/ui/tutorial/tutorial-overlay.ts` - popup sizes, button sizes, margins
- [ ] `src/ui/menu/high-scores-panel.ts` - panel dimensions as fallbacks
- [ ] `src/ui/menu/difficulty-button.ts` - button width fallback

### Lower Priority (debug/dev only)
- [ ] `src/ui/tutorial/tutorial-debug-panel.ts` - all dimensions hardcoded
- [ ] `src/ui/gameplay/debug-panel.ts` - all dimensions hardcoded

### Global Pattern
- [ ] Replace `toDPR(2)` stroke widths with `toDPR(SIZES.BORDER_WIDTH)` or similar constant (~30 occurrences)

## Recommended approach:
1. Add missing constants to `src/config/sizes.ts` under appropriate LAYOUT sections
2. Update components to use constants instead of inline numbers
3. Ensure all `toDPR(N)` calls reference named constants for anything > 2px

## Status: PENDING
Blocked by: corner-accent-consistency.md (complete that first)
