# Workflow Queue - Integration Guide

**Phase:** 4 (Integration with ChatInput)  
**Status:** To be implemented

---

## Integration Points

### 1. ChatInput.tsx Wrapper

The `ChatInput.tsx` component needs a toggle to switch between **Manual** and **Workflow** modes.

```typescript
// In ChatInput.tsx

const [mode, setMode] = useState<'manual' | 'workflow'>('manual');

return (
  <div className="flex flex-col gap-2">
    {/* Mode Toggle */}
    <div className="flex gap-2 border-b border-separator px-3 py-2">
      <button
        className={clsx('text-sm font-medium', mode === 'manual' && 'text-primary')}
        onClick={() => setMode('manual')}
      >
        ✏️ Manual
      </button>
      <button
        className={clsx('text-sm font-medium', mode === 'workflow' && 'text-primary')}
        onClick={() => setMode('workflow')}
      >
        ⚡ Workflow
      </button>
    </div>

    {/* Conditional Render */}
    {mode === 'manual' && <ChatInputManual />}
    {mode === 'workflow' && <WorkflowInput />}
  </div>
);
```

### 2. Message Sending Integration

The `useWorkflowQueue` hook calls `opencodeClient.sendMessage()` directly.

**Assumption:** The OpenCode SDK client is available at:
```typescript
import { opencodeClient } from '@/lib/opencode/client';
```

**Verification needed:**
- [ ] Confirm `opencodeClient.sendMessage()` exists and signature
- [ ] Confirm `opencodeClient.onStreamEvent()` or SSE subscription method
- [ ] Check how existing code (e.g., `useQueuedMessageAutoSend.ts`) integrates

### 3. SSE Event Subscription

The workflow hook listens for `assistant.turn.end` events via:
```typescript
opencodeClient.onStreamEvent?.((event) => {
  if (event.type === 'assistant' && event.data.type === 'turn.end') {
    // Mark agent turn as complete
  }
});
```

**Verification needed:**
- [ ] Confirm `onStreamEvent` API or alternative
- [ ] Check existing hooks like `useEventStream.ts` for pattern

### 4. Session Context

The workflow needs the current session ID to send messages:
```typescript
const currentSessionId = useSessionUIStore((s) => s.currentSessionId);
```

This is already sourced from `useSessionUIStore` in the hook.

---

## Checklist for Integration

- [ ] Review `ChatInput.tsx` to understand mode structure
- [ ] Verify `opencodeClient.sendMessage()` signature
- [ ] Verify SSE/event subscription API
- [ ] Test manual mode still works after toggle addition
- [ ] Test workflow mode basic run (3 steps, no loops)
- [ ] Test workflow mode pause/resume/reset
- [ ] Verify Zustand persist middleware works
- [ ] Run type-check, lint, build

---

## Potential Issues & Mitigations

### Race Condition: User Switches to Manual While Running

**Problem:** User switches mode while workflow is running.

**Mitigation:**
- Disable mode toggle while `status !== 'idle'`
- Auto-pause workflow if user switches mode

```typescript
<button disabled={status !== 'idle'} onClick={() => setMode('manual')}>
  Manual
</button>
```

### SSE Event Missing

**Problem:** `turn.end` event doesn't fire or client doesn't expose it.

**Mitigation:**
- Add fallback timer: "If no turn.end after 5 minutes, timeout"
- Log all SSE events for debugging
- Check `useEventStream.ts` for correct API

### Session ID Changes

**Problem:** User navigates away or starts new session while workflow running.

**Mitigation:**
- Listen to `currentSessionId` changes
- Auto-pause if session changes
- Clear workflow state on new session

```typescript
useEffect(() => {
  if (status === 'running' && prevSessionId.current !== currentSessionId) {
    pause();
  }
  prevSessionId.current = currentSessionId;
}, [currentSessionId]);
```

---

## Testing Checklist

### Manual Tests

1. **Mode Toggle**
   - [ ] Click Manual ↔ Workflow
   - [ ] Both UIs render correctly
   - [ ] Toggle disabled during workflow execution

2. **Add/Remove Steps**
   - [ ] Add 5 steps
   - [ ] Remove middle step
   - [ ] Reorder steps (move up/down)
   - [ ] Can't modify while running

3. **Basic Run**
   - [ ] 3 steps, loopCount=1
   - [ ] Run button starts execution
   - [ ] Steps execute in order
   - [ ] Status updates: idle → running → waiting_agent → done

4. **Multiple Loops**
   - [ ] 2 steps, loopCount=2
   - [ ] Completes all 4 executions (2 steps × 2 loops)
   - [ ] Loop counter decrements correctly

5. **Pause/Resume**
   - [ ] Pause during step 2
   - [ ] Status = paused
   - [ ] Resume continues from step 2
   - [ ] No duplicate messages

6. **Reset**
   - [ ] Run workflow
   - [ ] Click Reset
   - [ ] Status → idle, index → 0, completedLoops → 0

7. **Page Reload**
   - [ ] Start workflow
   - [ ] Reload page during `waiting_agent`
   - [ ] State persists but status → paused
   - [ ] Can resume after reload

8. **Infinite Loop**
   - [ ] Set loopCount to -1 (♾️)
   - [ ] Run workflow
   - [ ] Cycles indefinitely
   - [ ] Stop with Pause button

### Automated Tests (if applicable)

```typescript
describe('useWorkflowQueue', () => {
  it('should execute steps in order', async () => {
    // Mock opencodeClient
    // Add 3 steps
    // run()
    // Verify sendMessage called 3 times in order
  });

  it('should decrement loopCount correctly', () => {
    // N → ... → 1 → 0 → -1 → cycle
  });

  it('should respect waitAfterMs delay', async () => {
    // Add step with 100ms waitAfterMs
    // Measure time between SSE event and next sendMessage
  });
});
```

---

## Rollback Plan

If integration reveals issues:

1. **Soft rollback:** Disable workflow toggle (set to `style={{ display: 'none' }}`)
2. **Medium rollback:** Remove workflow components, keep store/hooks
3. **Full rollback:** `git revert feat/workflow-queue`

---

## Post-Integration Tasks

- [ ] Update README with workflow feature mention
- [ ] Add keyboard shortcut for mode toggle (if desired)
- [ ] Monitor error logs for SSE issues
- [ ] Gather user feedback on workflow UX
- [ ] Plan next-phase extensions (conditional branching, etc.)

---

*Last updated: 2026-04-13*
