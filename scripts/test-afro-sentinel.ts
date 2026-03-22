/**
 * Runtime Verification — AfroSentinelProvider (W1-W9)
 * Full 11-point proof surface:
 *
 *   1. Constructor fails correctly when env missing
 *   2. connected() returns false on auth failure (401/403)
 *   3. Fetch times out correctly (AbortController)
 *   4. Stale event timestamps are rejected
 *   5. Provider does not own truth verdict (no truthPassed)
 *   6. 0,0 is valid only when actually present
 *   7. null/"" coords do not become 0,0
 *   8. Congo split behaves correctly (CD vs CG)
 *   9. Dedupe removes duplicate IDs
 *  10. Row-limit warning fires at 100
 *  11. No mock fallback path exists
 *
 * Also: disease mapping, country normalization, triangulation prompt.
 */

import { AfroSentinelProvider, AfroSentinelSignalSchema, buildTriangulationPrompt } from '../src/ingest/afro-sentinel.provider';

// ─── Test harness ───────────────────────────────────────────

let pass = 0;
let fail = 0;
const logs: string[] = [];

function assert(label: string, condition: boolean, detail?: unknown) {
  if (condition) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`, detail ?? ''); }
}

// Capture console.warn output for assertion
const originalWarn = console.warn;
function captureWarns(fn: () => void | Promise<void>): Promise<string[]> {
  const captured: string[] = [];
  console.warn = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  const result = fn();
  const p = result instanceof Promise ? result : Promise.resolve(result);
  return p.then(() => {
    console.warn = originalWarn;
    return captured;
  }).catch((err) => {
    console.warn = originalWarn;
    throw err;
  });
}

// Mock fetch helpers
function mockResponse(data: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status, statusText,
    headers: new Headers(), redirected: false, type: 'basic',
    body: null, bodyUsed: false, url: '',
    clone: () => { throw new Error('not impl'); },
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

// ─── Mock data ──────────────────────────────────────────────

const now = new Date().toISOString();
const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(); // 72h ago

const mockSignals = [
  {
    id: '101', disease: 'Cholera', country: 'Kenya',
    location: 'Busia Border Point', latitude: 0.4605, longitude: 34.1117,
    status: 'validated', priority: 'P1', who_grade: 2, confidence: 0.95,
    event_date: now, created_at: now,
  },
  {
    id: '102', disease: 'Unknown Fever', country: 'Uganda',
    location: 'Mubende', latitude: 0.56, longitude: 31.39,
    status: 'validated', priority: 'P2', who_grade: 1, confidence: 0.85,
    event_date: now, created_at: now,
  },
  {
    id: '103', disease: 'Flu', country: 'Tanzania',
    location: 'Arusha',
    // No lat/lon
    status: 'validated', priority: 'P3', confidence: 0.40,
    event_date: now, created_at: now,
  },
  {
    id: '104', disease: 'Ebola virus disease',
    country: 'Democratic Republic of the Congo',
    location: 'Goma', latitude: -1.6741, longitude: 29.2248,
    status: 'escalated', priority: 'P1', who_grade: 3, ai_confidence: 0.92,
    event_date: now, created_at: now,
  },
  {
    id: '105', disease: 'Viral hemorrhagic fever',
    country: 'Republic of Congo',
    location: 'Brazzaville', latitude: -4.2634, longitude: 15.2429,
    status: 'validated', priority: 'P1', who_grade: 2, ai_confidence: 0.80,
    event_date: now, created_at: now,
  },
];

// ─── Test: 1. Constructor fails when env missing ────────────

async function testConstructorEnvFailure() {
  console.log('\n── 1. Constructor env failure ──');
  const savedUrl = process.env.AFRO_SENTINEL_URL;
  const savedKey = process.env.AFRO_SENTINEL_KEY;
  const savedViteUrl = process.env.VITE_SUPABASE_URL;
  const savedViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  delete process.env.AFRO_SENTINEL_URL;
  delete process.env.AFRO_SENTINEL_KEY;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  try {
    new AfroSentinelProvider();
    assert('Constructor throws when env missing', false, 'did NOT throw');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert('Constructor throws when env missing', msg.includes('Missing required env'));
    assert('Error message names the missing vars', msg.includes('AFRO_SENTINEL_URL'));
  }

  // Restore
  process.env.AFRO_SENTINEL_URL = savedUrl ?? 'https://mock.supabase.co';
  process.env.AFRO_SENTINEL_KEY = savedKey ?? 'mock-key';
  if (savedViteUrl) process.env.VITE_SUPABASE_URL = savedViteUrl;
  if (savedViteKey) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = savedViteKey;
}

// ─── Test: 2. connected() returns false on auth failure ─────

async function testConnectedAuthFailure() {
  console.log('\n── 2. connected() auth failure ──');
  const provider = new AfroSentinelProvider();

  // Mock 401
  global.fetch = async () => mockResponse({}, 401, 'Unauthorized');
  const warns401 = await captureWarns(async () => {
    const result = await provider.connected();
    assert('connected() returns false on 401', result === false);
  });
  assert('Warns about unauthorized', warns401.some(w => w.includes('Unauthorized')));

  // Mock 403
  global.fetch = async () => mockResponse({}, 403, 'Forbidden');
  const warns403 = await captureWarns(async () => {
    const result = await provider.connected();
    assert('connected() returns false on 403', result === false);
  });
  assert('Warns about unauthorized (403)', warns403.some(w => w.includes('Unauthorized')));
}

// ─── Test: 3. Fetch times out correctly ─────────────────────

async function testFetchTimeout() {
  console.log('\n── 3. Fetch timeout [W4] ──');
  const provider = new AfroSentinelProvider();

  // Mock a fetch that hangs until aborted
  global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_, reject) => {
      if (init?.signal) {
        init.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }
      // Never resolve — simulates network hang
    });
  };

  // connected() should return false on timeout, not hang forever
  const connResult = await provider.connected();
  assert('connected() returns false on timeout (does not hang)', connResult === false);

  // fetchSignals() should throw on timeout
  try {
    await provider.fetchSignals();
    assert('fetchSignals() throws on timeout', false, 'did NOT throw');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert('fetchSignals() throws on timeout', msg.includes('timed out') || msg.includes('abort'));
  }
}

// ─── Test: 4. Stale event timestamps rejected ───────────────

async function testStaleRejection() {
  console.log('\n── 4. Stale timestamp rejection ──');
  const provider = new AfroSentinelProvider();

  const staleSignal = {
    id: '999', disease: 'Cholera', country: 'Kenya',
    location: 'Stale Town', latitude: 1.0, longitude: 36.0,
    status: 'validated', priority: 'P1', who_grade: 2,
    event_date: staleDate, // 72h ago — outside 48h window
    created_at: staleDate,
  };

  global.fetch = async () => mockResponse([staleSignal]);
  const signals = await provider.fetchSignals();
  assert('Stale signal (72h) rejected', signals.length === 0);
}

// ─── Test: 5. Provider does not own truth verdict ───────────

async function testNoTruthOwnership() {
  console.log('\n── 5. No truthPassed / gateDecision / truthFloorReason ──');
  const provider = new AfroSentinelProvider();
  global.fetch = async () => mockResponse(mockSignals);

  const signals = await provider.fetchSignals();
  for (const s of signals) {
    const raw = s as unknown as Record<string, unknown>;
    assert(`Signal ${s.id}: no truthPassed`, !('truthPassed' in raw));
    assert(`Signal ${s.id}: no gateDecision`, !('gateDecision' in raw));
    assert(`Signal ${s.id}: no truthFloorReason`, !('truthFloorReason' in raw));
  }
}

// ─── Test: 6. 0,0 is valid only when actually present ──────

async function testZeroZeroValid() {
  console.log('\n── 6. 0,0 valid when actually present ──');

  // Signal at Gulf of Guinea (0,0) — real location
  const zeroSignal = {
    id: '200', disease: 'Cholera', country: 'GH',
    location: 'Gulf of Guinea', latitude: 0, longitude: 0,
    status: 'validated', priority: 'P1', who_grade: 2,
    event_date: now, created_at: now,
  };

  const parsed = AfroSentinelSignalSchema.safeParse(zeroSignal);
  assert('0,0 parses successfully', parsed.success === true);
  if (parsed.success) {
    assert('latitude is 0 (not undefined)', parsed.data.latitude === 0);
    assert('longitude is 0 (not undefined)', parsed.data.longitude === 0);
  }
}

// ─── Test: 7. null/"" coords do NOT become 0,0 ─────────────

async function testNullCoordsNotZero() {
  console.log('\n── 7. null/"" coords → undefined, not 0,0 ──');

  const nullLatLon = {
    id: '201', disease: 'Cholera', country: 'KE',
    location: 'Somewhere', latitude: null, longitude: null,
    status: 'validated', priority: 'P1',
    event_date: now, created_at: now,
  };
  const emptyLatLon = {
    id: '202', disease: 'Cholera', country: 'KE',
    location: 'Somewhere', latitude: '', longitude: '',
    status: 'validated', priority: 'P1',
    event_date: now, created_at: now,
  };
  const missingLatLon = {
    id: '203', disease: 'Cholera', country: 'KE',
    location: 'Somewhere',
    // latitude/longitude not present at all
    status: 'validated', priority: 'P1',
    event_date: now, created_at: now,
  };

  const p1 = AfroSentinelSignalSchema.safeParse(nullLatLon);
  assert('null lat → undefined (not 0)', p1.success && p1.data.latitude === undefined);
  assert('null lon → undefined (not 0)', p1.success && p1.data.longitude === undefined);

  const p2 = AfroSentinelSignalSchema.safeParse(emptyLatLon);
  assert('"" lat → undefined (not 0)', p2.success && p2.data.latitude === undefined);
  assert('"" lon → undefined (not 0)', p2.success && p2.data.longitude === undefined);

  const p3 = AfroSentinelSignalSchema.safeParse(missingLatLon);
  assert('missing lat → undefined', p3.success && p3.data.latitude === undefined);
  assert('missing lon → undefined', p3.success && p3.data.longitude === undefined);
}

// ─── Test: 8. Congo split ───────────────────────────────────

async function testCongoSplit() {
  console.log('\n── 8. Congo split [W3] ──');
  const provider = new AfroSentinelProvider();
  global.fetch = async () => mockResponse(mockSignals);

  const signals = await provider.fetchSignals();
  const s104 = signals.find(s => s.id === 'sentinel-104');
  const s105 = signals.find(s => s.id === 'sentinel-105');
  assert('DRC → CD', s104?.country === 'CD');
  assert('Republic of Congo → CG', s105?.country === 'CG');
}

// ─── Test: 9. Dedupe removes duplicate IDs ──────────────────

async function testDedupe() {
  console.log('\n── 9. Dedup [W6] ──');
  const provider = new AfroSentinelProvider();

  // Send two signals with the same ID
  const dupeSignals = [
    { ...mockSignals[0], id: '300' },
    { ...mockSignals[0], id: '300', disease: 'Ebola' }, // same ID, different content
  ];
  global.fetch = async () => mockResponse(dupeSignals);

  const signals = await provider.fetchSignals();
  const ids = signals.map(s => s.id);
  assert('Duplicate IDs collapsed to 1', ids.filter(id => id === 'sentinel-300').length === 1);
}

// ─── Test: 10. Row-limit warning at 100 ─────────────────────

async function testRowLimitWarning() {
  console.log('\n── 10. Row-limit warning [W7] ──');
  const provider = new AfroSentinelProvider();

  // Generate exactly 100 rows
  const hundredRows = Array.from({ length: 100 }, (_, i) => ({
    id: String(400 + i), disease: 'Cholera', country: 'KE',
    location: `Location-${i}`, latitude: -1 + (i * 0.01), longitude: 36 + (i * 0.01),
    status: 'validated', priority: 'P1', who_grade: 2,
    event_date: now, created_at: now,
  }));

  global.fetch = async () => mockResponse(hundredRows);
  const warns = await captureWarns(async () => {
    await provider.fetchSignals();
  });
  assert('Warning fires when 100 rows returned', warns.some(w => w.includes('Row limit hit')));
}

// ─── Test: 11. No mock fallback path ────────────────────────

async function testNoMockFallback() {
  console.log('\n── 11. No mock fallback path ──');
  const provider = new AfroSentinelProvider();

  // Simulate server error — provider must NOT silently return mock data
  global.fetch = async () => mockResponse({ error: 'server down' }, 500, 'Internal Server Error');
  try {
    await provider.fetchSignals();
    assert('Provider does not silently return mock data on 500', false, 'should have thrown');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert('Provider throws on server error (no fallback)', msg.includes('500'));
  }
}

// ─── Test: Core signal parsing + triangulation ──────────────

async function testCoreParsingAndPrompt() {
  console.log('\n── Core parsing ──');
  const provider = new AfroSentinelProvider();
  global.fetch = async () => mockResponse(mockSignals);

  const signals = await provider.fetchSignals();
  assert('fetchSignals() returns array', Array.isArray(signals));
  assert('accepted > 0', signals.length > 0, `got ${signals.length}`);

  const s101 = signals.find(s => s.id === 'sentinel-101');
  assert('Signal 101: disease=CHOLERA', s101?.disease === 'CHOLERA');
  assert('Signal 101: country=KE', s101?.country === 'KE');
  assert('Signal 101: element=fire', s101?.element === 'fire');
  assert('Signal 101: source=AFRO-SENTINEL', s101?.source === 'AFRO-SENTINEL');
  assert('Signal 101: lat present', s101?.latitude != null);
  assert('Signal 101: lon present', s101?.longitude != null);

  const s102 = signals.find(s => s.id === 'sentinel-102');
  assert('Signal 102: disease=OTHER', s102?.disease === 'OTHER');
  assert('Signal 102: country=UG', s102?.country === 'UG');

  const s104 = signals.find(s => s.id === 'sentinel-104');
  assert('Signal 104: disease=EBOLA', s104?.disease === 'EBOLA');

  const s105 = signals.find(s => s.id === 'sentinel-105');
  assert('Signal 105: disease=VHF', s105?.disease === 'VHF');

  console.log('\n── Triangulation prompt ──');
  const prompt = buildTriangulationPrompt(signals);
  assert('Prompt mentions DCX1 Soul', prompt.includes('DCX1 Soul'));
  assert('Prompt mentions CHOLERA', prompt.includes('CHOLERA'));
  assert('Prompt includes geolocated lat:', prompt.includes('lat:'));
}

// ─── Runner ─────────────────────────────────────────────────

async function runAllTests() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🜂 AfroSentinelProvider — Full 11-Point Proof');
  console.log('══════════════════════════════════════════════════════');

  // Set env for tests that need a valid provider
  process.env.AFRO_SENTINEL_URL = 'https://mock.supabase.co';
  process.env.AFRO_SENTINEL_KEY = 'mock-key';

  await testConstructorEnvFailure();
  await testConnectedAuthFailure();
  await testFetchTimeout();
  await testStaleRejection();
  await testNoTruthOwnership();
  await testZeroZeroValid();
  await testNullCoordsNotZero();
  await testCongoSplit();
  await testDedupe();
  await testRowLimitWarning();
  await testNoMockFallback();
  await testCoreParsingAndPrompt();

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULT: ${pass} passed, ${fail} failed`);
  if (fail === 0) {
    console.log('  STATUS: ALL 11 PROOF POINTS VERIFIED');
  }
  console.log('══════════════════════════════════════════════════════\n');

  process.exit(fail > 0 ? 1 : 0);
}

runAllTests();
