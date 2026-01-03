# Refactor: Corner Accent Consistency

## Problem
Corner accents were inconsistent across the codebase:
1. Some used `toDPR()` scaling, some didn't (causing tiny corners on retina)
2. `blessing-choice-panel.ts` was missing corners entirely

## Changes made:

### Phase 1: Fix the shared helper ✅
- [x] `src/ui/ui-utils.ts` - Applied `toDPR()` to cornerSize, cornerInset, glowSize, borderWidth in `createPanelFrame()`

### Phase 2: Reviewed custom implementations
After review, migration to `createPanelFrame()` was NOT done because each panel has valid reasons for custom code:

- [x] `src/ui/scorecard-panel.ts` - **Already correct**. Uses `toDPR(12)` for cornerSize, `toDPR(5)` for inset. Custom code needed for: shadow, inner highlight bar.
- [x] `src/ui/menu/high-scores-panel.ts` - **Already correct**. Uses `toDPR(10)` for cornerSize, `toDPR(5)` for inset. Custom code needed for: shadow behind panel.
- [x] `src/ui/tutorial/tutorial-overlay.ts` - **Fixed small bug**. Line 204 `thickness = 2` changed to `toDPR(2)`. Custom code needed for: gold color theme, dynamic popup sizing.

### Phase 3: Verified remaining custom implementations ✅
- [x] `src/ui/gameplay/end-screen-overlay.ts` - **Fixed**. Added `toDPR()` to cornerSize and cornerInset. Custom code needed for: victory color animation.
- [x] `src/ui/menu/difficulty-button.ts` - **Already correct**. Uses `toDPR(12)` for cornerSize, `toDPR(5)` for inset. Custom code needed for: per-button difficulty colors.

### Phase 4: Add missing corners ✅
- [x] `src/ui/blessing-choice-panel.ts` - Added corner accents using inline code (consistent with other panels)

## Summary
All corner accents now:
1. Use proper DPR scaling via `toDPR()`
2. Reference centralized `SIZES.PANEL_CORNER_SIZE` (12) and `SIZES.PANEL_CORNER_INSET` (5)
3. Can be globally adjusted by changing values in `src/config/sizes.ts`

Panels keep custom implementations because:
- Some need shadow effects not in createPanelFrame()
- Some need custom colors (gold for tutorial, difficulty colors for buttons)
- Some need animated colors (victory screen)

## Status: COMPLETE
