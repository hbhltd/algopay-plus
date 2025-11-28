/**
 * Database Migration Runner
 * Runs SQL migration files against the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Run a migration file
 */
async function runMigration(filename) {
  const client = await pool.connect();

  try {
    console.log(`\n📦 Running migration: ${filename}`);

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(sql);

    console.log(`✅ Migration completed: ${filename}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Run all migrations
 */
async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, 'database', 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  // Get all .sql files in migrations directory
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const success = await runMigration(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════\n');

  process.exit(failCount > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  runAllMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration, runAllMigrations };
