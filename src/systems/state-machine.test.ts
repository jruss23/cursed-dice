import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameStateMachine, GameStateMachine } from './state-machine';

describe('GameStateMachine', () => {
  let machine: GameStateMachine;

  beforeEach(() => {
    machine = createGameStateMachine();
  });

  describe('Initial State', () => {
    it('starts in idle state', () => {
      expect(machine.getState()).toBe('idle');
    });

    it('previous state is also idle initially', () => {
      expect(machine.getPreviousState()).toBe('idle');
    });
  });

  describe('Valid Transitions', () => {
    it('allows idle -> rolling', () => {
      expect(machine.can('rolling')).toBe(true);
      expect(machine.transition('rolling')).toBe(true);
      expect(machine.getState()).toBe('rolling');
    });

    it('allows rolling -> selecting', () => {
      machine.transition('rolling');
      expect(machine.transition('selecting')).toBe(true);
      expect(machine.getState()).toBe('selecting');
    });

    it('allows selecting -> scoring', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      expect(machine.transition('scoring')).toBe(true);
      expect(machine.getState()).toBe('scoring');
    });

    it('allows scoring -> transitioning', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      expect(machine.transition('transitioning')).toBe(true);
      expect(machine.getState()).toBe('transitioning');
    });

    it('allows transitioning -> rolling (next turn)', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      machine.transition('transitioning');
      expect(machine.transition('rolling')).toBe(true);
      expect(machine.getState()).toBe('rolling');
    });
  });

  describe('Invalid Transitions', () => {
    it('rejects idle -> scoring directly', () => {
      expect(machine.can('scoring')).toBe(false);
      expect(machine.transition('scoring')).toBe(false);
      expect(machine.getState()).toBe('idle');
    });

    it('rejects scoring -> idle', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      expect(machine.can('idle')).toBe(false);
      expect(machine.transition('idle')).toBe(false);
    });

    it('rejects rolling -> transitioning directly', () => {
      machine.transition('rolling');
      expect(machine.can('transitioning')).toBe(false);
    });
  });

  describe('Pause Flow', () => {
    it('can pause from rolling', () => {
      machine.transition('rolling');
      expect(machine.transition('paused')).toBe(true);
      expect(machine.getState()).toBe('paused');
      expect(machine.getPreviousState()).toBe('rolling');
    });

    it('can pause from selecting', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      expect(machine.transition('paused')).toBe(true);
      expect(machine.getPreviousState()).toBe('selecting');
    });

    it('can pause from scoring', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      expect(machine.transition('paused')).toBe(true);
      expect(machine.getPreviousState()).toBe('scoring');
    });

    it('resume returns to previous state', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('paused');

      // Resume to selecting
      const previousState = machine.getPreviousState();
      expect(machine.transition(previousState)).toBe(true);
      expect(machine.getState()).toBe('selecting');
    });
  });

  describe('Game Over Paths', () => {
    it('can reach game-over from scoring', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      expect(machine.transition('game-over')).toBe(true);
    });

    it('can reach game-over from rolling (timer expired)', () => {
      machine.transition('rolling');
      expect(machine.transition('game-over')).toBe(true);
    });

    it('can reach game-over from transitioning', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      machine.transition('transitioning');
      expect(machine.transition('game-over')).toBe(true);
    });

    it('can restart from game-over', () => {
      machine.forceTransition('game-over');
      expect(machine.transition('idle')).toBe(true);
    });
  });

  describe('Blessing Flow', () => {
    it('transitioning -> blessing-choice', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.transition('scoring');
      machine.transition('transitioning');
      expect(machine.transition('blessing-choice')).toBe(true);
    });

    it('blessing-choice -> mode-transition', () => {
      machine.forceTransition('blessing-choice');
      expect(machine.transition('mode-transition')).toBe(true);
    });

    it('mode-transition -> rolling', () => {
      machine.forceTransition('mode-transition');
      expect(machine.transition('rolling')).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('calls onEnter callback when entering state', () => {
      const enterCallback = vi.fn();
      machine.onEnter('rolling', enterCallback);

      machine.transition('rolling');

      expect(enterCallback).toHaveBeenCalledTimes(1);
    });

    it('calls onExit callback when leaving state', () => {
      const exitCallback = vi.fn();
      machine.onExit('idle', exitCallback);

      machine.transition('rolling');

      expect(exitCallback).toHaveBeenCalledTimes(1);
    });

    it('calls exit before enter', () => {
      const order: string[] = [];
      machine.onExit('idle', () => order.push('exit-idle'));
      machine.onEnter('rolling', () => order.push('enter-rolling'));

      machine.transition('rolling');

      expect(order).toEqual(['exit-idle', 'enter-rolling']);
    });

    it('supports multiple callbacks per state', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      machine.onEnter('rolling', cb1);
      machine.onEnter('rolling', cb2);

      machine.transition('rolling');

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('does not call callbacks on failed transition', () => {
      const enterCallback = vi.fn();
      machine.onEnter('scoring', enterCallback);

      machine.transition('scoring'); // Invalid from idle

      expect(enterCallback).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('is() checks current state', () => {
      expect(machine.is('idle')).toBe(true);
      expect(machine.is('rolling')).toBe(false);

      machine.transition('rolling');
      expect(machine.is('rolling')).toBe(true);
      expect(machine.is('idle')).toBe(false);
    });

    it('isAny() checks multiple states', () => {
      expect(machine.isAny('idle', 'rolling')).toBe(true);
      expect(machine.isAny('rolling', 'scoring')).toBe(false);
    });

    it('isPlayable() returns true for active states', () => {
      expect(machine.isPlayable()).toBe(false); // idle

      machine.transition('rolling');
      expect(machine.isPlayable()).toBe(true);

      machine.transition('selecting');
      expect(machine.isPlayable()).toBe(true);

      machine.transition('scoring');
      expect(machine.isPlayable()).toBe(true);
    });

    it('isPlayable() returns false for non-active states', () => {
      machine.forceTransition('paused');
      expect(machine.isPlayable()).toBe(false);

      machine.forceTransition('game-over');
      expect(machine.isPlayable()).toBe(false);

      machine.forceTransition('transitioning');
      expect(machine.isPlayable()).toBe(false);
    });
  });

  describe('Reset and Cleanup', () => {
    it('reset() returns to idle', () => {
      machine.transition('rolling');
      machine.transition('selecting');
      machine.reset();
      expect(machine.getState()).toBe('idle');
      expect(machine.getPreviousState()).toBe('idle');
    });

    it('clearCallbacks() removes all callbacks', () => {
      const callback = vi.fn();
      machine.onEnter('rolling', callback);
      machine.clearCallbacks();

      machine.transition('rolling');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Force Transition', () => {
    it('bypasses validation', () => {
      // Normally can't go idle -> scoring
      expect(machine.can('scoring')).toBe(false);

      machine.forceTransition('scoring');
      expect(machine.getState()).toBe('scoring');
    });

    it('still calls callbacks', () => {
      const enterCallback = vi.fn();
      machine.onEnter('game-over', enterCallback);

      machine.forceTransition('game-over');

      expect(enterCallback).toHaveBeenCalled();
    });
  });
});
