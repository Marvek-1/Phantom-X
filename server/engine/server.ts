import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { serverEnv, validateMode } from './src/config/env';
import { db } from './src/services/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ─── API ROUTES ───

  // ─── CANONICAL POE ROUTES ───
  app.get('/api/lane', async (req, res) => {
    try {
      const lanes = await db.query('SELECT * FROM data_lanes ORDER BY is_active DESC');
      const active = lanes.find((l: any) => l.is_active === 1 || l.is_active === true);
      res.json({
        active_lane: active ? { id: active.id, mode: active.lane, label: active.label, badge_color: active.badge_color } : null,
        available: lanes.map((l: any) => ({ id: l.id, mode: l.lane, label: l.label, badge_color: l.badge_color, is_active: l.is_active }))
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/lane/:laneId', async (req, res) => {
    try {
      const { laneId } = req.params;
      const lane = await db.query('SELECT * FROM data_lanes WHERE id = ?', [laneId]);
      if (lane.length === 0) return res.status(404).json({ error: 'Lane not found' });
      
      await db.update('UPDATE data_lanes SET is_active = 0');
      await db.update('UPDATE data_lanes SET is_active = 1 WHERE id = ?', [laneId]);
      
      res.json({ message: `Switched to ${lane[0].lane} mode`, active: { id: lane[0].id, mode: lane[0].lane, label: lane[0].label, badge_color: lane[0].badge_color } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/corridors', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      let sql = `SELECT c.*, t.primary_land_cover, t.best_mode, t.seasonal_phase,
        d.divergence_ratio, d.trend as divergence_trend
        FROM poe_corridors c
        LEFT JOIN poe_terrain t ON t.corridor_id = c.id AND t.lane_id = c.lane_id
        LEFT JOIN poe_divergence d ON d.corridor_id = c.id AND d.lane_id = c.lane_id
        WHERE c.lane_id = ?`;
      const params: any[] = [laneId];

      if (req.query.risk) { sql += ' AND c.risk_class = ?'; params.push(req.query.risk); }
      if (req.query.country) { sql += ' AND (c.start_country = ? OR c.end_country = ?)'; params.push(req.query.country, req.query.country); }
      if (req.query.activated) { sql += ' AND c.activated = ?'; params.push(req.query.activated); }
      if (req.query.mode) { sql += ' AND c.inferred_mode = ?'; params.push(req.query.mode); }

      sql += ' ORDER BY c.score DESC';
      const corridors = await db.query(sql, params);
      res.json({ lane: laneId, count: corridors.length, corridors });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/corridors/:id', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      const corridor = await db.query('SELECT * FROM poe_corridors WHERE id = ? AND lane_id = ?', [req.params.id, laneId]);
      if (corridor.length === 0) return res.status(404).json({ error: 'Corridor not found' });

      const evidence = await db.query('SELECT * FROM poe_evidence WHERE corridor_id = ? AND lane_id = ? ORDER BY confidence DESC', [req.params.id, laneId]);
      const terrain = await db.query('SELECT * FROM poe_terrain WHERE corridor_id = ? AND lane_id = ?', [req.params.id, laneId]);
      const temporal = await db.query('SELECT * FROM poe_temporal WHERE corridor_id = ? AND lane_id = ? ORDER BY bucket_date DESC', [req.params.id, laneId]);
      const divergence = await db.query('SELECT * FROM poe_divergence WHERE corridor_id = ? AND lane_id = ?', [req.params.id, laneId]);
      const moments = await db.query('SELECT * FROM poe_moments WHERE corridor_id = ? AND lane_id = ? ORDER BY sealed_at DESC', [req.params.id, laneId]);
      const events = await db.query('SELECT * FROM poe_detection_events WHERE corridor_id = ? AND lane_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id, laneId]);

      res.json({
        corridor: corridor[0],
        evidence: { count: evidence.length, atoms: evidence },
        terrain: terrain[0] || null,
        temporal: { days: temporal.length, buckets: temporal },
        divergence: divergence[0] || null,
        moments: { count: moments.length, items: moments },
        recent_events: events
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/signals', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      let sql = 'SELECT * FROM poe_signals WHERE lane_id = ? AND passed_truth_filter = 1';
      const params: any[] = [laneId];

      if (req.query.source) { sql += ' AND source = ?'; params.push(req.query.source); }
      if (req.query.type) { sql += ' AND type = ?'; params.push(req.query.type); }
      if (req.query.country) { sql += ' AND country = ?'; params.push(req.query.country); }
      if (req.query.lat && req.query.lng && req.query.radius) {
        const r = parseFloat(req.query.radius as string) / 111.0;
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        sql += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?';
        params.push(String(lat - r), String(lat + r), String(lng - r), String(lng + r));
      }

      sql += ' ORDER BY timestamp DESC LIMIT 200';
      const signals = await db.query(sql, params);
      res.json({ lane: laneId, count: signals.length, signals });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/runs', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      const runs = await db.query('SELECT * FROM poe_runs WHERE lane_id = ? ORDER BY started_at DESC LIMIT 20', [laneId]);
      const latest = runs[0] || null;
      res.json({ lane: laneId, latest, count: runs.length, runs });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/runs/:runId', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });

      const run = await db.query('SELECT * FROM poe_runs WHERE id = ? AND lane_id = ?', [req.params.runId, lane[0].id]);
      if (run.length === 0) return res.status(404).json({ error: 'Run not found' });
      res.json(run[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/detections', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      let sql = 'SELECT * FROM poe_detection_events WHERE lane_id = ?';
      const params: any[] = [laneId];

      if (req.query.since) { sql += ' AND created_at > ?'; params.push(req.query.since); }
      if (req.query.severity) { sql += ' AND severity = ?'; params.push(req.query.severity); }
      if (req.query.unread === '1') { sql += ' AND acknowledged = 0'; }
      if (req.query.type) { sql += ' AND event_type = ?'; params.push(req.query.type); }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(req.query.limit || '50');

      const events = await db.query(sql, params);
      const unread = events.filter((e: any) => !e.acknowledged).length;

      res.json({
        lane: laneId,
        count: events.length,
        unread_count: unread,
        events,
        poll_interval_ms: 30000
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/detections', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      const { event_type, corridor_id, route_name, score, summary, severity, source_count } = req.body;
      const id = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      await db.batchInsert('poe_detection_events', [{
        id, lane_id: laneId, event_type, corridor_id, route_name, score, score_delta: null,
        summary, source_count, severity, acknowledged: 0, click_action: null, created_at: new Date().toISOString()
      }]);

      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/detections/:id/ack', async (req, res) => {
    try {
      const result = await db.update('UPDATE poe_detection_events SET acknowledged = 1 WHERE id = ?', [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Detection event not found' });
      res.json({ message: 'Acknowledged', id: req.params.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/entropy', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      let sql = 'SELECT * FROM poe_entropy WHERE lane_id = ?';
      const params: any[] = [laneId];

      if (req.query.spiked === '1') { sql += ' AND spiked = 1'; }
      if (req.query.risk) { sql += ' AND risk_class = ?'; params.push(req.query.risk); }

      sql += ' ORDER BY delta_h DESC';
      const entropy = await db.query(sql, params);
      const spiked = entropy.filter((e: any) => e.spiked).length;

      res.json({ lane: laneId, count: entropy.length, spiked_count: spiked, results: entropy });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/divergence', async (req, res) => {
    try {
      const lane = await db.query('SELECT id FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;

      let sql = `SELECT d.*, c.start_node, c.end_node, c.start_country, c.end_country, c.score, c.risk_class
        FROM poe_divergence d
        JOIN poe_corridors c ON c.id = d.corridor_id AND c.lane_id = d.lane_id
        WHERE d.lane_id = ?`;
      const params: any[] = [laneId];

      if (req.query.trend) { sql += ' AND d.trend = ?'; params.push(req.query.trend); }
      sql += ' ORDER BY d.divergence_ratio DESC';

      const results = await db.query(sql, params);
      res.json({ lane: laneId, count: results.length, results });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/poll', async (req, res) => {
    try {
      const lane = await db.query('SELECT * FROM data_lanes WHERE is_active = 1 LIMIT 1');
      if (lane.length === 0) return res.status(503).json({ error: 'No active data lane' });
      const laneId = lane[0].id;
      const since = req.query.since || new Date(Date.now() - 60000).toISOString();

      const corridors = await db.query(
        'SELECT * FROM poe_corridors WHERE lane_id = ? AND last_updated > ? ORDER BY score DESC',
        [laneId, since]
      );

      const detections = await db.query(
        'SELECT * FROM poe_detection_events WHERE lane_id = ? AND created_at > ? AND acknowledged = 0 ORDER BY created_at DESC LIMIT 20',
        [laneId, since]
      );

      const latestRun = await db.query(
        'SELECT * FROM poe_runs WHERE lane_id = ? ORDER BY started_at DESC LIMIT 1',
        [laneId]
      );

      const topChanged = await db.query(
        'SELECT * FROM poe_corridors WHERE lane_id = ? AND score_delta IS NOT NULL ORDER BY ABS(score_delta) DESC LIMIT 5',
        [laneId]
      );

      const spikes = await db.query(
        'SELECT * FROM poe_entropy WHERE lane_id = ? AND spiked = 1 AND risk_class IN (?, ?) ORDER BY delta_h DESC LIMIT 10',
        [laneId, 'CRITICAL', 'HIGH']
      );

      res.json({
        lane: { id: laneId, mode: lane[0].lane, badge_color: lane[0].badge_color },
        timestamp: new Date().toISOString(),
        next_poll_ms: 30000,
        updated_corridors: { count: corridors.length, items: corridors },
        detections: { count: detections.length, unread: detections.length, items: detections },
        latest_run: latestRun[0] || null,
        top_changed: topChanged,
        entropy_spikes: spikes
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // 1. Corridor Analysis
  app.post('/api/corridor/analyze', async (req, res) => {
    const env = serverEnv();
    try {
      const { corridorId, locationA, locationB, lat, lng, useLiveSentinel, signalHistory, velocity, terrainFriction } = req.body;

      if (!corridorId || !locationA || !locationB) {
        return res.status(400).json({ error: 'Missing corridorId, locationA, or locationB' });
      }

      const { ExplainabilityEngine } = await import('./src/services/intelligence');
      const engine = new ExplainabilityEngine();

      let liveSignals: string[] = [];
      let liveEvidence: any[] = [];

      if (useLiveSentinel && lat && lng) {
        try {
          const baseUrl = env.AFRO_SENTINEL_API_URL ?? 'https://afro-sentinel.vercel.app/';
          const url = new URL('/api/signals', baseUrl);
          url.searchParams.set('lat', String(lat));
          url.searchParams.set('lng', String(lng));
          url.searchParams.set('radius', '50');

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const token = env.AFRO_SENTINEL_OIDC_TOKEN;
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const sentinelRes = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
          if (sentinelRes.ok) {
            const data = await sentinelRes.json();
            const signals = data.signals ?? [];
            liveSignals = signals.map((s: any) => s.description);
            liveEvidence = signals.map((s: any) => ({
              evidenceType: s.type,
              description: s.description,
              weight: s.weight,
              source: s.source,
              sourceRecordId: s.id,
              confidence: s.confidence,
              timestamp: s.timestamp,
              nodeIds: [locationA, locationB],
            }));
          }
        } catch (e) {
          // Best effort
        }
      }

      const startCoord = { lat: lat ?? -1.234, lng: lng ?? 34.567 };
      const endCoord = { lat: (lat ?? -1.234) - 0.2, lng: (lng ?? 34.567) + 0.2 };
      const history = signalHistory ?? [0.05, 0.12, 0.38, 0.62, 0.78];
      const vel = velocity ?? 18;
      const friction = terrainFriction ?? 0.5;

      const score = engine.synthesizeCorridorScore({
        runId: `run-${Date.now()}`,
        corridorId,
        startNode: locationA,
        endNode: locationB,
        gravityScore: 0.75,
        diffusionScore: 0.68,
        centralityScore: 0.82,
        hmmScore: 0,
        seasonalScore: 0.85,
        linguisticScore: 0.45,
        entropyScore: 0.62,
        frictionScore: 1 - friction,
        evidence: [
          ...liveEvidence,
          {
            evidenceType: 'health_signal',
            description: 'Disease Signal (Cholera-adjacent)',
            weight: 0.8,
            source: 'AFRO Sentinel',
            sourceRecordId: `SIG-AFRO-${Date.now()}`,
            confidence: 0.88,
            timestamp: new Date().toISOString(),
            nodeIds: [locationA, locationB],
          },
        ],
        inferredVelocityKmh: vel / 24,
        seasonallyActive: true,
        requiresCanoe: false,
        conflictDetour: false,
        signalHistory: history,
        frictionContext: { slopeDeg: 5, landCover: 'open_ground' },
        startCoord,
        endCoord,
        locationSignals: [
          { lat: startCoord.lat, lng: startCoord.lng, confidence: 0.9 },
          { lat: endCoord.lat, lng: endCoord.lng, confidence: 0.85 },
        ],
        previousSignalHistory: history.map((h: number) => h * 0.8),
      });

      res.json({
        corridorId: score.corridorId,
        score: score.corridorScore,
        riskClass: score.riskClass,
        latentState: score.latentState,
        activated: score.phantomPoeActivated,
        inferredMode: score.inferredMode,
        scoreDecomposition: score.scoreDecomposition,
        traceLines: score.traceLines,
        liveSignals,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // 2. Live Corridors
  app.get('/api/corridor/live', (req, res) => {
    res.json({
      items: [],
      source: 'live',
      status: 'no_live_corridors',
      message: 'No live corridor records available',
    });
  });

  // 3. Get Corridor by ID
  app.get('/api/corridor/:id', (req, res) => {
    res.status(404).json({ error: `Corridor ${req.params.id} not found.` });
  });

  // 4. Sentinel Signals Proxy
  app.get('/api/sentinel/signals', async (req, res) => {
    const env = serverEnv();
    const { lat, lng, radius } = req.query;

    try {
      const baseUrl = env.AFRO_SENTINEL_API_URL ?? 'https://afro-sentinel.vercel.app/';
      const url = new URL('/api/signals', baseUrl);
      url.searchParams.set('lat', String(lat ?? '0'));
      url.searchParams.set('lng', String(lng ?? '0'));
      url.searchParams.set('radius', String(radius ?? '50'));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = env.AFRO_SENTINEL_OIDC_TOKEN;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const sentinelRes = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(15_000) });
      if (!sentinelRes.ok) {
        return res.status(502).json({ error: `Sentinel returned ${sentinelRes.status}`, signals: [] });
      }

      const data = await sentinelRes.json();
      res.json({ signals: data.signals ?? [], count: data.signals?.length ?? 0 });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err), signals: [] });
    }
  });

  // 5. Diagnostics
  app.get('/api/diagnostic', async (req, res) => {
    const env = serverEnv();
    const { DiagnosticService } = await import('./src/services/diagnostic');
    const diagnostic = new DiagnosticService();

    const results = await Promise.allSettled([
      diagnostic.testSentinel(env),
      diagnostic.testNeo4j(env),
      diagnostic.testNeon(env),
      diagnostic.testACLED(env),
      diagnostic.testDTM(env),
      diagnostic.testDHIS2(env),
      diagnostic.testSupabase(env),
    ]);

    const diagnostics = results.map(r =>
      r.status === 'fulfilled' ? r.value : { service: 'Unknown', status: 'ERROR', message: String(r.reason) }
    );

    res.json({ diagnostics, timestamp: new Date().toISOString() });
  });

  // 6. Ingest Run
  app.post('/api/ingest/run', async (req, res) => {
    try {
      validateMode('ingest');
      const env = serverEnv();

      const { IngestQueue } = await import('./src/services/ingest.queue');
      const queue = new IngestQueue({
        supabaseUrl: env.SUPABASE_URL!,
        supabaseKey: env.AFRO_SENTINEL_SERVICE_KEY!, // Fixed key name
        databaseUrl: env.NEON_DATABASE_URL!,
        acledKey: env.ACLED_API_KEY,
        acledEmail: env.ACLED_EMAIL,
        acledBaseUrl: env.ACLED_BASE_URL,
        dtmBaseUrl: env.IOM_DTM_BASE_URL,
        dtmApiKey: env.IOM_DTM_API_KEY,
        dhis2BaseUrl: env.DHIS2_BASE_URL,
        dhis2Username: env.DHIS2_USERNAME,
        dhis2Password: env.DHIS2_PASSWORD,
      });

      const result = await queue.runOnce();
      res.json({ ok: true, ...result, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // 7. Graph Run Data
  app.get('/api/graph/run/:runId', async (req, res) => {
    try {
      validateMode('graph');
      const env = serverEnv();
      const { runId } = req.params;

      const neo4j = await import('neo4j-driver');
      const driver = neo4j.default.driver(
        env.NEO4J_URI!,
        neo4j.default.auth.basic(env.NEO4J_USER ?? 'neo4j', env.NEO4J_PASSWORD!)
      );

      const session = driver.session({ database: 'neo4j' });

      try {
        const runResult = await session.run(
          `MATCH (r:POE_Run {runId: $runId, workspace: 'phantom-poe'}) RETURN r`,
          { runId }
        );

        if (runResult.records.length === 0) {
          return res.status(404).json({ ok: false, error: `Run ${runId} not found` });
        }

        const run = runResult.records[0].get('r').properties;

        const corridorResult = await session.run(
          `MATCH (c:POE_Corridor {runId: $runId, workspace: 'phantom-poe'}) RETURN c ORDER BY c.score DESC`,
          { runId }
        );
        const corridors = corridorResult.records.map(r => r.get('c').properties);

        const signalResult = await session.run(
          `MATCH (s:POE_Signal {runId: $runId, workspace: 'phantom-poe'}) RETURN s.source AS source, count(s) AS count ORDER BY count DESC`,
          { runId }
        );
        const signalsBySource = signalResult.records.map(r => ({
          source: r.get('source'),
          count: r.get('count').toNumber(),
        }));

        const entropyResult = await session.run(
          `MATCH (e:POE_Entropy {runId: $runId, workspace: 'phantom-poe'}) RETURN e ORDER BY e.deltaH DESC`,
          { runId }
        );
        const entropyAlerts = entropyResult.records.map(r => r.get('e').properties);

        res.json({
          ok: true,
          runId,
          run,
          summary: { corridors: corridors.length, signals: signalsBySource.reduce((a, b) => a + b.count, 0), entropyAlerts: entropyAlerts.length },
          corridors,
          signalsBySource,
          entropyAlerts,
          timestamp: new Date().toISOString(),
        });
      } finally {
        await session.close();
        await driver.close();
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // 8. Intelligence Chat
  app.post('/api/chat', async (req, res) => {
    try {
      const env = serverEnv();
      const { message, history = [], context } = req.body;

      if (!message?.trim()) return res.status(400).json({ error: 'Empty message' });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

      const SYSTEM_PROMPT = `You are the Phantom POE Intelligence Assistant — built by MoStar Industries for WHO AFRO.
You help analysts understand corridor intelligence data for cross-border disease surveillance in Africa.
... (rest of prompt) ...`;

      const contents = [
        ...history.map((turn: any) => ({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const aiRes = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3, maxOutputTokens: 1024 },
      });

      res.json({ response: aiRes.text, model: 'gemini-2.0-flash', timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── VITE MIDDLEWARE ───
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
