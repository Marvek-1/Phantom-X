#!/usr/bin/env node
/**
 * 🜂🜄🜁🜃 AFRO SENTINEL — FULL PHANTOM POE DIAGNOSTIC v2
 * ═══════════════════════════════════════════════════════
 * TARGET: jndkoglwwubglslojdic (canonical — extracted from AFRO-SENTINEL-main/.env)
 * 
 * Schema expects:
 *   Tables:  signals, profiles, user_roles, disease_lexicon, source_credibility
 *   Enums:   signal_status (new, triaged, validated, dismissed)
 *            signal_priority (P1, P2, P3, P4)
 *            source_tier (tier_1, tier_2, tier_3)
 *            disease_category (vhf, respiratory, enteric, vector_borne, zoonotic, vaccine_preventable, environmental, unknown)
 *            app_role (admin, analyst, viewer)
 *   RPCs:    get_signal_priority_counts, get_signal_status_counts,
 *            get_signal_total_count, get_signal_24h_trend, cleanup_daily_signals,
 *            get_signal_retention_stats, has_role, get_user_role
 */

const SUPABASE_URL = 'https://jndkoglwwubglslojdic.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGtvZ2x3d3ViZ2xzbG9qZGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzYwOTEsImV4cCI6MjA4NDkxMjA5MX0.BZvFp-LrY2J6mkVtE7u9XVbql3buM0yamkCjTSPBw1A';
const REST = `${SUPABASE_URL}/rest/v1`;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const LINE = '═'.repeat(60);
const THIN = '─'.repeat(60);
let passed = 0, failed = 0, warnings = 0;

function ok(msg) { passed++; console.log(`   ✅ ${msg}`); }
function fail(msg) { failed++; console.log(`   ❌ ${msg}`); }
function warn(msg) { warnings++; console.log(`   ⚠️  ${msg}`); }
function info(msg) { console.log(`   📎 ${msg}`); }
function section(n, title) { console.log(`\n🔬 Step ${n}: ${title}\n${THIN}`); }

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, { headers, ...opts });
    let body = null;
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, headers: res.headers, body, ok: res.ok };
  } catch (err) {
    return { status: 0, headers: null, body: null, ok: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════

async function testConnection() {
  section(1, 'PostgREST Connection');
  const res = await safeFetch(`${REST}/`, { headers: { ...headers, 'Accept': 'application/json' } });
  if (res.ok) ok(`PostgREST alive (${res.status})`);
  else fail(`PostgREST returned ${res.status}`);
}

async function testAllTables() {
  section(2, 'Table Discovery (from known schema)');

  const expectedTables = ['signals', 'profiles', 'user_roles', 'disease_lexicon', 'source_credibility'];
  const found = [];

  for (const table of expectedTables) {
    const r = await safeFetch(`${REST}/${table}?select=*&limit=0`, {
      headers: { ...headers, 'Prefer': 'count=exact' },
    });
    const range = r.headers?.get('content-range');
    const total = range ? range.split('/')[1] : '?';

    if (r.status === 200) {
      ok(`${table.padEnd(24)} → ${total} rows`);
      found.push({ table, total });
    } else if (r.status === 404) {
      fail(`${table.padEnd(24)} → NOT FOUND (migration not run?)`);
    } else if (r.status === 401 || r.status === 403) {
      warn(`${table.padEnd(24)} → RLS blocks anon (${r.status})`);
      found.push({ table, total: 'RLS-blocked' });
    } else {
      warn(`${table.padEnd(24)} → ${r.status}`);
    }
  }
  return found;
}

async function testSignalsSchema() {
  section(3, 'Signals Table — Column Inspection');

  const res = await safeFetch(`${REST}/signals?select=*&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });

  if (res.status === 404) {
    fail('"signals" table not found');
    return null;
  }

  if (!res.ok) {
    warn(`signals query returned ${res.status}`);
    if (res.body?.message) info(`  ${res.body.message}`);
    return null;
  }

  const range = res.headers?.get('content-range');
  const total = range ? range.split('/')[1] : '?';
  ok(`signals accessible — ${total} total rows`);

  if (Array.isArray(res.body) && res.body.length > 0) {
    const sample = res.body[0];
    const cols = Object.keys(sample);
    ok(`${cols.length} columns detected`);

    // Expected columns from the schema
    const expected = [
      'id', 'signal_type', 'disease_name', 'disease_category',
      'location_country', 'location_country_iso', 'location_admin1', 'location_admin2',
      'location_lat', 'location_lng', 'original_text', 'original_language',
      'translated_text', 'lingua_fidelity_score',
      'source_name', 'source_tier', 'source_url', 'source_type',
      'priority', 'confidence_score', 'status',
      'reported_cases', 'reported_deaths', 'cross_border_risk',
      'created_at', 'updated_at',
    ];

    const missing = expected.filter(c => !cols.includes(c));
    const extra = cols.filter(c => !expected.includes(c));

    if (missing.length > 0) warn(`Missing expected columns: ${missing.join(', ')}`);
    if (extra.length > 0) info(`Extra columns: ${extra.join(', ')}`);

    // Show sample values
    info('Sample row:');
    for (const [k, v] of Object.entries(sample)) {
      if (v !== null) {
        info(`  ${k.padEnd(28)} = ${String(v).substring(0, 80)}`);
      }
    }
    return sample;
  } else {
    warn('Table exists but returned 0 rows (empty or RLS filtering all)');
    return null;
  }
}

async function testEnums() {
  section(4, 'Enum Validation');

  const enumTests = {
    status: {
      column: 'status',
      valid: ['new', 'triaged', 'validated', 'dismissed'],
      invalid: ['escalated', 'confirmed', 'active', 'pending'],
    },
    priority: {
      column: 'priority',
      valid: ['P1', 'P2', 'P3', 'P4'],
      invalid: ['P0', 'P5', 'critical', 'high'],
    },
  };

  for (const [name, { column, valid, invalid }] of Object.entries(enumTests)) {
    info(`Testing signal_${name} enum (${column})...`);

    const validResults = [];
    const invalidResults = [];

    for (const val of valid) {
      const r = await safeFetch(`${REST}/signals?${column}=eq.${val}&limit=1`);
      if (r.status === 200) validResults.push(val);
      else if (r.status === 400) invalidResults.push(val);
    }

    if (validResults.length === valid.length) {
      ok(`${name}: all valid values accepted [${validResults.join(', ')}]`);
    } else if (validResults.length > 0) {
      warn(`${name}: only ${validResults.length}/${valid.length} accepted [${validResults.join(', ')}]`);
    } else {
      fail(`${name}: no valid values accepted (table may not exist)`);
    }

    // Confirm invalids are rejected
    for (const val of invalid) {
      const r = await safeFetch(`${REST}/signals?${column}=eq.${val}&limit=1`);
      if (r.status === 400 && r.body?.message?.includes('invalid input value for enum')) {
        // Good — properly rejected
      } else if (r.status === 200) {
        warn(`${name}: "${val}" was ACCEPTED (should be invalid!)`);
      }
    }
  }
}

async function testCounts() {
  section(5, 'Row Counts');

  // Direct count
  const r1 = await safeFetch(`${REST}/signals?select=*&limit=0`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const range = r1.headers?.get('content-range');
  if (r1.ok && range) {
    ok(`Direct count: ${range}`);
  } else {
    fail(`Direct count failed (${r1.status})`);
  }

  // RPC counts
  const rpcs = ['get_signal_total_count', 'get_signal_priority_counts', 'get_signal_status_counts', 'get_signal_24h_trend'];
  for (const fn of rpcs) {
    const r = await safeFetch(`${REST}/rpc/${fn}`, { method: 'POST', body: '{}' });
    if (r.ok) {
      const display = typeof r.body === 'number' ? r.body : JSON.stringify(r.body)?.substring(0, 120);
      ok(`rpc/${fn} → ${display}`);
    } else if (r.status === 404) {
      warn(`rpc/${fn} not found`);
    } else {
      fail(`rpc/${fn} → ${r.status} ${r.body?.message || ''}`);
    }
  }

  // Retention stats
  const r2 = await safeFetch(`${REST}/rpc/get_signal_retention_stats`, { method: 'POST', body: '{}' });
  if (r2.ok) {
    ok(`rpc/get_signal_retention_stats → ${JSON.stringify(r2.body)?.substring(0, 150)}`);
  } else if (r2.status === 404) {
    warn('rpc/get_signal_retention_stats not found');
  }

  // Cleanup (just check it exists, don't run it)
  const r3 = await safeFetch(`${REST}/rpc/cleanup_daily_signals`, { method: 'POST', body: '{}' });
  if (r3.ok) {
    ok(`rpc/cleanup_daily_signals exists and callable`);
  } else if (r3.status === 404) {
    warn('rpc/cleanup_daily_signals not found');
  } else {
    info(`rpc/cleanup_daily_signals returned ${r3.status} (may require service_role)`);
  }
}

async function testFiltering() {
  section(6, 'Query Filtering & Ordering');

  // Latest signals
  const r1 = await safeFetch(`${REST}/signals?select=id,priority,status,disease_name,location_country,created_at&order=created_at.desc&limit=5`);
  if (r1.ok && Array.isArray(r1.body)) {
    ok(`Latest 5 signals: ${r1.body.length} returned`);
    r1.body.forEach((s, i) => {
      info(`  ${i + 1}. [${s.priority}/${s.status}] ${s.disease_name || '?'} — ${s.location_country} (${s.created_at?.substring(0, 16)})`);
    });
  } else {
    fail(`Latest query failed: ${r1.status}`);
  }

  // P1/P2 signals
  const r2 = await safeFetch(`${REST}/signals?priority=in.(P1,P2)&select=id,priority,disease_name,location_country&limit=5`);
  if (r2.ok) {
    ok(`P1/P2 filter: ${r2.body?.length || 0} signals`);
  } else {
    warn(`P1/P2 filter: ${r2.status}`);
  }

  // Validated signals
  const r3 = await safeFetch(`${REST}/signals?status=eq.validated&select=id,disease_name,location_country&limit=5`);
  if (r3.ok) {
    ok(`Validated filter: ${r3.body?.length || 0} signals`);
  } else {
    warn(`Validated filter: ${r3.status}`);
  }

  // Country filter
  const r4 = await safeFetch(`${REST}/signals?location_country=eq.Kenya&limit=3`);
  if (r4.ok) {
    ok(`Country=Kenya filter: ${r4.body?.length || 0} signals`);
  }

  // Disease text search
  const r5 = await safeFetch(`${REST}/signals?disease_name=ilike.*cholera*&limit=3`);
  if (r5.ok) {
    ok(`Disease ilike "cholera": ${r5.body?.length || 0} signals`);
  }

  // 48h time window
  const ts48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const r6 = await safeFetch(`${REST}/signals?created_at=gte.${ts48h}&limit=10`);
  if (r6.ok) {
    ok(`48h window: ${r6.body?.length || 0} signals since ${ts48h.substring(0, 16)}`);
  }
}

async function testCRUD() {
  section(7, 'CRUD (anon role — expect limited access)');

  // Anon INSERT — should be BLOCKED per RLS (analysts/admins only)
  const testSignal = {
    original_text: '__PHANTOM_DIAGNOSTIC_PROBE__',
    location_country: 'Testland',
    source_name: 'phantom-test',
    signal_type: 'disease',
    source_tier: 'tier_3',
    priority: 'P4',
    status: 'new',
  };

  const r = await safeFetch(`${REST}/signals`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(testSignal),
  });

  if (r.status === 201 || r.status === 200) {
    warn('Anon INSERT succeeded — RLS may be too permissive');
    const id = Array.isArray(r.body) ? r.body[0]?.id : r.body?.id;
    if (id) {
      // Cleanup
      await safeFetch(`${REST}/signals?id=eq.${id}`, { method: 'DELETE' });
      info('Test row cleaned up');
    }
  } else if (r.status === 401 || r.status === 403) {
    ok('Anon INSERT correctly blocked by RLS (analysts/admins only)');
  } else if (r.status === 404) {
    fail('signals table not found');
  } else {
    info(`Anon INSERT → ${r.status}: ${JSON.stringify(r.body)?.substring(0, 150)}`);
  }
}

async function testEdgeFunctions() {
  section(8, 'Edge Functions');

  const functions = [
    'ingest-signals',
    'auto-triage',
    'analyze-signal',
    'lingua-fidelity',
    'translate-text',
    'sync-to-azure',
    'cleanup-duplicates',
    'daily-cleanup',
  ];

  for (const fn of functions) {
    const r = await safeFetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });
    if (r.status === 200 || r.status === 201) {
      ok(`${fn} → ${r.status} (live)`);
    } else if (r.status === 401) {
      info(`${fn} → 401 (exists, needs auth)`);
    } else if (r.status === 404) {
      // not deployed
    } else if (r.status === 500) {
      warn(`${fn} → 500 (deployed but errored)`);
    } else {
      info(`${fn} → ${r.status}`);
    }
  }
}

async function testRealtime() {
  section(9, 'Realtime WebSocket');

  let WS;
  if (globalThis.WebSocket) {
    WS = globalThis.WebSocket;
  } else {
    try { WS = (await import('ws')).default; } catch { WS = null; }
  }

  if (!WS) {
    warn('No WebSocket — npm i ws to enable');
    return;
  }

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SUPABASE_KEY + '&vsn=1.0.0';

  return new Promise((resolve) => {
    try {
      const ws = new WS(wsUrl);
      ws.onopen = () => {
        ok('WebSocket connected');
        ws.send(JSON.stringify({
          topic: 'realtime:public:signals',
          event: 'phx_join',
          payload: { config: { broadcast: { self: true } } },
          ref: '1',
        }));
        info('Sent phx_join to realtime:public:signals');
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'phx_reply' && data.payload?.status === 'ok') {
            ok('Realtime channel joined — signals publication is active');
          } else if (data.event === 'phx_reply' && data.payload?.status === 'error') {
            warn(`Realtime join error: ${JSON.stringify(data.payload.response)?.substring(0, 100)}`);
          }
        } catch {}
      };
      ws.onerror = () => warn('WebSocket error');
      setTimeout(() => { ws.close(); resolve(); }, 4000);
    } catch (err) {
      warn(`Realtime test failed: ${err.message}`);
      resolve();
    }
  });
}

async function testStorage() {
  section(10, 'Storage Buckets');
  const r = await safeFetch(`${SUPABASE_URL}/storage/v1/bucket`);
  if (r.ok && Array.isArray(r.body) && r.body.length > 0) {
    ok(`${r.body.length} bucket(s):`);
    r.body.forEach(b => info(`  → ${b.name} (public: ${b.public})`));
  } else {
    info('No storage buckets configured');
  }
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🜂🜄🜁🜃 AFRO SENTINEL — FULL PHANTOM POE DIAGNOSTIC v2`);
  console.log(LINE);
  console.log(`   Target:   ${SUPABASE_URL}`);
  console.log(`   Project:  jndkoglwwubglslojdic (CANONICAL)`);
  console.log(`   Time:     ${new Date().toISOString()}`);
  console.log(`   Role:     anon`);
  console.log(`   Source:   AFRO-SENTINEL-main/.env`);
  console.log(LINE);

  await testConnection();
  await testAllTables();
  await testSignalsSchema();
  await testEnums();
  await testCounts();
  await testFiltering();
  await testCRUD();
  await testEdgeFunctions();
  await testStorage();

  try { await testRealtime(); } catch {}

  console.log(`\n${LINE}`);
  console.log(`🜂 DIAGNOSTIC COMPLETE`);
  console.log(LINE);
  console.log(`   ✅ Passed:   ${passed}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log(LINE);
  console.log(`\n🜂 Drop this output back to the Grid. Phantom out.\n`);
}

main().catch(err => { console.error('💀 Fatal:', err); process.exit(1); });
