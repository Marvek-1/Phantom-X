/**
 * Phantom POE Engine - Database Seeding
 * Engine: mo-border-phantom-001
 * 
 * Seeds Neon PostgreSQL with initial phantom nodes and corridors
 */

"use server";

import { createNode, createCorridor, createSignal, initializeDatabase } from './actions';

export async function seedDatabase() {
  console.log('[Seed] Initializing database schema...');
  const initResult = await initializeDatabase();
  if (!initResult.success) {
    console.error('[Seed] Failed to initialize database:', initResult.error);
    return { success: false, error: initResult.error };
  }

  console.log('[Seed] Seeding phantom nodes...');

  // Nigeria-Niger border region
  await createNode({ id: 'n1', name: 'Jibia', type: 'market', lat: 13.08, lng: 7.23, country: 'Nigeria', properties: { market_day: 'Thursday', frequency: 4, pop: 12000 } });
  await createNode({ id: 'n2', name: 'Maradi', type: 'market', lat: 13.50, lng: 7.10, country: 'Niger', properties: { market_day: 'Saturday', frequency: 4, pop: 267000 } });
  await createNode({ id: 'n3', name: 'Dan Issa', type: 'village', lat: 13.22, lng: 7.55, country: 'Niger', properties: { pop: 5000, clinic: false } });
  await createNode({ id: 'n4', name: 'Daura', type: 'clinic', lat: 13.03, lng: 8.32, country: 'Nigeria', properties: { beds: 45, staff: 12 } });
  await createNode({ id: 'n5', name: 'Phantom-α', type: 'phantom_crossing', lat: 13.15, lng: 7.40, country: 'Border', properties: { phantom: true, discovered: '2025-03-01', confidence: 0.87 } });

  // Nigeria-Benin border region
  await createNode({ id: 'n6', name: 'Seme', type: 'transport', lat: 6.39, lng: 2.73, country: 'Nigeria', properties: { type: 'motorcycle_hub', daily_traffic: 340 } });
  await createNode({ id: 'n7', name: 'Kraké', type: 'market', lat: 6.38, lng: 2.72, country: 'Benin', properties: { market_day: 'Tuesday', frequency: 7, pop: 8000 } });
  await createNode({ id: 'n8', name: 'Badagry', type: 'village', lat: 6.42, lng: 2.89, country: 'Nigeria', properties: { pop: 25000, clinic: true } });
  await createNode({ id: 'n9', name: 'Phantom-β', type: 'phantom_crossing', lat: 6.40, lng: 2.78, country: 'Border', properties: { phantom: true, discovered: '2025-02-14', confidence: 0.92 } });

  // Kenya-Tanzania border region
  await createNode({ id: 'n10', name: 'Namanga', type: 'transport', lat: -2.55, lng: 36.79, country: 'Kenya', properties: { type: 'truck_stop', daily_traffic: 180 } });
  await createNode({ id: 'n11', name: 'Longido', type: 'village', lat: -2.73, lng: 36.70, country: 'Tanzania', properties: { pop: 18000, clinic: true } });
  await createNode({ id: 'n12', name: 'Amboseli Corridor', type: 'language_cluster', lat: -2.65, lng: 37.05, country: 'Border', properties: { languages: 'Maasai,Swahili', drift: 0.15 } });
  await createNode({ id: 'n13', name: 'Phantom-γ', type: 'phantom_crossing', lat: -2.60, lng: 36.85, country: 'Border', properties: { phantom: true, discovered: '2025-01-20', confidence: 0.78 } });

  // DRC-Uganda border region
  await createNode({ id: 'n14', name: 'Kasindi', type: 'market', lat: 0.06, lng: 29.69, country: 'DRC', properties: { market_day: 'Wednesday', frequency: 4, pop: 22000 } });
  await createNode({ id: 'n15', name: 'Bwera', type: 'clinic', lat: 0.08, lng: 29.73, country: 'Uganda', properties: { beds: 30, staff: 8 } });
  await createNode({ id: 'n16', name: 'Phantom-δ', type: 'phantom_crossing', lat: 0.03, lng: 29.71, country: 'Border', properties: { phantom: true, discovered: '2025-03-08', confidence: 0.95 } });
  await createNode({ id: 'n17', name: 'Rutshuru', type: 'village', lat: -1.18, lng: 29.45, country: 'DRC', properties: { pop: 47000, clinic: true } });

  // Mali-Burkina Faso border
  await createNode({ id: 'n18', name: 'Sikasso', type: 'market', lat: 11.32, lng: -5.67, country: 'Mali', properties: { market_day: 'Monday', frequency: 4, pop: 227000 } });
  await createNode({ id: 'n19', name: 'Bobo-Dioulasso', type: 'transport', lat: 11.18, lng: -4.30, country: 'Burkina Faso', properties: { type: 'rail_junction', daily_traffic: 500 } });
  await createNode({ id: 'n20', name: 'Phantom-ε', type: 'phantom_crossing', lat: 11.25, lng: -5.00, country: 'Border', properties: { phantom: true, discovered: '2025-02-28', confidence: 0.83 } });

  // Mozambique-Malawi border
  await createNode({ id: 'n21', name: 'Milange', type: 'village', lat: -16.08, lng: 35.77, country: 'Mozambique', properties: { pop: 15000, clinic: true } });
  await createNode({ id: 'n22', name: 'Muloza', type: 'market', lat: -16.03, lng: 35.65, country: 'Malawi', properties: { market_day: 'Friday', frequency: 4, pop: 9000 } });
  await createNode({ id: 'n23', name: 'Phantom-ζ', type: 'phantom_crossing', lat: -16.05, lng: 35.71, country: 'Border', properties: { phantom: true, discovered: '2025-01-10', confidence: 0.71 } });

  console.log('[Seed] Seeding phantom corridors...');

  await createCorridor({ id: 'c1', from_node_id: 'n1', to_node_id: 'n5', score: 0.87, confidence: 0.87, type: 'market_route', risk: 'high', models: ['gravity', 'diffusion', 'centrality'] });
  await createCorridor({ id: 'c2', from_node_id: 'n5', to_node_id: 'n2', score: 0.87, confidence: 0.87, type: 'foot_corridor', risk: 'high', models: ['gravity', 'hmm', 'linguistic'] });
  await createCorridor({ id: 'c3', from_node_id: 'n3', to_node_id: 'n5', score: 0.72, confidence: 0.72, type: 'foot_corridor', risk: 'medium', models: ['diffusion', 'entropy'] });
  await createCorridor({ id: 'c4', from_node_id: 'n4', to_node_id: 'n1', score: 0.65, confidence: 0.65, type: 'trade_route', risk: 'low', models: ['gravity'] });

  await createCorridor({ id: 'c5', from_node_id: 'n6', to_node_id: 'n9', score: 0.92, confidence: 0.92, type: 'market_route', risk: 'critical', models: ['gravity', 'centrality', 'hmm', 'entropy'] });
  await createCorridor({ id: 'c6', from_node_id: 'n9', to_node_id: 'n7', score: 0.92, confidence: 0.92, type: 'market_route', risk: 'critical', models: ['gravity', 'linguistic', 'fourier'] });
  await createCorridor({ id: 'c7', from_node_id: 'n8', to_node_id: 'n6', score: 0.80, confidence: 0.80, type: 'trade_route', risk: 'medium', models: ['diffusion'] });

  await createCorridor({ id: 'c8', from_node_id: 'n10', to_node_id: 'n13', score: 0.78, confidence: 0.78, type: 'seasonal_migration', risk: 'medium', models: ['gravity', 'fourier', 'linguistic'] });
  await createCorridor({ id: 'c9', from_node_id: 'n13', to_node_id: 'n11', score: 0.78, confidence: 0.78, type: 'foot_corridor', risk: 'medium', models: ['hmm', 'centrality'] });
  await createCorridor({ id: 'c10', from_node_id: 'n12', to_node_id: 'n13', score: 0.60, confidence: 0.60, type: 'foot_corridor', risk: 'low', models: ['linguistic'] });

  await createCorridor({ id: 'c11', from_node_id: 'n14', to_node_id: 'n16', score: 0.95, confidence: 0.95, type: 'river_crossing', risk: 'critical', models: ['gravity', 'diffusion', 'centrality', 'hmm', 'entropy'] });
  await createCorridor({ id: 'c12', from_node_id: 'n16', to_node_id: 'n15', score: 0.95, confidence: 0.95, type: 'river_crossing', risk: 'critical', models: ['gravity', 'hmm', 'fourier'] });
  await createCorridor({ id: 'c13', from_node_id: 'n17', to_node_id: 'n14', score: 0.70, confidence: 0.70, type: 'trade_route', risk: 'medium', models: ['diffusion', 'gravity'] });

  await createCorridor({ id: 'c14', from_node_id: 'n18', to_node_id: 'n20', score: 0.83, confidence: 0.83, type: 'trade_route', risk: 'high', models: ['gravity', 'fourier', 'centrality'] });
  await createCorridor({ id: 'c15', from_node_id: 'n20', to_node_id: 'n19', score: 0.83, confidence: 0.83, type: 'foot_corridor', risk: 'high', models: ['hmm', 'entropy'] });

  await createCorridor({ id: 'c16', from_node_id: 'n21', to_node_id: 'n23', score: 0.71, confidence: 0.71, type: 'foot_corridor', risk: 'medium', models: ['diffusion', 'linguistic'] });
  await createCorridor({ id: 'c17', from_node_id: 'n23', to_node_id: 'n22', score: 0.71, confidence: 0.71, type: 'market_route', risk: 'medium', models: ['gravity', 'fourier'] });

  console.log('[Seed] Seeding sample signals...');

  await createSignal({ id: 's1', node_id: 'n1', type: 'disease', message: 'Cholera cluster — 14 cases reported in Jibia market area', truth_score: 0.94 });
  await createSignal({ id: 's2', node_id: 'n2', type: 'disease', message: 'Diarrheal illness surge at Maradi central hospital', truth_score: 0.88 });
  await createSignal({ id: 's3', node_id: 'n5', type: 'entropy_spike', message: 'ENTROPY SPIKE — Signal cluster at Phantom-α exceeds baseline by 2.3σ', truth_score: 0.97 });
  await createSignal({ id: 's4', node_id: 'n6', type: 'transport', message: 'Motorcycle taxi drivers rerouting via lagoon path — checkpoint active on main road', truth_score: 0.82 });
  await createSignal({ id: 's5', node_id: 'n14', type: 'disease', message: 'Ebola contact traced to Kasindi market — 3 suspected cases', truth_score: 0.96 });
  await createSignal({ id: 's6', node_id: 'n16', type: 'entropy_spike', message: 'PHANTOM-δ ACTIVATED — River crossing traffic surge detected', truth_score: 0.99 });

  console.log('[Seed] Database seeding complete ✓');
  return { success: true, message: 'Database seeded successfully' };
}
