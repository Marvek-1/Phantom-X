#!/usr/bin/env node
/**
 * 🜂🜄🜁🜃 AFRO SENTINEL — FULL PHANTOM POE DIAGNOSTIC
 * ═══════════════════════════════════════════════════════
 * Tests: Schema · Enums · RLS · CRUD · Count · Filters · Realtime
 * Target: Supabase PostgREST @ blhztdikukgwuhkhootf
 */

const SUPABASE_URL = 'https://blhztdikukgwuhkhootf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHp0ZGlrdWtnd3Voa2hvb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTUzODUsImV4cCI6MjA3NjQzMTM4NX0.IbPMpxBPKP0FiWDNQDGknQ7WYcuS88dbr3f3k2fE-wU';
const REST = `${SUPABASE_URL}/rest/v1`;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Helpers ─────────────────────────────────────────────────
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
//  TESTS
// ═══════════════════════════════════════════════════════════════

async function testOpenAPI() {
  section(1, 'OpenAPI Schema Discovery');
  const res = await safeFetch(`${REST}/`, {
    headers: { ...headers, 'Accept': 'application/json' },
  });
  if (res.ok) {
    // PostgREST root returns the OpenAPI spec
    ok(`PostgREST root reachable (${res.status})`);
  } else {
    fail(`PostgREST root returned ${res.status}`);
  }
}

async function testListTables() {
  section(2, 'Available Tables (RPC introspection)');

  // Method 1: Query pg_tables via RPC if available
  const rpcRes = await safeFetch(`${REST}/rpc/get_tables`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (rpcRes.ok && Array.isArray(rpcRes.body)) {
    ok(`RPC get_tables returned ${rpcRes.body.length} tables`);
    rpcRes.body.forEach(t => info(`  → ${t.table_name || t}`));
    return;
  }

  // Method 2: Try known table names
  const knownTables = [
    'signals', 'signal_logs', 'signal_events', 'health_signals',
    'disease_signals', 'alerts', 'outbreaks', 'countries',
    'profiles', 'users', 'signal_sources', 'signal_analysis',
    'escalations', 'watchtower_signals', 'sentinel_signals',
  ];

  info('No RPC endpoint — probing known table names...');
  const found = [];
  for (const table of knownTables) {
    const r = await safeFetch(`${REST}/${table}?select=*&limit=0`);
    if (r.status !== 404) {
      found.push({ table, status: r.status });
    }
  }

  if (found.length > 0) {
    ok(`Found ${found.length} accessible table(s):`);
    found.forEach(t => {
      const flag = t.status === 200 ? '✅' : t.status === 401 ? '🔒' : `⚠️ ${t.status}`;
      info(`  → ${t.table} [${flag}]`);
    });
  } else {
    fail('No known tables found — check schema exposure or RLS');
  }

  return found.map(f => f.table);
}

async function testSignalsSchema() {
  section(3, 'Signals Table — Schema Inspection');

  // Try to read columns via select with limit 0
  const res = await safeFetch(`${REST}/signals?select=*&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });

  if (res.status === 404) {
    fail('"signals" table not found in public schema');
    info('Check: Is the table in a different schema? Is it named differently?');
    // Try alternatives
    for (const alt of ['health_signals', 'sentinel_signals', 'disease_signals', 'watchtower_signals', 'signal_events']) {
      const r = await safeFetch(`${REST}/${alt}?select=*&limit=1`);
      if (r.ok) {
        warn(`Found alternative table: "${alt}"`);
        return alt;
      }
    }
    return null;
  }

  if (res.status === 401 || res.status === 403) {
    fail(`"signals" table exists but RLS blocks anon (${res.status})`);
    info('Fix: Add RLS policy → CREATE POLICY "anon_read" ON signals FOR SELECT USING (true);');
    return 'signals';
  }

  if (res.ok) {
    const count = res.headers?.get('content-range');
    const total = count ? count.split('/')[1] : 'unknown';
    ok(`"signals" table accessible — ${total} total rows`);

    if (Array.isArray(res.body) && res.body.length > 0) {
      const sample = res.body[0];
      const cols = Object.keys(sample);
      ok(`Schema has ${cols.length} columns:`);
      cols.forEach(c => {
        const val = sample[c];
        const type = val === null ? 'null' : typeof val;
        info(`  → ${c} (${type}) = ${JSON.stringify(val)?.substring(0, 80)}`);
      });
      return { table: 'signals', sample, cols };
    } else {
      warn('Table exists but is empty (0 rows)');
      return { table: 'signals', sample: null, cols: [] };
    }
  }

  fail(`Unexpected status ${res.status}: ${JSON.stringify(res.body)?.substring(0, 200)}`);
  return null;
}

async function testEnumDiscovery() {
  section(4, 'Enum Discovery — signal_status + others');

  // Try querying pg_enum via RPC
  const rpcRes = await safeFetch(`${REST}/rpc/get_enums`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (rpcRes.ok && Array.isArray(rpcRes.body)) {
    ok('Enum values from RPC:');
    rpcRes.body.forEach(e => info(`  → ${e.enum_type}: ${e.enum_value}`));
    return rpcRes.body;
  }

  // Try to discover by inserting with bad value and reading the error
  info('No RPC — probing enum values via error messages...');

  const testValues = ['draft', 'new', 'pending', 'active', 'validated', 'escalated', 'confirmed', 'resolved', 'closed', 'dismissed', 'archived', 'monitoring', 'investigating', 'P1', 'P2', 'P3', 'critical', 'high', 'medium', 'low'];
  const validValues = [];
  const invalidValues = [];

  for (const val of testValues) {
    // Try filtering by this value
    const r = await safeFetch(`${REST}/signals?signal_status=eq.${val}&limit=1`);
    if (r.status === 200) {
      validValues.push(val);
    } else if (r.status === 400 && r.body?.message?.includes('invalid input value for enum')) {
      invalidValues.push(val);
    } else if (r.status === 404) {
      // table doesn't exist, skip
      fail('Cannot probe enums — signals table not accessible');
      return null;
    }
  }

  if (validValues.length > 0) {
    ok(`Valid signal_status values: [${validValues.join(', ')}]`);
  }
  if (invalidValues.length > 0) {
    info(`Confirmed INVALID enum values: [${invalidValues.join(', ')}]`);
  }
  if (validValues.length === 0 && invalidValues.length === 0) {
    warn('Could not determine enum values — signal_status may not be an enum type');
  }

  return validValues;
}

async function testCount() {
  section(5, 'Row Count Methods');

  // Method 1: Prefer count=exact
  const r1 = await safeFetch(`${REST}/signals?select=*&limit=0`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const range1 = r1.headers?.get('content-range');
  if (r1.ok && range1) {
    const total = range1.split('/')[1];
    ok(`Prefer:count=exact → ${total} rows (Content-Range: ${range1})`);
  } else {
    fail(`count=exact failed (${r1.status}) Content-Range: ${range1}`);
  }

  // Method 2: Prefer count=planned
  const r2 = await safeFetch(`${REST}/signals?select=*&limit=0`, {
    headers: { ...headers, 'Prefer': 'count=planned' },
  });
  const range2 = r2.headers?.get('content-range');
  if (r2.ok && range2) {
    ok(`Prefer:count=planned → ${range2}`);
  } else {
    info(`count=planned also failed (${r2.status})`);
  }

  // Method 3: HEAD request
  const r3 = await safeFetch(`${REST}/signals?select=*`, {
    method: 'HEAD',
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const range3 = r3.headers?.get('content-range');
  if (r3.ok && range3) {
    ok(`HEAD count=exact → ${range3}`);
  } else {
    info(`HEAD request: ${r3.status}`);
  }
}

async function testFiltering(validEnums) {
  section(6, 'Query Filtering & Ordering');

  // Basic select
  const r1 = await safeFetch(`${REST}/signals?select=*&limit=5&order=created_at.desc`);
  if (r1.ok) {
    const count = Array.isArray(r1.body) ? r1.body.length : 0;
    ok(`Latest 5 signals: returned ${count} rows`);
    if (count > 0 && r1.body[0]) {
      info(`  Most recent: ${r1.body[0].created_at || r1.body[0].timestamp || 'no date field'}`);
    }
  } else {
    // Try alternate column names
    const r1b = await safeFetch(`${REST}/signals?select=*&limit=5&order=timestamp.desc`);
    if (r1b.ok) {
      ok(`Latest 5 signals (ordered by timestamp): ${r1b.body?.length || 0} rows`);
    } else {
      fail(`Basic select+order failed: ${r1.status} / ${r1b.status}`);
    }
  }

  // Filter by valid enum if we found any
  if (validEnums && validEnums.length > 0) {
    for (const val of validEnums.slice(0, 3)) {
      const r = await safeFetch(`${REST}/signals?signal_status=eq.${val}&limit=3`);
      if (r.ok) {
        const count = Array.isArray(r.body) ? r.body.length : 0;
        ok(`Filter signal_status=eq.${val} → ${count} rows`);
      } else {
        fail(`Filter by ${val} failed: ${r.status}`);
      }
    }
  }

  // Time window filter (last 48h)
  const ts48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const r2 = await safeFetch(`${REST}/signals?created_at=gte.${ts48h}&limit=10`);
  if (r2.ok) {
    ok(`48h window filter: ${r2.body?.length || 0} rows since ${ts48h.substring(0, 16)}`);
  } else {
    // Try timestamp column
    const r2b = await safeFetch(`${REST}/signals?timestamp=gte.${ts48h}&limit=10`);
    if (r2b.ok) {
      ok(`48h window (timestamp col): ${r2b.body?.length || 0} rows`);
    } else {
      warn(`Time filter failed on both created_at and timestamp: ${r2.status}`);
    }
  }

  // Text search
  const r3 = await safeFetch(`${REST}/signals?select=*&limit=3&or=(disease.ilike.*cholera*,title.ilike.*cholera*,description.ilike.*cholera*)`);
  if (r3.ok) {
    ok(`Text search "cholera": ${r3.body?.length || 0} rows`);
  } else {
    info(`Text search failed (${r3.status}) — column names may differ`);
  }
}

async function testCRUD() {
  section(7, 'CRUD — Insert / Read / Update / Delete');

  // INSERT
  const testSignal = {
    title: '__PHANTOM_TEST_SIGNAL__',
    description: 'Automated diagnostic probe — safe to delete',
    disease: 'Test',
    country: 'Testland',
    source: 'phantom-poe-diagnostic',
  };

  const insertRes = await safeFetch(`${REST}/signals`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(testSignal),
  });

  if (insertRes.ok && insertRes.body) {
    const row = Array.isArray(insertRes.body) ? insertRes.body[0] : insertRes.body;
    const id = row?.id;
    ok(`INSERT succeeded → id=${id}`);
    info(`  Returned columns: ${Object.keys(row).join(', ')}`);

    // READ back
    if (id) {
      const readRes = await safeFetch(`${REST}/signals?id=eq.${id}`);
      if (readRes.ok && readRes.body?.length > 0) {
        ok(`READ by id=${id} confirmed`);
      } else {
        fail(`READ back failed after insert`);
      }

      // UPDATE
      const updateRes = await safeFetch(`${REST}/signals?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ description: 'UPDATED by phantom diagnostic' }),
      });
      if (updateRes.ok) {
        ok(`UPDATE succeeded`);
      } else {
        fail(`UPDATE failed: ${updateRes.status} ${JSON.stringify(updateRes.body)?.substring(0, 120)}`);
      }

      // DELETE (cleanup)
      const deleteRes = await safeFetch(`${REST}/signals?id=eq.${id}`, {
        method: 'DELETE',
      });
      if (deleteRes.ok || deleteRes.status === 204) {
        ok(`DELETE cleanup succeeded`);
      } else {
        warn(`DELETE failed (${deleteRes.status}) — test row may persist: ${JSON.stringify(deleteRes.body)?.substring(0, 120)}`);
      }
    }
  } else if (insertRes.status === 401 || insertRes.status === 403) {
    fail(`INSERT blocked by RLS (${insertRes.status}) — anon cannot write`);
    info('Fix: Add RLS policy → CREATE POLICY "anon_insert" ON signals FOR INSERT WITH CHECK (true);');
  } else if (insertRes.status === 400) {
    warn(`INSERT rejected (400) — likely missing required columns or bad defaults`);
    info(`  Error: ${JSON.stringify(insertRes.body)?.substring(0, 200)}`);
    info('  This means the table exists but the test payload is missing required fields');
  } else {
    fail(`INSERT failed: ${insertRes.status} ${JSON.stringify(insertRes.body)?.substring(0, 200)}`);
  }
}

async function testRPCFunctions() {
  section(8, 'RPC Functions (stored procedures)');

  const knownRPCs = [
    'get_signal_summary',
    'get_signals_by_country',
    'get_recent_signals',
    'get_signal_stats',
    'get_active_outbreaks',
    'get_priority_signals',
    'escalate_signal',
    'get_tables',
    'get_enums',
  ];

  for (const fn of knownRPCs) {
    const r = await safeFetch(`${REST}/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (r.ok) {
      ok(`RPC ${fn}() → ${r.status} (${Array.isArray(r.body) ? r.body.length + ' rows' : typeof r.body})`);
    } else if (r.status === 404) {
      // not found, skip silently
    } else {
      info(`RPC ${fn}() → ${r.status} (${r.body?.message || 'error'})`);
    }
  }
}

async function testRealtime() {
  section(9, 'Realtime Channel (WebSocket probe)');

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SUPABASE_KEY + '&vsn=1.0.0';

  let WS;
  if (globalThis.WebSocket) {
    WS = globalThis.WebSocket;
  } else {
    try { WS = (await import('ws')).default; } catch { WS = null; }
  }

  if (!WS) {
    warn('No WebSocket available — install ws package: npm i ws');
    return;
  }

  return new Promise((resolve) => {
    let timer;
    try {
      const ws = new WS(wsUrl);

      ws.onopen = () => {
        ok(`WebSocket connected to realtime endpoint`);

        // Try joining signals channel
        const joinMsg = JSON.stringify({
          topic: 'realtime:public:signals',
          event: 'phx_join',
          payload: { config: { broadcast: { self: true } } },
          ref: '1',
        });
        ws.send(joinMsg);
        info('Sent phx_join to realtime:public:signals');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'phx_reply' && data.payload?.status === 'ok') {
            ok('Realtime channel joined successfully');
          } else if (data.event === 'phx_reply' && data.payload?.status === 'error') {
            warn(`Realtime join error: ${JSON.stringify(data.payload.response)?.substring(0, 120)}`);
          } else {
            info(`Realtime message: ${data.event}`);
          }
        } catch {}
      };

      ws.onerror = (err) => {
        warn(`WebSocket error: ${err.message || 'connection failed'}`);
      };

      ws.onclose = () => {
        info('WebSocket closed');
      };

      // Give it 4 seconds then close
      timer = setTimeout(() => {
        ws.close();
        resolve();
      }, 4000);
    } catch (err) {
      warn(`Realtime not testable in this environment: ${err.message}`);
      resolve();
    }
  });
}

async function testEdgeFunctions() {
  section(10, 'Edge Functions (Supabase Functions)');

  const knownFunctions = [
    'process-signal',
    'analyze-signal',
    'escalate-signal',
    'fetch-signals',
    'sync-signals',
    'signal-webhook',
  ];

  for (const fn of knownFunctions) {
    const r = await safeFetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });
    if (r.status !== 404 && r.status !== 0) {
      ok(`Edge function "${fn}" exists → ${r.status}`);
      if (r.body) info(`  Response: ${JSON.stringify(r.body)?.substring(0, 120)}`);
    }
  }
}

async function testStorage() {
  section(11, 'Storage Buckets');

  const r = await safeFetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: { ...headers },
  });

  if (r.ok && Array.isArray(r.body)) {
    if (r.body.length > 0) {
      ok(`${r.body.length} storage bucket(s) found:`);
      r.body.forEach(b => info(`  → ${b.name} (public: ${b.public})`));
    } else {
      info('No storage buckets configured');
    }
  } else if (r.status === 400 || r.status === 401) {
    info(`Storage API returned ${r.status} — may require auth`);
  } else {
    info(`Storage probe: ${r.status}`);
  }
}

async function testAllTablesDeep() {
  section(12, 'Deep Table Scan — All Public Schema');

  // Use the OpenAPI spec to discover all endpoints
  const r = await safeFetch(REST, {
    headers: { ...headers, 'Accept': 'application/openapi+json' },
  });

  if (r.ok && r.body?.paths) {
    const tables = Object.keys(r.body.paths)
      .filter(p => p.startsWith('/') && !p.includes('rpc/'))
      .map(p => p.replace('/', ''));

    ok(`OpenAPI spec lists ${tables.length} table endpoint(s):`);
    for (const t of tables) {
      const tr = await safeFetch(`${REST}/${t}?select=*&limit=0`, {
        headers: { ...headers, 'Prefer': 'count=exact' },
      });
      const range = tr.headers?.get('content-range');
      const total = range ? range.split('/')[1] : '?';
      const flag = tr.ok ? '✅' : `⛔ ${tr.status}`;
      info(`  → ${t.padEnd(28)} ${flag}  rows: ${total}`);
    }

    // Also list available RPCs
    const rpcs = Object.keys(r.body.paths)
      .filter(p => p.includes('rpc/'))
      .map(p => p.replace('/rpc/', ''));
    if (rpcs.length > 0) {
      ok(`${rpcs.length} RPC function(s) exposed:`);
      rpcs.forEach(fn => info(`  → rpc/${fn}`));
    }
  } else {
    warn('OpenAPI spec not accessible — falling back to probe');
  }
}


// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🜂🜄🜁🜃 AFRO SENTINEL — FULL PHANTOM POE DIAGNOSTIC`);
  console.log(LINE);
  console.log(`   Target:  ${SUPABASE_URL}`);
  console.log(`   Time:    ${new Date().toISOString()}`);
  console.log(`   Role:    anon (publishable key)`);
  console.log(LINE);

  await testOpenAPI();
  const tables = await testListTables();
  const schemaInfo = await testSignalsSchema();
  const validEnums = await testEnumDiscovery();
  await testCount();
  await testFiltering(validEnums);
  await testCRUD();
  await testRPCFunctions();
  await testEdgeFunctions();
  await testStorage();
  await testAllTablesDeep();

  // Try realtime last (has timeout)
  try {
    await testRealtime();
  } catch (e) {
    info(`Realtime skipped: ${e.message}`);
  }

  // ── Summary ──
  console.log(`\n${LINE}`);
  console.log(`🜂 DIAGNOSTIC COMPLETE`);
  console.log(LINE);
  console.log(`   ✅ Passed:   ${passed}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log(`${LINE}`);

  if (failed > 0) {
    console.log(`\n🔧 RECOMMENDED FIXES:`);
    console.log(THIN);
    console.log(`
   1. ENUM FIX — Run in Supabase SQL Editor:
      SELECT enum_range(NULL::signal_status);
      -- This shows you all valid values

   2. RLS FIX — If anon can't read:
      ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "public_read" ON signals
        FOR SELECT USING (true);

   3. COUNT FIX (500 error) — Usually means:
      - Table has no rows + RLS blocks empty result
      - Or: missing index on large table
      Try: SELECT count(*) FROM signals;  -- in SQL Editor

   4. EMPTY TABLE — If 0 rows, seed some test data:
      INSERT INTO signals (title, disease, country, signal_status)
      VALUES ('Test Signal', 'Cholera', 'Kenya', '<valid_enum_value>');

   5. SCHEMA DISCOVERY — Get full column list:
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'signals'
      ORDER BY ordinal_position;

   6. ENUM VALUES — Get all enum definitions:
      SELECT t.typname, e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      ORDER BY t.typname, e.enumsortorder;
`);
  }

  console.log(`\n🜂 Copy this output and share with the Grid. Phantom out.\n`);
}

main().catch(err => {
  console.error('💀 Fatal error:', err);
  process.exit(1);
});
