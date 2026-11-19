import { MigrationEngine } from './migrationEngine.js';

const migrationName = process.argv[2] || 'new_migration';
const isTs = process.argv.includes('--ts');

try {
  const filePath = MigrationEngine.createMigrationFile(migrationName, isTs);
  console.log(`\n✨ Created new migration file at:`);
  console.log(`   ${filePath}\n`);
  console.log(`👉 Add your SQL DDL statements (e.g. CREATE TABLE, ALTER TABLE) to this file.`);
  console.log(`👉 Next time the backend starts (or runs in dev mode), it will automatically execute and reflect on Railway!\n`);
} catch (err: any) {
  console.error('❌ Failed to create migration:', err.message);
  process.exit(1);
}

