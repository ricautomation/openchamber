/**
 * PinToRepeatHook
 *
 * Completion hook that re-submits the pinned prompt when session completes.
 * Only executes if:
 *   - A pin is active for this session (repeatCount > 0, repeatIndex < repeatCount)
 *   - The session has remaining repetitions
 *
 * Execution flow:
 *   1. Session completes (idle)
 *   2. Hook checks shouldExecute -> is pin active and has remaining?
 *   3. If yes, wait delayBetweenRepeatsMs for stability
 *   4. Submit the pinned prompt text to the session
 *   5. Increment pin repeatIndex so next completion triggers next repeat
 *
 * Command Pattern: This hook IS the command. Self-contained with its own
 * execute() method that knows how to perform the repeat action.
 */

import { CompletionHook } from './registry.js';

export class PinToRepeatHook extends CompletionHook {
  /**
   * @param {object} deps - Dependencies injected at construction
   * @param {function} deps.getPin - () => PinState | null - Returns pin for session
   * @param {function} deps.isPinActive - (sessionId) => boolean - Checks if pin is active
   * @param {function} deps.submitPrompt - async (sessionId, promptText) => void
   *                                       Submits a prompt to the session
   * @param {function} deps.incrementRepeat - (sessionId) => boolean
   *                                       Increments repeatIndex; returns false if no pin
   * @param {number} [deps.delayBetweenRepeatsMs=1000] - ms to wait before repeat
   */
  constructor(deps) {
    super();
    this._getPin = deps.getPin;
    this._isPinActive = deps.isPinActive;
    this._submitPrompt = deps.submitPrompt;
    this._incrementRepeat = deps.incrementRepeat;
    this._delayMs = deps.delayBetweenRepeatsMs ?? 1000;
  }

  get name() {
    return 'PinToRepeat';
  }

  /**
   * Check if hook should execute.
   * Only runs if: pin exists AND pin is active (not exhausted).
   *
   * @param {string} sessionId
   * @param {object} _sessionInfo - Unused, kept for interface compatibility
   * @returns {boolean}
   */
  shouldExecute(sessionId, _sessionInfo) {
    return this._isPinActive(sessionId);
  }

  /**
   * Execute the pin-to-repeat action.
   * 1. Wait a small delay for session stability
   * 2. Submit the pinned prompt
   * 3. Increment repeat index (so next idle -> triggers next repeat)
   *
   * @param {string} sessionId
   * @param {object} _sessionInfo - Unused, kept for interface compatibility
   * @returns {Promise<void>}
   */
  async execute(sessionId, _sessionInfo) {
    const pin = this._getPin(sessionId);
    if (!pin) {
      console.log(`[PinToRepeat] No pin found for session ${sessionId}, skipping`);
      return;
    }

    const nextRepeat = pin.repeatIndex + 1;
    console.log(
      `[PinToRepeat] Session ${sessionId}: triggering repeat ${nextRepeat}/${pin.repeatCount}`
    );

    // Small delay before re-submitting for session stability
    await this._sleep(this._delayMs);

    // Submit the pinned prompt text to the session
    try {
      await this._submitPrompt(sessionId, pin.promptText);
      console.log(`[PinToRepeat] Prompt submitted for session ${sessionId}`);

      // Increment the repeat index so the next completion handles the next repeat
      // When repeatIndex reaches repeatCount, the pin will auto-clear
      this._incrementRepeat(sessionId);
    } catch (error) {
      console.error(`[PinToRepeat] Failed to submit prompt:`, error?.message || error);
      // Re-throw so registry logs the error but continues to next hook
      throw error;
    }
  }

  /**
   * Sleep utility using Promise + setTimeout
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}