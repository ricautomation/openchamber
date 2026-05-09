/**
 * Completion Hooks Module
 *
 * Exports all completion hook components.
 * Import from here to access the full public API.
 */

import { CompletionHook, CompletionHookRegistry } from './registry.js';
import { SessionPinState } from './session-pin-state.js';
import { PinToRepeatHook } from './pin-to-repeat.hook.js';

export { CompletionHook, CompletionHookRegistry, SessionPinState, PinToRepeatHook };

/**
 * Factory function to create a fully configured completion hook registry.
 * This is the recommended way to set up hooks in production.
 *
 * @param {object} deps
 * @param {function} deps.buildOpenCodeUrl - (path) => string - Build OpenCode API URL
 * @param {function} deps.getOpenCodeAuthHeaders - () => object - Auth headers for OpenCode
 * @returns {{ registry: CompletionHookRegistry, pinState: SessionPinState }}
 */
export function createCompletionHooks({ buildOpenCodeUrl, getOpenCodeAuthHeaders }) {
  // Create the pin state store (shared across all hooks)
  const pinState = new SessionPinState();

  // Build the submit function that makes HTTP call to OpenCode API
  // Path: /session/{sessionId}/message (proxy strips /api prefix)
  const submitPrompt = async (sessionId, promptText) => {
    const url = buildOpenCodeUrl(`/session/${sessionId}/message`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getOpenCodeAuthHeaders(),
      },
      body: JSON.stringify({ text: promptText }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit prompt: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  // Create the registry
  const registry = new CompletionHookRegistry();

  // Register the PinToRepeat hook with its dependencies
  registry.register(new PinToRepeatHook({
    getPin: (sessionId) => pinState.getPin(sessionId),
    isPinActive: (sessionId) => pinState.isActive(sessionId),
    submitPrompt,
    incrementRepeat: (sessionId) => pinState.incrementRepeat(sessionId),
    delayBetweenRepeatsMs: 1000,
  }));

  return { registry, pinState };
}