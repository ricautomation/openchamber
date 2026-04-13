import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { getSafeStorage } from './utils/safeStorage';
import { nanoid } from 'nanoid';

export interface WorkflowStep {
  id: string;
  message: string;
  waitAfterMs: number;
}

export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'waiting_agent'
  | 'waiting_timer'
  | 'paused'
  | 'done';

export interface WorkflowQueueState {
  // Configuration
  steps: WorkflowStep[];
  loopCount: number;

  // Runtime state
  status: WorkflowStatus;
  currentStepIndex: number;
  completedLoops: number;

  // Actions
  addStep: (message: string, waitAfterMs?: number) => void;
  removeStep: (id: string) => void;
  updateStep: (id: string, message: string, waitAfterMs?: number) => void;
  reorderSteps: (startIndex: number, endIndex: number) => void;
  clearSteps: () => void;

  setLoopCount: (count: number) => void;
  setStatus: (status: WorkflowStatus) => void;
  setCurrentStepIndex: (index: number) => void;
  incrementCompletedLoops: () => void;

  reset: () => void;
}

const INITIAL_STATE = {
  steps: [],
  loopCount: 1,
  status: 'idle' as const,
  currentStepIndex: 0,
  completedLoops: 0,
};

export const useWorkflowQueueStore = create<WorkflowQueueState>()(
  devtools(
    persist(
      (set) => ({
        ...INITIAL_STATE,

        addStep: (message, waitAfterMs = 0) =>
          set((state) => ({
            steps: [
              ...state.steps,
              {
                id: nanoid(8),
                message,
                waitAfterMs,
              },
            ],
          })),

        removeStep: (id) =>
          set((state) => ({
            steps: state.steps.filter((step) => step.id !== id),
          })),

        updateStep: (id, message, waitAfterMs = 0) =>
          set((state) => ({
            steps: state.steps.map((step) =>
              step.id === id ? { ...step, message, waitAfterMs } : step
            ),
          })),

        reorderSteps: (startIndex, endIndex) =>
          set((state) => {
            const result = Array.from(state.steps);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return { steps: result };
          }),

        clearSteps: () =>
          set({ steps: [] }),

        setLoopCount: (count) =>
          set({ loopCount: Math.max(-1, count) }),

        setStatus: (status) =>
          set({ status }),

        setCurrentStepIndex: (index) =>
          set({ currentStepIndex: Math.max(0, index) }),

        incrementCompletedLoops: () =>
          set((state) => ({
            completedLoops: state.completedLoops + 1,
          })),

        reset: () =>
          set(INITIAL_STATE),
      }),
      {
        name: 'workflow-queue-store',
        storage: createJSONStorage(() => getSafeStorage()),
        partialize: (state) => ({
          steps: state.steps,
          loopCount: state.loopCount,
          status: state.status === 'waiting_agent' || state.status === 'running'
            ? 'paused'
            : state.status,
          currentStepIndex: state.currentStepIndex,
          completedLoops: state.completedLoops,
        }),
      }
    )
  )
);
