/**
 * Database Initialization Script
 * Run: npx tsx scripts/init-db.ts
 */

import { seedDatabase } from '../app/seed';

async function main() {
  console.log('🚀 Phantom POE Engine — Database Initialization');
  console.log('Engine: mo-border-phantom-001');
  console.log('Target: Neon PostgreSQL\n');

  try {
    const result = await seedDatabase();
    
    if (result.success) {
      console.log('\n✓ Database initialization complete');
      console.log('✓ Schema created');
      console.log('✓ 23 nodes seeded');
      console.log('✓ 17 corridors seeded');
      console.log('✓ 6 signals seeded');
      console.log('\n◉⟁⬡ MoStar Grid v2.1 — ONLINE');
    } else {
      console.error('\n✗ Database initialization failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
