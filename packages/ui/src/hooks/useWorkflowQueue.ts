import { useCallback, useEffect, useRef } from 'react';
import { useWorkflowQueueStore, type WorkflowStatus } from '@/stores/useWorkflowQueueStore';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { opencodeClient } from '@/lib/opencode/client';

/**
 * Workflow Queue Hook
 *
 * Coordinates the execution of a workflow: sends steps sequentially,
 * waits for agent SSE turn.end between steps, applies delays,
 * and manages loop cycling.
 */
export const useWorkflowQueue = () => {
  // Store state
  const steps = useWorkflowQueueStore((s) => s.steps);
  const loopCount = useWorkflowQueueStore((s) => s.loopCount);
  const status = useWorkflowQueueStore((s) => s.status);
  const currentStepIndex = useWorkflowQueueStore((s) => s.currentStepIndex);
  const completedLoops = useWorkflowQueueStore((s) => s.completedLoops);

  // Store actions
  const setStatus = useWorkflowQueueStore((s) => s.setStatus);
  const setCurrentStepIndex = useWorkflowQueueStore((s) => s.setCurrentStepIndex);
  const incrementCompletedLoops = useWorkflowQueueStore(
    (s) => s.incrementCompletedLoops
  );
  const resetStore = useWorkflowQueueStore((s) => s.reset);

  // Session state
  const currentSessionId = useSessionUIStore((s) => s.currentSessionId);

  // References for async coordination
  const abortRef = useRef<AbortController | null>(null);
  const agentTurnEndRef = useRef<Promise<void> | null>(null);
  const agentTurnEndResolveRef = useRef<(() => void) | null>(null);

  // Determine loop display string
  const getLoopDisplay = (): string => {
    if (loopCount === -1) return '♾️';
    if (loopCount === 0) return '⏸️';
    return `${loopCount - completedLoops}/${loopCount}`;
  };

  // Subscribe to SSE agent.turn.end events
  useEffect(() => {
    if (status === 'waiting_agent' && currentSessionId) {
      const unsubscribe = opencodeClient.onStreamEvent?.((event) => {
        if (
          event.type === 'assistant' &&
          event.data.type === 'turn.end'
        ) {
          agentTurnEndResolveRef.current?.();
        }
      });

      return () => {
        unsubscribe?.();
      };
    }
  }, [status, currentSessionId]);

  // Wait for agent to finish (SSE turn.end)
  const _waitForAgentTurn = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      agentTurnEndResolveRef.current = resolve;
      agentTurnEndRef.current = agentTurnEndResolveRef.current as unknown as Promise<void>;

      // Timeout safety (default OpenCode timeout is ~5min, but add guard)
      const timeout = setTimeout(() => {
        console.warn(
          '[WorkflowQueue] Agent turn.end timeout after 5 minutes'
        );
        resolve();
      }, 5 * 60 * 1000);

      return () => clearTimeout(timeout);
    });
  }, []);

  // Execute wait timer
  const _executeWaitTimer = useCallback(
    async (ms: number): Promise<void> => {
      if (ms <= 0) return;
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, ms);
        const originalAbort = abortRef.current;

        abortRef.current = {
          abort: () => {
            clearTimeout(timeout);
            originalAbort?.abort();
          },
        } as AbortController;

        if (originalAbort) {
          originalAbort.abort?.();
        }
      });
    },
    []
  );

  // Predicate: can send next message?
  const _isReadyToSend = useCallback((): boolean => {
    return (
      status === 'running' &&
      currentStepIndex >= 0 &&
      currentStepIndex < steps.length
    );
  }, [status, currentStepIndex, steps.length]);

  // Tick loop counter
  const _tickLoop = useCallback(async (): Promise<void> => {
    const loopsRemaining = loopCount - completedLoops - 1;

    if (loopsRemaining > 0) {
      // More loops to run
      incrementCompletedLoops();
      setCurrentStepIndex(0);
      setStatus('running');
    } else {
      // All loops done
      setStatus('done');
    }
  }, [loopCount, completedLoops, incrementCompletedLoops, setCurrentStepIndex, setStatus]);

  // Main execution loop
  const run = useCallback(async (): Promise<void> => {
    if (steps.length === 0 || loopCount <= 0) {
      return;
    }

    abortRef.current = new AbortController();
    setStatus('running');
    setCurrentStepIndex(0);

    try {
      while (status !== 'paused' && status !== 'done') {
        if (!_isReadyToSend()) {
          break;
        }

        const step = steps[currentStepIndex];
        if (!step) break;

        // Send message to agent
        setStatus('waiting_agent');
        try {
          if (currentSessionId) {
            await opencodeClient.sendMessage?.(
              currentSessionId,
              step.message
            );
          }
        } catch (error) {
          console.error('[WorkflowQueue] Failed to send message:', error);
          setStatus('paused');
          break;
        }

        // Wait for agent to finish
        await _waitForAgentTurn();

        // Apply post-response delay
        if (step.waitAfterMs > 0) {
          setStatus('waiting_timer');
          await _executeWaitTimer(step.waitAfterMs);
        }

        // Move to next step
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
          setCurrentStepIndex(nextIndex);
          setStatus('running');
        } else {
          // End of steps, tick loop
          await _tickLoop();
          if (status === 'done') {
            break;
          }
        }
      }
    } catch (error) {
      console.error('[WorkflowQueue] Execution error:', error);
      setStatus('paused');
    }
  }, [
    steps,
    loopCount,
    status,
    currentStepIndex,
    currentSessionId,
    _isReadyToSend,
    _waitForAgentTurn,
    _executeWaitTimer,
    _tickLoop,
    setStatus,
    setCurrentStepIndex,
  ]);

  // Pause execution
  const pause = useCallback((): void => {
    setStatus('paused');
    abortRef.current?.abort?.();
  }, [setStatus]);

  // Resume from paused state
  const resume = useCallback(async (): Promise<void> => {
    if (status === 'paused') {
      await run();
    }
  }, [status, run]);

  // Reset to initial state
  const reset = useCallback((): void => {
    abortRef.current?.abort?.();
    resetStore();
  }, [resetStore]);

  return {
    // Display state
    steps,
    status,
    currentStepIndex,
    completedLoops,
    loopCount,
    loopDisplay: getLoopDisplay(),
    progress: {
      current: currentStepIndex + 1,
      total: steps.length * Math.max(loopCount, 1),
    },

    // Control actions
    run,
    pause,
    resume,
    reset,

    // Store actions (pass-through)
    addStep: useWorkflowQueueStore((s) => s.addStep),
    removeStep: useWorkflowQueueStore((s) => s.removeStep),
    updateStep: useWorkflowQueueStore((s) => s.updateStep),
    reorderSteps: useWorkflowQueueStore((s) => s.reorderSteps),
    setLoopCount: useWorkflowQueueStore((s) => s.setLoopCount),

    // Internal (for testing)
    _tickLoop,
    _waitForAgentTurn,
    _executeWaitTimer,
    _isReadyToSend,
  };
};
