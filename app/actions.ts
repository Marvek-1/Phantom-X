/**
 * Phantom POE Engine - Server Actions
 * Engine: mo-border-phantom-001
 * Layer: Backend API — Database Operations
 */

"use server";

import { neon } from "@neondatabase/serverless";

// Neon PostgreSQL client
const sql = neon(process.env.NEON_DATABASE_URL!);

// ─────────────────────────────────────────────
// Node Operations
// ─────────────────────────────────────────────

export async function getNodes() {
  try {
    const data = await sql`
      SELECT * FROM phantom_nodes
      ORDER BY created_at DESC
    `;
    return { success: true, data };
  } catch (error) {
    console.error('[DB] Failed to fetch nodes:', error);
    return { success: false, error: String(error) };
  }
}

export async function getNodeById(nodeId: string) {
  try {
    const data = await sql`
      SELECT * FROM phantom_nodes
      WHERE id = ${nodeId}
    `;
    return { success: true, data: data[0] || null };
  } catch (error) {
    console.error('[DB] Failed to fetch node:', error);
    return { success: false, error: String(error) };
  }
}

export async function createNode(nodeData: {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  country: string;
  properties?: Record<string, any>;
}) {
  try {
    const data = await sql`
      INSERT INTO phantom_nodes (id, name, type, lat, lng, country, properties)
      VALUES (
        ${nodeData.id},
        ${nodeData.name},
        ${nodeData.type},
        ${nodeData.lat},
        ${nodeData.lng},
        ${nodeData.country},
        ${JSON.stringify(nodeData.properties || {})}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        country = EXCLUDED.country,
        properties = EXCLUDED.properties,
        updated_at = NOW()
      RETURNING *
    `;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('[DB] Failed to create node:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Corridor Operations
// ─────────────────────────────────────────────

export async function getCorridors(minScore: number = 0.0) {
  try {
    const data = await sql`
      SELECT * FROM phantom_corridors
      WHERE score >= ${minScore}
      ORDER BY score DESC
    `;
    return { success: true, data };
  } catch (error) {
    console.error('[DB] Failed to fetch corridors:', error);
    return { success: false, error: String(error) };
  }
}

export async function getCorridorById(corridorId: string) {
  try {
    const data = await sql`
      SELECT * FROM phantom_corridors
      WHERE id = ${corridorId}
    `;
    return { success: true, data: data[0] || null };
  } catch (error) {
    console.error('[DB] Failed to fetch corridor:', error);
    return { success: false, error: String(error) };
  }
}

export async function createCorridor(corridorData: {
  id: string;
  from_node_id: string;
  to_node_id: string;
  score: number;
  confidence: number;
  type: string;
  risk: string;
  models: string[];
  evidence?: any[];
}) {
  try {
    const data = await sql`
      INSERT INTO phantom_corridors (
        id, from_node_id, to_node_id, score, confidence, type, risk, models, evidence
      )
      VALUES (
        ${corridorData.id},
        ${corridorData.from_node_id},
        ${corridorData.to_node_id},
        ${corridorData.score},
        ${corridorData.confidence},
        ${corridorData.type},
        ${corridorData.risk},
        ${JSON.stringify(corridorData.models)},
        ${JSON.stringify(corridorData.evidence || [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        score = EXCLUDED.score,
        confidence = EXCLUDED.confidence,
        type = EXCLUDED.type,
        risk = EXCLUDED.risk,
        models = EXCLUDED.models,
        evidence = EXCLUDED.evidence,
        updated_at = NOW()
      RETURNING *
    `;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('[DB] Failed to create corridor:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Signal Operations
// ─────────────────────────────────────────────

export async function getSignals(nodeId?: string, hours: number = 24) {
  try {
    const data = nodeId
      ? await sql`
          SELECT * FROM phantom_signals
          WHERE node_id = ${nodeId}
            AND timestamp >= NOW() - INTERVAL '${hours} hours'
          ORDER BY timestamp DESC
        `
      : await sql`
          SELECT * FROM phantom_signals
          WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
          ORDER BY timestamp DESC
        `;
    return { success: true, data };
  } catch (error) {
    console.error('[DB] Failed to fetch signals:', error);
    return { success: false, error: String(error) };
  }
}

export async function createSignal(signalData: {
  id: string;
  node_id: string;
  type: string;
  message: string;
  truth_score: number;
  metadata?: Record<string, any>;
}) {
  try {
    const data = await sql`
      INSERT INTO phantom_signals (id, node_id, type, message, truth_score, metadata)
      VALUES (
        ${signalData.id},
        ${signalData.node_id},
        ${signalData.type},
        ${signalData.message},
        ${signalData.truth_score},
        ${JSON.stringify(signalData.metadata || {})}
      )
      RETURNING *
    `;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('[DB] Failed to create signal:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Evidence Operations
// ─────────────────────────────────────────────

export async function getEvidence(corridorId: string) {
  try {
    const data = await sql`
      SELECT * FROM phantom_evidence
      WHERE corridor_id = ${corridorId}
      ORDER BY timestamp DESC
    `;
    return { success: true, data };
  } catch (error) {
    console.error('[DB] Failed to fetch evidence:', error);
    return { success: false, error: String(error) };
  }
}

export async function createEvidence(evidenceData: {
  id: string;
  corridor_id: string;
  evidence_type: string;
  description: string;
  weight: number;
  source: string;
  confidence: number;
  raw_value?: any;
}) {
  try {
    const data = await sql`
      INSERT INTO phantom_evidence (
        id, corridor_id, evidence_type, description, weight, source, confidence, raw_value
      )
      VALUES (
        ${evidenceData.id},
        ${evidenceData.corridor_id},
        ${evidenceData.evidence_type},
        ${evidenceData.description},
        ${evidenceData.weight},
        ${evidenceData.source},
        ${evidenceData.confidence},
        ${JSON.stringify(evidenceData.raw_value || {})}
      )
      RETURNING *
    `;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('[DB] Failed to create evidence:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Analytics & Statistics
// ─────────────────────────────────────────────

export async function getStats() {
  try {
    const [nodeStats, corridorStats, signalStats] = await Promise.all([
      sql`SELECT COUNT(*) as total FROM phantom_nodes`,
      sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE score >= 0.6) as phantom_corridors,
          AVG(score) as avg_score
        FROM phantom_corridors
      `,
      sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as last_24h
        FROM phantom_signals
      `,
    ]);

    return {
      success: true,
      data: {
        nodes: Number(nodeStats[0].total),
        corridors: {
          total: Number(corridorStats[0].total),
          phantom: Number(corridorStats[0].phantom_corridors),
          avgScore: Number(corridorStats[0].avg_score || 0),
        },
        signals: {
          total: Number(signalStats[0].total),
          last24h: Number(signalStats[0].last_24h),
        },
      },
    };
  } catch (error) {
    console.error('[DB] Failed to fetch stats:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Database Initialization
// ─────────────────────────────────────────────

export async function initializeDatabase() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS phantom_nodes (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        lat DECIMAL(10, 6) NOT NULL,
        lng DECIMAL(10, 6) NOT NULL,
        country VARCHAR(100) NOT NULL,
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS phantom_corridors (
        id VARCHAR(255) PRIMARY KEY,
        from_node_id VARCHAR(255) REFERENCES phantom_nodes(id),
        to_node_id VARCHAR(255) REFERENCES phantom_nodes(id),
        score DECIMAL(5, 4) NOT NULL,
        confidence DECIMAL(5, 4) NOT NULL,
        type VARCHAR(100) NOT NULL,
        risk VARCHAR(50) NOT NULL,
        models JSONB DEFAULT '[]',
        evidence JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS phantom_signals (
        id VARCHAR(255) PRIMARY KEY,
        node_id VARCHAR(255) REFERENCES phantom_nodes(id),
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        truth_score DECIMAL(5, 4) NOT NULL,
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS phantom_evidence (
        id VARCHAR(255) PRIMARY KEY,
        corridor_id VARCHAR(255) REFERENCES phantom_corridors(id),
        evidence_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        weight DECIMAL(5, 4) NOT NULL,
        source VARCHAR(255) NOT NULL,
        confidence DECIMAL(5, 4) NOT NULL,
        raw_value JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_nodes_type ON phantom_nodes(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_corridors_score ON phantom_corridors(score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON phantom_signals(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_signals_node ON phantom_signals(node_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evidence_corridor ON phantom_evidence(corridor_id)`;

    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    return { success: false, error: String(error) };
  }
}
