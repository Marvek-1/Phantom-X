/**
 * 🜂 Afro Sentinel → Phantom POE — Live Connection Test
 * Run: node test-afro-sentinel.mjs
 */

const SUPABASE_URL = 'https://jndkoglwwubglslojdic.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGtvZ2x3d3ViZ2xzbG9qZGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzYwOTEsImV4cCI6MjA4NDkxMjA5MX0.BZvFp-LrY2J6mkVtE7u9XVbql3buM0yamkCjTSPBw1A';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

console.log('🜂🜄🜁🜃 Afro Sentinel → Phantom POE Connection Test');
console.log('═══════════════════════════════════════════════\n');

// 1. List all tables
console.log('📋 Step 1: Checking available tables...');
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`,
    { headers }
  );
  console.log(`   Status: ${res.status} ${res.statusText}`);
} catch (e) {
  console.error('   ❌ Connection failed:', e.message);
}

// 2. Check signals table — count
console.log('\n📊 Step 2: Signals table count...');
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/signals?select=count`,
    { headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }
  );
  console.log(`   Status: ${res.status}`);
  const contentRange = res.headers.get('content-range');
  console.log(`   Content-Range: ${contentRange}`);
  const total = contentRange?.split('/')[1];
  console.log(`   🜂 Total signals in DB: ${total ?? 'unknown'}`);
} catch (e) {
  console.error('   ❌', e.message);
}

// 3. Fetch 5 most recent signals — full shape inspection
console.log('\n🔬 Step 3: Inspecting signal schema (last 5)...');
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/signals?limit=5&order=created_at.desc`,
    { headers }
  );
  console.log(`   Status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    if (data.length === 0) {
      console.log('   ⚠️  No signals found (table empty or RLS blocking anon)');
    } else {
      console.log(`   ✅ Got ${data.length} signals`);
      console.log('\n   📐 Available fields:');
      console.log('  ', Object.keys(data[0]).join(', '));
      console.log('\n   🜂 Sample signal:');
      const s = data[0];
      console.log(`      id:         ${s.id}`);
      console.log(`      disease:    ${s.disease ?? s.disease_type ?? s.event_type ?? '—'}`);
      console.log(`      country:    ${s.country ?? '—'}`);
      console.log(`      status:     ${s.status ?? '—'}`);
      console.log(`      priority:   ${s.priority ?? '—'}`);
      console.log(`      confidence: ${s.confidence ?? s.ai_confidence ?? '—'}`);
      console.log(`      who_grade:  ${s.who_grade ?? '—'}`);
      console.log(`      created_at: ${s.created_at}`);
    }
  } else {
    const body = await res.text();
    console.log('   ❌ Response:', body.slice(0, 200));
  }
} catch (e) {
  console.error('   ❌', e.message);
}

// 4. Check validated/escalated signals (what provider actually queries)
console.log('\n🛡️  Step 4: Validated/escalated P1-P2 signals (48h window)...');
try {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/signals?or=(status.eq.validated,status.eq.escalated)&created_at=gte.${cutoff}&limit=20&order=created_at.desc`,
    { headers }
  );
  if (res.ok) {
    const data = await res.json();
    console.log(`   🜂 Active fire signals (48h): ${data.length}`);
    data.forEach((s, i) => {
      console.log(`   [${i+1}] ${s.disease ?? s.disease_type ?? 'UNKNOWN'} | ${s.country ?? '?'} | ${s.status} | ${s.priority ?? '?'} | ${s.created_at?.slice(0,10)}`);
    });
    if (data.length === 0) console.log('   ℹ️  No validated signals in last 48h — try broader window or check RLS');
  } else {
    const body = await res.text();
    console.log('   Status:', res.status, body.slice(0, 200));
  }
} catch (e) {
  console.error('   ❌', e.message);
}

// 5. Check ALL signals regardless of status (broader view)
console.log('\n🌍 Step 5: All signals regardless of status (last 10)...');
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/signals?select=id,disease,disease_type,country,status,priority,created_at&limit=10&order=created_at.desc`,
    { headers }
  );
  if (res.ok) {
    const data = await res.json();
    console.log(`   Total returned: ${data.length}`);
    data.forEach((s, i) => {
      console.log(`   [${i+1}] ${s.disease ?? s.disease_type ?? '?'} | ${s.country ?? '?'} | ${s.status ?? '?'} | ${s.priority ?? '?'}`);
    });
  }
} catch (e) {
  console.error('   ❌', e.message);
}

console.log('\n═══════════════════════════════════════════════');
console.log('🜂  Test complete. Copy output and share results.');
