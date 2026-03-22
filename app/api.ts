/**
 * Phantom POE Engine - Client API
 * Engine: mo-border-phantom-001
 * 
 * Client-side wrappers for server actions
 */

import {
  getNodes,
  getNodeById,
  getCorridors,
  getCorridorById,
  getSignals,
  getEvidence,
  getStats,
  createNode,
  createCorridor,
  createSignal,
} from './actions';

// Re-export server actions for client use
export {
  getNodes,
  getNodeById,
  getCorridors,
  getCorridorById,
  getSignals,
  getEvidence,
  getStats,
  createNode,
  createCorridor,
  createSignal,
};

// Client-side utilities
export async function fetchNodesWithCache() {
  const result = await getNodes();
  if (result.success) {
    return result.data;
  }
  console.error('[API] Failed to fetch nodes:', result.error);
  return [];
}

export async function fetchCorridorsWithCache(minScore: number = 0.6) {
  const result = await getCorridors(minScore);
  if (result.success) {
    return result.data;
  }
  console.error('[API] Failed to fetch corridors:', result.error);
  return [];
}

export async function fetchRecentSignals(nodeId?: string, hours: number = 24) {
  const result = await getSignals(nodeId, hours);
  if (result.success) {
    return result.data;
  }
  console.error('[API] Failed to fetch signals:', result.error);
  return [];
}

export async function fetchGraphStats() {
  const result = await getStats();
  if (result.success) {
    return result.data;
  }
  console.error('[API] Failed to fetch stats:', result.error);
  return {
    nodes: 0,
    corridors: { total: 0, phantom: 0, avgScore: 0 },
    signals: { total: 0, last24h: 0 },
  };
}
