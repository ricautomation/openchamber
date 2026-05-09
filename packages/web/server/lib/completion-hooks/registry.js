/**
 * Completion Hook Interface + Registry
 *
 * Command Pattern implementation for session completion hooks.
 * Each hook is a self-contained command that can be registered and executed
 * when a session transitions to idle (completed).
 *
 * Usage:
 *   const registry = new CompletionHookRegistry();
 *   registry.register(new MyCustomHook());
 *   // ... later, when session completes:
 *   await registry.execute(sessionId, sessionInfo);
 */

export class CompletionHook {
  /**
   * Human-readable name for debugging and logging.
   * Override in subclass to provide meaningful name.
   * @returns {string}
   */
  get name() {
    return this.constructor.name;
  }

  /**
   * Determines whether this hook should execute for the given session.
   * Override in subclass to add conditional activation logic.
   *
   * @param {string} sessionId - The session that just completed
   * @param {object} sessionInfo - Completion info { status, metadata, ... }
   * @returns {boolean} - true to execute, false to skip
   */
  shouldExecute(sessionId, sessionInfo) {
    return true;
  }

  /**
   * Executes the hook's main logic.
   * Override in subclass with actual implementation.
   *
   * @param {string} sessionId - The session that just completed
   * @param {object} sessionInfo - Completion info { status, metadata, ... }
   * @returns {Promise<void>}
   */
  async execute(sessionId, sessionInfo) {
    // No-op by default
  }
}

export class CompletionHookRegistry {
  constructor() {
    /** @type {CompletionHook[]} */
    this.hooks = [];
  }

  /**
   * Register a new hook. Hooks are executed in registration order.
   * @param {CompletionHook} hook - Must extend CompletionHook
   * @throws {Error} If hook is not an instance of CompletionHook
   */
  register(hook) {
    if (!(hook instanceof CompletionHook)) {
      throw new Error(`Hook must extend CompletionHook: ${typeof hook}`);
    }
    this.hooks.push(hook);
    console.log(`[completion-hooks] Registered: ${hook.name}`);
  }

  /**
   * Execute all registered hooks for a session completion.
   * Hooks run sequentially. A failure in one hook does NOT block others.
   *
   * @param {string} sessionId - The session that just completed
   * @param {object} sessionInfo - Completion info { status, metadata, ... }
   */
  async execute(sessionId, sessionInfo) {
    for (const hook of this.hooks) {
      try {
        const shouldRun = hook.shouldExecute(sessionId, sessionInfo);
        if (!shouldRun) {
          console.log(`[completion-hooks] [${hook.name}] Skipped for session ${sessionId}`);
          continue;
        }

        console.log(`[completion-hooks] [${hook.name}] Executing for session ${sessionId}`);
        await hook.execute(sessionId, sessionInfo);
        console.log(`[completion-hooks] [${hook.name}] Done for session ${sessionId}`);
      } catch (error) {
        console.error(`[completion-hooks] [${hook.name}] Error:`, error?.message || error);
        // Continue to next hook — don't let one failure break the chain
      }
    }
  }
}