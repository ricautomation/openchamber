import React, { useState } from 'react';
import { Plus, Trash2, Play, Pause, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { useWorkflowQueue } from '@/hooks/useWorkflowQueue';
import { clsx } from 'clsx';

/**
 * WorkflowInput Component
 *
 * Displays the workflow queue interface:
 * - List of steps with reorder controls
 * - Add/remove step buttons
 * - Loop counter with decrement
 * - Status display
 * - Run/Pause/Resume/Reset controls
 */
export const WorkflowInput = () => {
  const {
    steps,
    status,
    currentStepIndex,
    loopDisplay,
    progress,
    loopCount,
    run,
    pause,
    resume,
    reset,
    addStep,
    removeStep,
    reorderSteps,
    setLoopCount,
  } = useWorkflowQueue();

  const [newStepMessage, setNewStepMessage] = useState('');

  const handleAddStep = () => {
    if (newStepMessage.trim()) {
      addStep(newStepMessage.trim());
      setNewStepMessage('');
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < steps.length) {
      reorderSteps(index, newIndex);
    }
  };

  const decrementLoopCount = () => {
    if (loopCount === -1) {
      setLoopCount(1);
    } else if (loopCount === 0) {
      setLoopCount(-1);
    } else {
      setLoopCount(loopCount - 1);
    }
  };

  const isRunning = status === 'running' || status === 'waiting_agent' || status === 'waiting_timer';
  const isPaused = status === 'paused';
  const isDone = status === 'done';

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface border border-separator rounded-lg">
      {/* Step List */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={clsx(
              'flex items-center gap-2 p-2 bg-layer-1 rounded border',
              index === currentStepIndex && isRunning
                ? 'border-primary bg-primary/10'
                : 'border-separator'
            )}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMoveStep(index, 'up')}
                disabled={index === 0 || isRunning}
                className="p-1 hover:bg-layer-2 disabled:opacity-50 rounded"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => handleMoveStep(index, 'down')}
                disabled={index === steps.length - 1 || isRunning}
                className="p-1 hover:bg-layer-2 disabled:opacity-50 rounded"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <span className="text-xs font-mono text-text-secondary min-w-fit">
              {index + 1}
            </span>

            <p className="flex-1 text-sm text-text-primary truncate">
              {step.message}
            </p>

            <button
              onClick={() => removeStep(step.id)}
              disabled={isRunning}
              className="p-1 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-4 text-text-secondary text-sm">
            No steps added yet
          </div>
        )}
      </div>

      {/* Add Step Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newStepMessage}
          onChange={(e) => setNewStepMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddStep();
            }
          }}
          placeholder="Add a step..."
          disabled={isRunning}
          className="flex-1 px-2 py-1 bg-layer-1 border border-separator rounded text-sm placeholder-text-secondary disabled:opacity-50"
        />
        <button
          onClick={handleAddStep}
          disabled={!newStepMessage.trim() || isRunning}
          className="p-1 bg-primary/20 hover:bg-primary/30 disabled:opacity-50 rounded flex items-center gap-1 text-sm"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-text-secondary px-2 py-1 bg-layer-1 rounded border border-separator">
        <div>
          {isRunning && (
            <span>
              {status === 'waiting_agent'
                ? 'Waiting for agent...'
                : status === 'waiting_timer'
                  ? 'Waiting...'
                  : 'Running...'}
            </span>
          )}
          {isPaused && <span>Paused</span>}
          {isDone && <span>Done</span>}
          {status === 'idle' && <span>Ready</span>}
        </div>
        <span>
          {progress.current} / {progress.total}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isRunning && !isDone && (
          <button
            onClick={run}
            disabled={steps.length === 0 || loopCount <= 0}
            className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded text-sm font-medium flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Run
          </button>
        )}

        {isRunning && (
          <button
            onClick={pause}
            className="flex-1 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-sm font-medium flex items-center justify-center gap-2"
          >
            <Pause size={16} />
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={resume}
            className="flex-1 px-3 py-2 bg-primary/70 hover:bg-primary/80 rounded text-sm font-medium flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Resume
          </button>
        )}

        {(isPaused || isDone) && (
          <button
            onClick={reset}
            className="px-3 py-2 bg-layer-2 hover:bg-layer-3 rounded text-sm flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}

        {/* Loop Counter */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-sm font-medium">{loopDisplay}</span>
          <button
            onClick={decrementLoopCount}
            disabled={isRunning}
            className="p-1 hover:bg-layer-2 disabled:opacity-50 rounded text-xs"
            title="Cycle loop count: N → ... → 1 → 0(⏸️) → -1(♾️)"
          >
            ↻
          </button>
        </div>
      </div>
    </div>
  );
};
