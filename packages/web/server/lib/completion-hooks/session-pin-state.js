/**
 * Session Pin State Manager
 *
 * In-memory store for pin state per session.
 * Key: sessionId -> PinState
 *
 * States:
 *   - null: No pin active for this session
 *   - { repeatIndex: 0, repeatCount: N, ... }: Pin active, N repeats remaining
 *
 * The pin locks the prompt text while active (repeatIndex tracks progress).
 * When user presses Stop, pin is cleared (repeatIndex = 0 AND repeatCount = 0).
 *
 * @example
 *   const pinState = new SessionPinState();
 *   pinState.setPin('session-123', { messageId: 'msg-1', promptText: '...', repeatCount: 3 });
 *   const pin = pinState.getPin('session-123'); // { repeatIndex: 0, repeatCount: 3, ... }
 */

export class SessionPinState {
  constructor() {
    /** @type {Map<string, PinState>} */
    this._pins = new Map();
  }

  /**
   * Pin state shape
   * @typedef {Object} PinState
   * @property {string} messageId - ID of the pinned message
   * @property {string} promptText - Full text of the pinned prompt
   * @property {number} repeatCount - Total repetitions configured (1-20)
   * @property {number} repeatIndex - Current repetition (0-based). 0 = just pinned, not started
   * @property {number} pinnedAt - Unix timestamp when pin was set
   */

  /**
   * Check if a pin exists and is active (repeatCount > 0 and repeatIndex < repeatCount)
   * @param {string} sessionId
   * @returns {boolean}
   */
  isActive(sessionId) {
    const pin = this._pins.get(sessionId);
    if (!pin) return false;
    return pin.repeatCount > 0 && pin.repeatIndex < pin.repeatCount;
  }

  /**
   * Set pin for a session. Clears any existing pin first.
   * @param {string} sessionId
   * @param {object} pinData
   * @param {string} pinData.messageId
   * @param {string} pinData.promptText
   * @param {number} pinData.repeatCount - Total repetitions (1-20)
   */
  setPin(sessionId, pinData) {
    this._pins.set(sessionId, {
      messageId: pinData.messageId,
      promptText: pinData.promptText,
      repeatCount: pinData.repeatCount,
      repeatIndex: 0, // Starts at 0 = pinned but not yet executing
      pinnedAt: Date.now(),
    });
    console.log(`[SessionPinState] Pin set for session ${sessionId}: ${pinData.repeatCount}x`);
  }

  /**
   * Get current pin state for a session.
   * @param {string} sessionId
   * @returns {PinState | null}
   */
  getPin(sessionId) {
    return this._pins.get(sessionId) ?? null;
  }

  /**
   * Increment repeat index after each execution.
   * When repeatIndex reaches repeatCount, the pin is considered exhausted.
   * @param {string} sessionId
   * @returns {boolean} - true if incremented, false if no pin or already exhausted
   */
  incrementRepeat(sessionId) {
    const pin = this._pins.get(sessionId);
    if (!pin) return false;

    pin.repeatIndex += 1;
    console.log(
      `[SessionPinState] Session ${sessionId}: repeat ${pin.repeatIndex}/${pin.repeatCount}`
    );

    // If we've completed all repeats, clear the pin
    if (pin.repeatIndex >= pin.repeatCount) {
      this.clearPin(sessionId);
    }

    return true;
  }

  /**
   * Clear pin for a session. Called when:
   *   - All repeats are exhausted
   *   - User presses Stop (forces pin to off)
   *   - User manually unpins
   *
   * @param {string} sessionId
   */
  clearPin(sessionId) {
    const existed = this._pins.has(sessionId);
    this._pins.delete(sessionId);
    if (existed) {
      console.log(`[SessionPinState] Pin cleared for session ${sessionId}`);
    }
  }

  /**
   * Reset pin to initial state (repeatIndex = 0) without clearing it.
   * Used when user pauses or wants to restart the repeat sequence.
   *
   * @param {string} sessionId
   * @returns {boolean}
   */
  resetPin(sessionId) {
    const pin = this._pins.get(sessionId);
    if (!pin) return false;

    pin.repeatIndex = 0;
    console.log(`[SessionPinState] Pin reset for session ${sessionId}`);
    return true;
  }
}