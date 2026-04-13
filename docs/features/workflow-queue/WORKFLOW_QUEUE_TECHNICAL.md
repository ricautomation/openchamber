# Workflow Queue - Technical Implementation Guide

**Status:** In Development  
**Branch:** `feat/workflow-queue`  
**Base PR:** TBD

---

## Architecture Overview

```
ChatInput.tsx (wrapper + toggle)
    ├── Manual Mode (existing)
    └── Workflow Mode (new)
        ├── WorkflowInput.tsx (UI)
        ├── useWorkflowQueue.ts (loop logic + SSE)
        └── workflowQueueStore.ts (state persistence)
```

### State Management

The workflow state is managed via **Zustand with persist middleware**:
- Persisted fields: `steps`, `loopCount`, `status`, current step index
- Non-persisted: `isRunning`, SSE listeners
- Recovery on reload: State restored to `paused` if interrupted during execution

### Message Flow

```
┌─────────────────────┐
│  WorkflowInput UI   │  User defines steps
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  useWorkflowQueue Hook              │  Loop coordinator
│  ├─ Manages SSE subscription        │
│  ├─ Sends messages via SDK          │
│  └─ Coordinates timer + step ticks  │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ opencode SDK (existing)              │  sendMessage() → HTTP
│ Event stream (SSE)                   │  listen() ← assistant.turn.end
└──────────────────────────────────────┘
```

---

## State Machine

### States

| State | Meaning | Transitions |
|-------|---------|-------------|
| `idle` | Workflow not running or reset | → `running` (on Run) |
| `running` | About to send message N | → `waiting_agent` |
| `waiting_agent` | Sent, awaiting SSE `turn.end` | → `waiting_timer` \| `running` |
| `waiting_timer` | Running `waitAfterMs` delay | → `running` \| `done` |
| `paused` | Manual pause by user | → `running` (Resume) \| `idle` (Reset) |
| `done` | All loops completed | → `idle` (Reset) |

### Loop Counter Semantics

```
loopCount = -1  →  Display: ♾️  → Never decrements (infinite)
loopCount = 0   →  Display: ⏸️  → Never starts (paused config)
loopCount = N   →  Display: N/N → Decrements: N → N-1 → ... → 0 → -1 (cycle via button)
```

---

## Core Hooks & Types

### `workflowQueueStore.ts`

```typescript
interface WorkflowStep {
  id: string;           // nanoid(8)
  message: string;      // Prompt to send
  waitAfterMs: number;  // Delay after SSE turn.end (default: 0)
}

interface WorkflowQueueState {
  // Configuration
  steps: WorkflowStep[];
  loopCount: number;
  
  // Runtime
  status: 'idle' | 'running' | 'waiting_agent' | 'waiting_timer' | 'paused' | 'done';
  currentStepIndex: number;
  completedLoops: number;
  
  // Actions
  addStep: (message: string) => void;
  removeStep: (id: string) => void;
  reorderSteps: (indices: number[]) => void;
  updateLoopCount: (count: number) => void;
  setStatus: (status: WorkflowQueueState['status']) => void;
  reset: () => void;
}
```

### `useWorkflowQueue.ts`

```typescript
interface UseWorkflowQueueReturn {
  // State
  steps: WorkflowStep[];
  status: WorkflowQueueState['status'];
  progress: { current: number; total: number };
  loopDisplay: string;  // "♾️", "⏸️", or "N/N"
  
  // Actions
  run: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  addStep: (message: string) => void;
  removeStep: (id: string) => void;
  
  // Internal
  _tickLoop: () => Promise<void>;
  _waitForAgentTurn: () => Promise<void>;
  _executeWaitTimer: (ms: number) => Promise<void>;
  _isReadyToSend: () => boolean;
}
```

---

## Implementation Checklist

- [ ] **Phase 1: Store**
  - [ ] Create `workflowQueueStore.ts` with Zustand + persist
  - [ ] Define `WorkflowStep`, `WorkflowQueueState` types
  - [ ] Implement actions: `addStep`, `removeStep`, `reorderSteps`, `setStatus`
  - [ ] Add recovery logic for reload (paused state)

- [ ] **Phase 2: Hook**
  - [ ] Create `useWorkflowQueue.ts`
  - [ ] Implement `run()` async coordinator
  - [ ] Implement `_tickLoop()` (loop counter logic)
  - [ ] Subscribe to SSE via `useEventStream()` → call `_waitForAgentTurn()`
  - [ ] Implement `_executeWaitTimer()` (setTimeout wrapper)
  - [ ] Add `_isReadyToSend()` predicate (status checks)

- [ ] **Phase 3: UI**
  - [ ] Create `WorkflowInput.tsx`
  - [ ] Render step list with reorder (drag-drop or arrow buttons)
  - [ ] Input field + "Add Step" button
  - [ ] Loop counter display + decrement button
  - [ ] Status bar: "Waiting for agent... 2/4"
  - [ ] Run, Pause, Resume, Reset buttons
  - [ ] Match styling of existing `ChatInput`

- [ ] **Phase 4: Integration**
  - [ ] Modify `ChatInput.tsx`: add toggle Manual ↔ Workflow
  - [ ] Wire up `sendMessage()` calls from hook → `opencode SDK`
  - [ ] Ensure both modes coexist without state conflicts

- [ ] **Phase 5: Testing & Validation**
  - [ ] `bun run type-check` passes
  - [ ] `bun run lint` passes
  - [ ] `bun run build` succeeds
  - [ ] Manual test: create steps, run, verify SSE event handling
  - [ ] Manual test: pause/resume/reset flows
  - [ ] Manual test: page reload during execution → recovery

---

## Key Design Decisions

### Why SSE, not Timer?

**Timer-based:**
```typescript
// ❌ Problem: Race condition
setTimeout(() => sendNextMessage(), 2000);
// Agent still processing, message overlaps
```

**SSE-based (chosen):**
```typescript
// ✅ Guaranteed
onSSEEvent('assistant.turn.end', () => {
  sendNextMessage();  // Only after agent finishes
});
```

### Why Persist State?

- User may close browser during workflow
- Reload should recover with `paused` status, not lose progress
- Zustand + `persist` middleware handles this automatically

### Why Not LLM-Orchestrated?

- Cost: extra token spend per step decision
- Latency: round-trip for each decision
- Non-determinism: same workflow, different choices
- **User wants explicit control** over each message

---

## Testing Strategy

### Unit Tests (if applicable)

- `_tickLoop()` behavior with various `loopCount` values
- `loopCount` decrement cycle: N → ... → 0 → -1 → ∞
- Status transitions and guards

### Integration Tests (manual for now)

1. **Basic workflow**: 3 steps, loopCount=1
   - [ ] Steps execute in order
   - [ ] Each waits for `turn.end`
   - [ ] Status updates correctly
   - [ ] Done after step 3

2. **Loop execution**: 2 steps, loopCount=2
   - [ ] Completes: step 1, step 2, step 1, step 2, done

3. **Pause/Resume**: Running → Pause → Resume
   - [ ] Pause stops execution
   - [ ] Resume continues from current step
   - [ ] No message duplication

4. **Page reload during `waiting_agent`**
   - [ ] Reload → state restored to `paused`
   - [ ] User can manually resume

5. **Infinite loop** (loopCount=-1)
   - [ ] Display shows ♾️
   - [ ] Stop button works (manual pause)

---

## Future Extensions (Out of Scope v1)

- **Conditional branching**: "If output contains 'error', retry step 2"
- **Multi-session broadcast**: Run same workflow in 2 sessions side-by-side
- **Import/export**: Save/load workflows as JSON files
- **Scheduling**: "Run this workflow daily at 9am"
- **AI orchestration**: "Decide next step based on agent output"
- **Push notifications**: Notify when workflow completes

---

## References

- Zustand persist: https://github.com/pmndrs/zustand#persist-middleware
- OpenCode SDK: `packages/web/src/lib/opencode/client.ts`
- Event stream hook: `packages/ui/src/hooks/useEventStream.ts`
- Similar pattern: `useQueuedMessageAutoSend.ts` (existing queuing logic)

---

*Last updated: 2026-04-13*
