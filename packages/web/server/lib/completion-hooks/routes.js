/**
 * Completion Hooks API Routes
 *
 * REST endpoints for managing pin-to-repeat state per session.
 * These are mounted at /api/session/:sessionId/pin
 */

import { Router } from 'express';

export function createCompletionHooksRouter({ pinState }) {
  const router = Router();

  /**
   * GET /api/session/:sessionId/pin
   * Returns current pin state for the session
   */
  router.get('/:sessionId/pin', (req, res) => {
    const { sessionId } = req.params;
    const pin = pinState.getPin(sessionId);
    res.json({ pin });
  });

  /**
   * POST /api/session/:sessionId/pin
   * Set pin for a session
   * Body: { messageId: string, promptText: string, repeatCount: number }
   */
  router.post('/:sessionId/pin', (req, res) => {
    const { sessionId } = req.params;
    const { messageId, promptText, repeatCount } = req.body;

    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'messageId is required' });
    }
    if (!promptText || typeof promptText !== 'string') {
      return res.status(400).json({ error: 'promptText is required' });
    }
    if (typeof repeatCount !== 'number' || repeatCount < 1 || repeatCount > 20) {
      return res.status(400).json({ error: 'repeatCount must be a number between 1 and 20' });
    }

    pinState.setPin(sessionId, { messageId, promptText, repeatCount });
    console.log(`[completion-hooks] Pin set: session=${sessionId} messageId=${messageId} repeatCount=${repeatCount}`);

    res.json({ success: true, pin: pinState.getPin(sessionId) });
  });

  /**
   * DELETE /api/session/:sessionId/pin
   * Clear/remove pin for a session (user stopped the repeat)
   */
  router.delete('/:sessionId/pin', (req, res) => {
    const { sessionId } = req.params;
    pinState.clearPin(sessionId);
    console.log(`[completion-hooks] Pin cleared: session=${sessionId}`);
    res.json({ success: true });
  });

  return router;
}