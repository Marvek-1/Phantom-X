#!/usr/bin/env node
/**
 * 🜂 DUAL SUPABASE RECON — Which project owns the signals?
 * ═════════════════════════════════════════════════════════
 * Probes both Supabase projects side-by-side
 */

const PROJECTS = [
  {
    name: 'blhztdikukgwuhkhootf',
    label: 'BLHZ (MoStar Mothership)',
    url: 'https://blhztdikukgwuhkhootf.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHp0ZGlrdWtnd3Voa2hvb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTUzODUsImV4cCI6MjA3NjQzMTM4NX0.IbPMpxBPKP0FiWDNQDGknQ7WYcuS88dbr3f3k2fE-wU',
  },
  {
    name: 'jndkoglwwubglslojdic',
    label: 'JNDK (Legacy / Sentinel?)',
    url: 'https://jndkoglwwubglslojdic.supabase.co',
    // Anon key unknown — we'll try to discover it or fail gracefully
    key: null,
  },
];

// ── If you have the JNDK key, paste it below ──
// PROJECTS[1].key = 'eyJ...your_key_here...';

const LINE = '═'.repeat(60);
const THIN = '─'.repeat(60);

// All table names we might expect across the Sentinel / MoStar ecosystem
const PROBE_TABLES = [
  // Signals core
  'signals', 'signal_logs', 'signal_events', 'signal_sources', 'signal_analysis',
  'health_signals', 'disease_signals', 'sentinel_signals', 'watchtower_signals',
  // Domain
  'alerts', 'outbreaks', 'escalations', 'countries', 'regions',
  // Auth / profiles
  'profiles', 'users', 'accounts',
  // MoStar ecosystem
  'grid_nodes', 'mostar_moments', 'odu_corpus', 'consciousness_states',
  'shipments', 'inventory', 'warehouses', 'prepositioning',
  // AfroTrack / Storm
  'tracking_events', 'weather_alerts', 'hazard_events',
  // FlameBorn
  'health_guardians', 'flb_tokens', 'game_sessions',
];

async function probeProject(project) {
  console.log(`\n${'▓'.repeat(60)}`);
  console.log(`  ${project.label}`);
  console.log(`  ${project.url}`);
  console.log(`${'▓'.repeat(60)}`);

  if (!project.key) {
    console.log(`\n   ⚠️  No anon key available for this project`);
    console.log(`   📎 Trying unauthenticated probe...\n`);
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (project.key) {
    headers['apikey'] = project.key;
    headers['Authorization'] = `Bearer ${project.key}`;
  }

  const rest = `${project.url}/rest/v1`;

  // 1. PostgREST root
  try {
    const r = await fetch(rest, { headers });
    if (r.ok) {
      console.log(`   ✅ PostgREST alive (${r.status})`);
    } else {
      console.log(`   ❌ PostgREST returned ${r.status}`);
      if (r.status === 401 && !project.key) {
        console.log(`   📎 Needs anon key — paste it into the script`);
        return { alive: false, tables: [] };
      }
    }
  } catch (err) {
    console.log(`   ❌ Cannot reach project: ${err.message}`);
    return { alive: false, tables: [] };
  }

  // 2. OpenAPI spec for full table list
  let specTables = [];
  try {
    const r = await fetch(rest, {
      headers: { ...headers, 'Accept': 'application/openapi+json' },
    });
    if (r.ok) {
      const spec = await r.json();
      if (spec.paths) {
        specTables = Object.keys(spec.paths)
          .filter(p => p.startsWith('/') && !p.includes('rpc/'))
          .map(p => p.replace('/', ''));

        const rpcs = Object.keys(spec.paths)
          .filter(p => p.includes('rpc/'))
          .map(p => p.replace('/rpc/', ''));

        console.log(`   ✅ OpenAPI spec: ${specTables.length} tables, ${rpcs.length} RPCs`);

        if (rpcs.length > 0) {
          console.log(`   📎 RPCs: ${rpcs.join(', ')}`);
        }
      }
    }
  } catch {}

  // 3. Probe tables — use spec list + our known list
  const allTables = [...new Set([...specTables, ...PROBE_TABLES])];
  const found = [];

  for (const table of allTables) {
    try {
      const r = await fetch(`${rest}/${table}?select=*&limit=1`, {
        headers: { ...headers, 'Prefer': 'count=exact' },
      });

      if (r.status === 404) continue; // not exposed

      const range = r.headers.get('content-range');
      const total = range ? range.split('/')[1] : '?';
      let sample = null;

      if (r.ok) {
        const body = await r.json();
        if (Array.isArray(body) && body.length > 0) {
          sample = body[0];
        }
      }

      found.push({
        table,
        status: r.status,
        total,
        cols: sample ? Object.keys(sample) : [],
        sample,
      });
    } catch {}
  }

  // Print results
  if (found.length === 0) {
    console.log(`   ⚠️  No tables accessible`);
  } else {
    console.log(`\n   📊 TABLES FOUND: ${found.length}`);
    console.log(`   ${THIN}`);

    for (const t of found) {
      const icon = t.status === 200 ? '✅' : t.status === 401 ? '🔒' : `⚠️`;
      console.log(`   ${icon} ${t.table.padEnd(28)} rows: ${String(t.total).padEnd(8)} status: ${t.status}`);

      if (t.cols.length > 0) {
        console.log(`      cols: ${t.cols.join(', ')}`);
      }
      if (t.sample) {
        // Show first few meaningful values
        const preview = {};
        for (const [k, v] of Object.entries(t.sample)) {
          if (v !== null && v !== undefined && v !== '') {
            preview[k] = String(v).substring(0, 60);
          }
        }
        const previewStr = JSON.stringify(preview);
        if (previewStr.length > 2) {
          console.log(`      sample: ${previewStr.substring(0, 200)}`);
        }
      }
    }
  }

  // 4. Enum check (if signals-like table found)
  const signalsTable = found.find(f =>
    f.table.includes('signal') && f.status === 200
  );

  if (signalsTable) {
    console.log(`\n   🔬 ENUM PROBE on ${signalsTable.table}`);
    console.log(`   ${THIN}`);

    const statusProbes = [
      'new', 'draft', 'pending', 'active', 'validated', 'escalated',
      'confirmed', 'resolved', 'closed', 'dismissed', 'archived',
      'monitoring', 'investigating', 'P1', 'P2', 'P3',
    ];

    // Find the status column name
    const statusCol = signalsTable.cols.find(c =>
      c.includes('status') || c === 'priority' || c === 'state'
    );

    if (statusCol) {
      const valid = [];
      const invalid = [];
      for (const val of statusProbes) {
        try {
          const r = await fetch(`${rest}/${signalsTable.table}?${statusCol}=eq.${val}&limit=1`, { headers });
          if (r.status === 200) valid.push(val);
          else if (r.status === 400) {
            const body = await r.json().catch(() => ({}));
            if (body?.message?.includes('invalid input value for enum')) {
              invalid.push(val);
            }
          }
        } catch {}
      }

      if (valid.length > 0) console.log(`   ✅ Valid ${statusCol} values: [${valid.join(', ')}]`);
      if (invalid.length > 0) console.log(`   ❌ Invalid enum values: [${invalid.join(', ')}]`);
      if (valid.length === 0 && invalid.length === 0) console.log(`   📎 ${statusCol} may be text type (no enum constraint)`);
    }
  }

  // 5. Storage
  try {
    const r = await fetch(`${project.url}/storage/v1/bucket`, { headers });
    if (r.ok) {
      const buckets = await r.json();
      if (Array.isArray(buckets) && buckets.length > 0) {
        console.log(`\n   📦 STORAGE: ${buckets.length} bucket(s)`);
        buckets.forEach(b => console.log(`      → ${b.name} (public: ${b.public})`));
      }
    }
  } catch {}

  return { alive: true, tables: found };
}


// ═══════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🜂🜄🜁🜃 DUAL SUPABASE RECON — FINDING THE SIGNALS`);
  console.log(LINE);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(LINE);

  const results = [];

  for (const project of PROJECTS) {
    const result = await probeProject(project);
    results.push({ ...project, ...result });
  }

  // ── VERDICT ──
  console.log(`\n\n${'█'.repeat(60)}`);
  console.log(`  VERDICT`);
  console.log(`${'█'.repeat(60)}`);

  const signalHomes = results.filter(r =>
    r.tables?.some(t => t.table.includes('signal') && t.status === 200)
  );

  if (signalHomes.length === 0) {
    console.log(`\n   ⚠️  SIGNALS TABLE NOT FOUND IN EITHER PROJECT`);
    console.log(`   📎 Schema migration needed. Run the creation SQL in whichever project you choose.`);
    console.log(`   📎 Recommendation: Use BLHZ (${PROJECTS[0].name}) since it's the MoStar mothership.`);
  } else if (signalHomes.length === 1) {
    const home = signalHomes[0];
    const signalTable = home.tables.find(t => t.table.includes('signal'));
    console.log(`\n   🏠 SIGNALS LIVE IN: ${home.label}`);
    console.log(`   📎 Table: ${signalTable.table} (${signalTable.total} rows)`);
    console.log(`   📎 Point all consumers to: ${home.url}`);
  } else {
    console.log(`\n   ⚡ SIGNALS FOUND IN BOTH PROJECTS`);
    for (const home of signalHomes) {
      const signalTable = home.tables.find(t => t.table.includes('signal'));
      console.log(`   📎 ${home.label}: ${signalTable.table} (${signalTable.total} rows)`);
    }
    console.log(`   📎 Pick one as canonical and mirror to the other.`);
  }

  // Table summary
  for (const r of results) {
    if (r.tables?.length > 0) {
      console.log(`\n   ${r.label}:`);
      r.tables.forEach(t => {
        console.log(`     ${t.status === 200 ? '✅' : '⛔'} ${t.table} (${t.total} rows)`);
      });
    }
  }

  console.log(`\n${LINE}`);
  console.log(`🜂 Drop this output back and we build from here.`);
  console.log(`${LINE}\n`);
}

main().catch(err => {
  console.error('💀 Fatal:', err);
  process.exit(1);
});
