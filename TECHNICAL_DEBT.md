# Technical Debt Register

## Active Items

### TD-001: Async dynamic import workaround in AfroSentinelProvider

**File:** `src/ingest/afro-sentinel.provider.ts` (lines 24-29)  
**Introduced:** 2026-03-14  
**Severity:** Low (contained, tested, no user impact)  
**Root cause:** Node.js v24.12.0 + tsx v4.21.0 ESM static-import resolution fails when the entry point is in a subdirectory (e.g. `scripts/test-*.ts`) and the target module (`signal.schemas.ts`) is imported via a named static import through a chain of relative paths.

**What happened:**
```
SyntaxError: The requested module '../data/signal.schemas'
does not provide an export named 'parseNormalizedSignal'
```

The export exists. Direct imports from the project root work. The failure is specific to the ESM module linker when resolving through a multi-hop relative path chain from a non-root entry point.

**Current fix:**
```ts
// Lazy-loaded to avoid Node.js v24 ESM static-import resolution edge case
let _schemas: typeof import('../data/signal.schemas') | null = null;
async function getSchemas() {
  if (!_schemas) _schemas = await import('../data/signal.schemas');
  return _schemas;
}
```

This made `afroSentinelToSignal()` async, which is not ideal — the function does no I/O and has no reason to be async except as a containment patch for the loader bug.

**Resolution conditions (remove this workaround when any of these are true):**
1. Node.js v24 fixes the ESM static-import resolution for subdirectory entry points
2. tsx updates to handle this case
3. The project migrates to a bundled test runner (e.g. vitest) that doesn't hit this path
4. The project drops tsx in favor of native Node.js TypeScript support (--experimental-strip-types)

**Impact if left unfixed:** None at runtime. The lazy import is cached after first call. The only architectural cost is that `afroSentinelToSignal` is async when it shouldn't need to be.

---

## Resolved Items

(none yet)
