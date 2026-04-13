# Workflow Queue - Complete Testing Guide

**Status:** Pre-commit validation  
**Date:** 2026-04-13  
**Branch:** `feat/workflow-queue`

> Since the project doesn't have automated test infrastructure (no vitest/jest), this guide covers **manual testing**, **type validation**, and **lint checks** to ensure the feature works correctly.

---

## Phase 0: Pre-Integration Validation

Before integrating with `ChatInput.tsx`, validate the foundation code.

### Step 1: Type Checking

```bash
cd /home/ricardo/Documentos/RicAutomationProjects/openchamber

# Type check the entire project
bun run type-check

# Expected output:
# ✓ No type errors
# ✓ All .ts/.tsx files compile
```

**What this validates:**
- Zustand store types are correct
- Hook return types are compatible
- Component props are properly typed
- No implicit `any` types

### Step 2: Linting

```bash
# Lint all packages
bun run lint

# Or just UI package
bun run --cwd packages/ui lint

# Expected output:
# ✓ No eslint errors
# ✓ No unused imports
# ✓ Consistent code style
```

**What this validates:**
- React hooks dependencies correct (no missing deps)
- No dead code
- Style consistency with project

### Step 3: Build

```bash
# Build all packages
bun run build

# Or just UI
bun run --cwd packages/ui build

# Expected output:
# ✓ Build succeeds
# ✓ No TypeScript errors
# ✓ All modules resolve
```

**What this validates:**
- No circular dependencies
- All imports are resolvable
- No runtime issues from imports

### Validation Commands Checklist

```bash
# Copy-paste these in order:

echo "=== PHASE 0: VALIDATION ===" && \
echo "Step 1: Type Check..." && \
bun run type-check && \
echo "✓ Type check passed" && \
echo "" && \
echo "Step 2: Lint..." && \
bun run lint && \
echo "✓ Lint passed" && \
echo "" && \
echo "Step 3: Build..." && \
bun run build && \
echo "✓ Build passed" && \
echo "" && \
echo "=== ALL VALIDATIONS PASSED ==="
```

---

## Phase 1: Store Testing (`useWorkflowQueueStore.ts`)

Test the Zustand store in isolation.

### Test 1.1: Store Creation

**Objective:** Verify store initializes with correct default values

```typescript
// In browser console or Node REPL:

import { useWorkflowQueueStore } from '@/stores/useWorkflowQueueStore';

const store = useWorkflowQueueStore.getState();

console.assert(store.steps.length === 0, 'Initial steps should be empty');
console.assert(store.loopCount === 1, 'Initial loopCount should be 1');
console.assert(store.status === 'idle', 'Initial status should be idle');
console.assert(store.currentStepIndex === 0, 'Initial index should be 0');
console.assert(store.completedLoops === 0, 'Initial loops should be 0');

console.log('✓ Store initialization test passed');
```

**Expected:**
- All assertions pass
- No console errors

### Test 1.2: Add Steps

```typescript
const { addStep } = useWorkflowQueueStore.getState();

// Add 3 steps
addStep('Generate user model');
addStep('Create CRUD endpoints');
addStep('Write tests');

const state = useWorkflowQueueStore.getState();

console.assert(state.steps.length === 3, '3 steps added');
console.assert(state.steps[0].message === 'Generate user model', 'Step 1 message correct');
console.assert(state.steps[1].message === 'Create CRUD endpoints', 'Step 2 message correct');
console.assert(state.steps[2].message === 'Write tests', 'Step 3 message correct');
console.assert(state.steps[0].waitAfterMs === 0, 'Default waitAfterMs is 0');

console.log('✓ Add steps test passed');
```

**Expected:**
- 3 steps in store
- Messages are correct
- Each step has unique ID

### Test 1.3: Remove Steps

```typescript
const { removeStep } = useWorkflowQueueStore.getState();
const firstStepId = useWorkflowQueueStore.getState().steps[0].id;

removeStep(firstStepId);

const state = useWorkflowQueueStore.getState();

console.assert(state.steps.length === 2, '1 step removed');
console.assert(state.steps[0].message === 'Create CRUD endpoints', 'Correct step removed');

console.log('✓ Remove steps test passed');
```

**Expected:**
- First step removed
- Remaining steps shifted correctly

### Test 1.4: Reorder Steps

```typescript
const { reorderSteps, addStep, reset } = useWorkflowQueueStore.getState();
reset();

addStep('Step A');
addStep('Step B');
addStep('Step C');

// Reorder: move step at index 2 (C) to index 0
reorderSteps(2, 0);

const state = useWorkflowQueueStore.getState();

console.assert(state.steps[0].message === 'Step C', 'Step C moved to index 0');
console.assert(state.steps[1].message === 'Step A', 'Step A at index 1');
console.assert(state.steps[2].message === 'Step B', 'Step B at index 2');

console.log('✓ Reorder steps test passed');
```

**Expected:**
- Steps reorder correctly
- Order is preserved

### Test 1.5: Loop Count Management

```typescript
const { setLoopCount } = useWorkflowQueueStore.getState();

// Test valid values
setLoopCount(5);
console.assert(useWorkflowQueueStore.getState().loopCount === 5, 'Set to 5');

setLoopCount(1);
console.assert(useWorkflowQueueStore.getState().loopCount === 1, 'Set to 1');

setLoopCount(-1);
console.assert(useWorkflowQueueStore.getState().loopCount === -1, 'Set to -1 (infinite)');

setLoopCount(0);
console.assert(useWorkflowQueueStore.getState().loopCount === 0, 'Set to 0 (paused)');

// Test that negative values are clamped to -1
setLoopCount(-100);
console.assert(useWorkflowQueueStore.getState().loopCount === -1, 'Clamped to -1');

console.log('✓ Loop count test passed');
```

**Expected:**
- All loop counts set correctly
- Negative values clamped to -1

### Test 1.6: Status Transitions

```typescript
const { setStatus } = useWorkflowQueueStore.getState();

const validStatuses = ['idle', 'running', 'waiting_agent', 'waiting_timer', 'paused', 'done'];

validStatuses.forEach((status) => {
  setStatus(status);
  console.assert(
    useWorkflowQueueStore.getState().status === status,
    `Status changed to ${status}`
  );
});

console.log('✓ Status transitions test passed');
```

**Expected:**
- All status values accepted
- Status updates correctly

### Test 1.7: Reset

```typescript
const { reset } = useWorkflowQueueStore.getState();

// Mutate state
useWorkflowQueueStore.getState().addStep('Test step');
useWorkflowQueueStore.getState().setLoopCount(5);
useWorkflowQueueStore.getState().setStatus('running');

// Reset
reset();

const state = useWorkflowQueueStore.getState();

console.assert(state.steps.length === 0, 'Steps cleared');
console.assert(state.loopCount === 1, 'Loop count reset to 1');
console.assert(state.status === 'idle', 'Status reset to idle');
console.assert(state.currentStepIndex === 0, 'Index reset to 0');

console.log('✓ Reset test passed');
```

**Expected:**
- All state reset to initial values

### Test 1.8: Persistence

```bash
# After all store tests pass:

# 1. In browser, add some steps and set loopCount to 3
useWorkflowQueueStore.getState().addStep('Persistent step 1');
useWorkflowQueueStore.getState().addStep('Persistent step 2');
useWorkflowQueueStore.getState().setLoopCount(3);

# 2. Check localStorage:
localStorage.getItem('workflow-queue-store')

# Expected output:
# {"state":{"steps":[...], "loopCount":3, ...}}

# 3. Reload page (F5 or Cmd+R)

# 4. Verify state restored:
console.log(useWorkflowQueueStore.getState().steps.length); // Should be 2
console.log(useWorkflowQueueStore.getState().loopCount); // Should be 3
```

**Expected:**
- State persists to localStorage
- State restores after page reload

---

## Phase 2: Hook Testing (`useWorkflowQueue.ts`)

Test the hook logic in isolation (harder without full integration, but check syntax and types).

### Test 2.1: Hook Initialization

```typescript
import { useWorkflowQueue } from '@/hooks/useWorkflowQueue';

// In a test React component:
function TestHook() {
  const {
    steps,
    status,
    currentStepIndex,
    loopDisplay,
    progress,
    run,
    pause,
    reset,
  } = useWorkflowQueue();

  return (
    <div>
      <p>Status: {status}</p>
      <p>Loop: {loopDisplay}</p>
      <p>Progress: {progress.current}/{progress.total}</p>
      <button onClick={run}>Run</button>
      <button onClick={pause}>Pause</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

// Render component:
// ✓ Should render without errors
// ✓ Status should be 'idle'
// ✓ loopDisplay should be '⏸️' or '♾️' or 'N/N'
// ✓ progress should be { current: 1, total: 0 } (no steps)
```

**Expected:**
- Hook returns correctly typed values
- Default state is idle
- No runtime errors

### Test 2.2: Loop Display Logic

```typescript
import { useWorkflowQueueStore } from '@/stores/useWorkflowQueueStore';

// Simulate different loopCount values and check display:

const testCases = [
  { loopCount: 1, completedLoops: 0, expected: '1/1' },
  { loopCount: 3, completedLoops: 0, expected: '3/3' },
  { loopCount: 3, completedLoops: 1, expected: '2/3' },
  { loopCount: -1, completedLoops: 0, expected: '♾️' },
  { loopCount: 0, completedLoops: 0, expected: '⏸️' },
];

testCases.forEach(({ loopCount, completedLoops, expected }) => {
  useWorkflowQueueStore.getState().setLoopCount(loopCount);
  useWorkflowQueueStore.getState().setCurrentStepIndex(0);
  useWorkflowQueueStore.getState().completedLoops = completedLoops;

  // Re-render component and check loopDisplay
  console.assert(
    componentLoopDisplay === expected,
    `Loop display for count=${loopCount}, completed=${completedLoops} should be ${expected}`
  );
});

console.log('✓ Loop display logic test passed');
```

**Expected:**
- Loop display shows correct format
- Infinity symbol appears for -1
- Pause symbol appears for 0

---

## Phase 3: Component Testing (`WorkflowInput.tsx`)

Test the UI component rendering and user interactions.

### Test 3.1: Component Renders

```typescript
import { WorkflowInput } from '@/components/chat/WorkflowInput';
import { render } from '@testing-library/react';

// Or manually in browser:
// Add a test div and render the component

// ✓ Component renders without errors
// ✓ "No steps added yet" message visible
// ✓ Input field is present
// ✓ Add button is present
// ✓ Loop counter visible
// ✓ Run button visible
```

**Expected:**
- All UI elements render
- No console errors

### Test 3.2: Add Step UI

**Steps:**

1. Open the app where `WorkflowInput` renders
2. Type in the input: "Install dependencies"
3. Click "Add" button
4. Verify:
   - Step appears in list
   - Input clears
   - Input focuses for next step

**Expected:**
- Step added to list
- Input clears
- Can add multiple steps

### Test 3.3: Remove Step

**Steps:**

1. Add 3 steps
2. Click trash icon on step 2
3. Verify:
   - Step 2 removed
   - Remaining steps shift up
   - Step count is now 2

**Expected:**
- Step removed correctly
- UI updates

### Test 3.4: Reorder Steps

**Steps:**

1. Add steps: "A", "B", "C"
2. Click up arrow on step 3 (C)
3. Verify C moves to position 2
4. Click up arrow again
5. Verify C moves to position 1

**Expected:**
- Steps reorder visually
- Order matches store

### Test 3.5: Loop Counter

**Steps:**

1. Check loop display shows "1/1"
2. Click the ↻ (decrement) button
3. Verify display changes to "0/0" (⏸️)
4. Click ↻ again
5. Verify display changes to "♾️" (-1)
6. Click ↻ again
7. Verify display changes to "1/1" (cycle)

**Expected:**
- Loop counter cycles: N → ... → 1 → 0(⏸️) → -1(♾️) → 1 → ...
- Display updates

---

## Phase 4: Integration Testing

### Test 4.1: Pre-Integration Syntax Check

Before integrating with `ChatInput.tsx`, verify no syntax errors:

```bash
# Check if files have syntax errors
node -c packages/ui/src/stores/useWorkflowQueueStore.ts
node -c packages/ui/src/hooks/useWorkflowQueue.ts
node -c packages/ui/src/components/chat/WorkflowInput.tsx

# Expected output:
# ✓ No errors
```

### Test 4.2: Import Resolution

```typescript
// In app entry point (main.tsx or App.tsx), try importing:

import { useWorkflowQueueStore } from '@/stores/useWorkflowQueueStore';
import { useWorkflowQueue } from '@/hooks/useWorkflowQueue';
import { WorkflowInput } from '@/components/chat/WorkflowInput';

// If no red squiggles in IDE and builds succeed, imports work
```

**Expected:**
- No import errors
- All files resolve

### Test 4.3: Zustand Integration

```typescript
// Verify Zustand is available and works:

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

// These are already used in existing stores, so should work
console.log('✓ Zustand middleware available');
```

**Expected:**
- Zustand middleware imports work

---

## Phase 5: Manual Workflow Execution (After Integration)

> These tests are for **after** integrating with `ChatInput.tsx`

### Test 5.1: Basic Workflow (3 steps, 1 loop)

**Setup:**

1. Switch to "Workflow" mode in chat input
2. Add steps:
   - "Generate TypeScript types for User model"
   - "Create REST endpoints: GET /users, POST /users"
   - "Write unit tests for endpoints"
3. Verify loopCount = 1 (display shows "3/3")

**Execute:**

1. Click "Run"
2. Observe status changes: "Running" → "Waiting for agent" → [agent responds] → "Running" → ...
3. Wait for completion

**Verify:**

```
✓ Step 1 executes (agent receives first prompt)
✓ Step 2 executes (after agent responds to step 1)
✓ Step 3 executes (after agent responds to step 2)
✓ Status shows "3/3" when all steps complete
✓ Status changes to "Done"
✓ Run button changes to Reset
```

### Test 5.2: Multiple Loops (2 steps, 2 loops)

**Setup:**

1. Add steps:
   - "Run npm test"
   - "Generate coverage report"
2. Set loopCount to 2 (click ↻ button)

**Execute:**

1. Click "Run"
2. Wait for completion

**Verify:**

```
✓ Loop 1: Step 1 → Step 2
✓ Loop 2: Step 1 → Step 2
✓ Status shows "4/4" when done (2 steps × 2 loops)
✓ Status = "Done" after all loops complete
```

### Test 5.3: Pause and Resume

**Setup:**

1. Add 5 steps
2. Click "Run"

**During execution:**

1. Wait for step 3 to start
2. Click "Pause" button

**Verify:**

```
✓ Status changes to "Paused"
✓ No more messages sent to agent
✓ Progress shows current step index
```

**Resume:**

1. Click "Resume" button
2. Wait for completion

**Verify:**

```
✓ Execution continues from step 3
✓ No duplicate messages sent
✓ All steps complete
```

### Test 5.4: Reset

**Setup:**

1. Run a workflow to completion
2. Status = "Done"

**Execute:**

1. Click "Reset" button

**Verify:**

```
✓ Status changes to "Idle"
✓ currentStepIndex resets to 0
✓ loopCount resets to 1 (or whatever was set)
✓ Can click "Run" again for fresh execution
```

### Test 5.5: Infinite Loop (loopCount = -1)

**Setup:**

1. Add 2 steps
2. Click ↻ until loopDisplay shows "♾️" (-1)
3. Click "Run"

**Verify:**

```
✓ Workflow loops indefinitely (step 1 → step 2 → step 1 → ...)
✓ "Pause" button available to stop
✓ Click "Pause" to stop infinite loop
```

### Test 5.6: Page Reload During Execution

**Setup:**

1. Add 4 steps
2. Click "Run"
3. Wait until step 2 is executing (status = "Waiting for agent")

**Execute:**

1. Press F5 (or Cmd+R on Mac) to reload page

**Verify (immediately after reload):**

```
✓ Workflow state persisted (steps still in list)
✓ Status = "Paused" (recovered from waiting_agent)
✓ currentStepIndex shows where it stopped
✓ Click "Resume" to continue from step 2
```

### Test 5.7: Mode Toggle (Manual ↔ Workflow)

**Setup:**

1. In Workflow mode, add steps and click "Run"

**Execute:**

1. Try clicking "Manual" tab during execution

**Verify:**

```
✓ Manual tab is disabled (can't click during execution)
✓ Can click Manual after pausing
✓ Manual mode shows standard chat input
✓ Workflow mode shows step list and controls
```

---

## Validation Checklist

Before marking the feature as "ready for PR":

### Code Quality

- [ ] `bun run type-check` passes (no TypeScript errors)
- [ ] `bun run lint` passes (no eslint errors)
- [ ] `bun run build` succeeds (no build errors)
- [ ] No console errors in browser devtools

### Store Tests

- [ ] ✓ Store initialization test passed
- [ ] ✓ Add steps test passed
- [ ] ✓ Remove steps test passed
- [ ] ✓ Reorder steps test passed
- [ ] ✓ Loop count test passed
- [ ] ✓ Status transitions test passed
- [ ] ✓ Reset test passed
- [ ] ✓ Persistence test passed (localStorage)

### Component Tests

- [ ] ✓ Component renders without errors
- [ ] ✓ Add step UI works
- [ ] ✓ Remove step UI works
- [ ] ✓ Reorder steps UI works
- [ ] ✓ Loop counter cycles correctly
- [ ] ✓ All buttons are present and clickable

### Integration Tests (Post-Integration)

- [ ] ✓ Basic workflow executes (3 steps, 1 loop)
- [ ] ✓ Multiple loops work (2 steps, 2 loops)
- [ ] ✓ Pause/Resume works
- [ ] ✓ Reset works
- [ ] ✓ Infinite loop works
- [ ] ✓ Page reload recovery works
- [ ] ✓ Mode toggle works

### Edge Cases

- [ ] ✓ Empty steps list (0 steps) - Run button disabled
- [ ] ✓ loopCount = 0 - Run button disabled
- [ ] ✓ Single step workflow - executes once
- [ ] ✓ Very long message - input handles it
- [ ] ✓ Agent timeout - workflow handles gracefully

---

## Debugging Tips

### If type-check fails:

```bash
# See detailed errors:
bun run type-check 2>&1 | head -50

# Check specific file:
npx tsc --noEmit packages/ui/src/stores/useWorkflowQueueStore.ts
```

### If lint fails:

```bash
# See all errors:
bun run lint 2>&1 | head -50

# Fix auto-fixable issues:
bun run lint -- --fix
```

### If build fails:

```bash
# See detailed build output:
bun run build 2>&1 | tail -100
```

### If store tests fail:

1. Open browser devtools (F12)
2. Go to Console tab
3. Paste test code directly
4. Check assertion messages
5. Look for import errors

### If component doesn't render:

1. Check browser console for React errors
2. Verify component is exported from file
3. Check import path in test component
4. Verify all dependencies are imported

### If workflow doesn't execute:

1. Check browser Network tab for sendMessage() calls
2. Verify SSE events in Network → EventStream
3. Check for JavaScript errors in Console
4. Verify currentSessionId is not null

---

## Running All Tests at Once

Create this script to run everything:

```bash
# save as `test-workflow-queue.sh`

#!/bin/bash

echo "============================================"
echo "Workflow Queue - Complete Testing Suite"
echo "============================================"
echo ""

echo "Phase 0: Validation"
echo "==================="
echo "Running type-check..."
bun run type-check || { echo "❌ Type-check failed"; exit 1; }
echo "✓ Type-check passed"
echo ""

echo "Running lint..."
bun run lint || { echo "❌ Lint failed"; exit 1; }
echo "✓ Lint passed"
echo ""

echo "Running build..."
bun run build || { echo "❌ Build failed"; exit 1; }
echo "✓ Build passed"
echo ""

echo "============================================"
echo "✓ ALL VALIDATIONS PASSED"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Integrate with ChatInput.tsx"
echo "2. Run manual workflow execution tests"
echo "3. Test pause/resume/reset flows"
echo "4. Test page reload recovery"
echo ""
```

```bash
# Make executable and run:
chmod +x test-workflow-queue.sh
./test-workflow-queue.sh
```

---

## Success Criteria

✅ **Ready for Commit when:**

- [ ] All validation commands pass (type-check, lint, build)
- [ ] All store tests pass
- [ ] All component tests pass
- [ ] No browser console errors
- [ ] Code follows project style guide
- [ ] Documentation is complete

✅ **Ready for Integration when:**

- [ ] ChatInput.tsx modified to show toggle
- [ ] All integration tests pass
- [ ] Workflow executes end-to-end
- [ ] Pause/resume/reset work
- [ ] Page reload recovery works

✅ **Ready for PR when:**

- [ ] All above criteria met
- [ ] Commit message is clear and descriptive
- [ ] PR description explains feature and design
- [ ] No merge conflicts with main branch

---

*Testing Guide for Workflow Queue Feature*  
*Last updated: 2026-04-13*
