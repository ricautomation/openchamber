# Workflow Queue - Architecture Notes & API Discovery

**Date:** 2026-04-13  
**Status:** API verification for implementation

---

## Real API Findings

### 1. Sending Messages

**Actual usage pattern (from codebase):**

```typescript
// Option A: Via opencodeClient
await opencodeClient.sendMessage({
  id: sessionId,              // Required: session ID
  providerID,                 // Required: provider ID
  modelID,                    // Required: model ID  
  agent: agentName,           // Required: agent name
  variant,                    // Optional: variant
  parts: [{type: 'text', text: message}]  // Message content
});

// Option B: Via useSessionUIStore (higher level)
useSessionUIStore.getState().sendMessage(
  message,                    // message text
  providerID,                 // provider
  modelID,                    // model
  agentName,                  // agent (optional)
  variantName                 // variant (optional)
);
```

### 2. Event Listening

**Investigation needed:**
- Where does `turn.end` event come from?
- How is SSE subscribed in existing hooks?
- What event stream API exists?

**Next step:** Search for `useEventStream` or similar hooks

### 3. Dependencies Missing

The implementation needs:
- `nanoid` - for generating step IDs
- `lucide-react` icons - for UI buttons

**Status:** Will be added to package.json

---

## Next Phase: Corrected Implementation

1. Fix imports and API calls
2. Install missing dependencies
3. Re-run type-check
4. Complete validation

---

*API notes for workflow-queue feature implementation*
