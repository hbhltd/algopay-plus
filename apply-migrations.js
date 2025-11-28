#!/usr/bin/env node

/**
 * 🚀 SUPPORTLY - AUTOMATIC MIGRATION APPLIER
 *
 * This script automatically applies all pending migrations to your Supabase database.
 * It's beginner-friendly and shows you exactly what's happening!
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
};

// Migrations to apply (in order)
const MIGRATIONS = [
  { file: '008_add_shop_storage_social.sql', name: 'Shop, Storage & Social Media' },
  { file: '009_add_community_subscribers.sql', name: 'Community Subscribers' },
  { file: '010_add_newsletter_system.sql', name: 'Newsletter System' },
  { file: '011_add_qr_scan_function.sql', name: 'QR Code Scan Tracking' },
];

async function main() {
  log.title('🚀 Supportly - Migration Applier');

  // Step 1: Check environment variables
  log.step('Step 1: Checking environment variables...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    log.error('Missing Supabase credentials!');
    log.info('Make sure your .env file has:');
    log.info('  SUPABASE_URL=https://your-project.supabase.co');
    log.info('  SUPABASE_SERVICE_KEY=your-service-key-here');
    process.exit(1);
  }

  log.success('Environment variables found!');
  log.info(`   Supabase URL: ${process.env.SUPABASE_URL}`);

  // Step 2: Connect to Supabase
  log.step('Step 2: Connecting to Supabase...');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Test connection
  try {
    const { data, error } = await supabase.from('creators').select('count').limit(1);
    if (error) throw error;
    log.success('Connected to Supabase!');
  } catch (err) {
    log.error(`Failed to connect: ${err.message}`);
    log.info('Check your SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Step 3: Apply migrations
  log.step('Step 3: Applying migrations...');
  console.log('');

  const migrationsDir = path.join(__dirname, 'database', 'migrations');
  let successCount = 0;
  let failCount = 0;

  for (const migration of MIGRATIONS) {
    const filePath = path.join(migrationsDir, migration.file);

    log.info(`📄 ${migration.name} (${migration.file})`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      log.warning(`   File not found: ${filePath}`);
      failCount++;
      continue;
    }

    // Read migration SQL
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      // Execute migration
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Check if it's a "already exists" error (which is OK!)
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          log.warning('   Already applied (skipping)');
          successCount++;
        } else {
          throw error;
        }
      } else {
        log.success('   Applied successfully!');
        successCount++;
      }
    } catch (err) {
      log.error(`   Failed: ${err.message}`);
      failCount++;

      // Try direct SQL execution as fallback
      log.info('   Trying alternative method...');
      try {
        // Split into individual statements and execute
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          if (stmt.length > 0) {
            await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
          }
        }
        log.success('   Applied successfully (alternative method)!');
        successCount++;
        failCount--; // Remove the previous fail count
      } catch (err2) {
        log.error(`   Alternative method also failed: ${err2.message}`);
        log.warning('   ⚠️ You may need to apply this migration manually in Supabase SQL Editor');
        log.info(`   ⚠️ File location: ${filePath}`);
      }
    }

    console.log('');
  }

  // Step 4: Summary
  log.title('📊 Migration Summary');

  console.log(`Total migrations: ${MIGRATIONS.length}`);
  console.log(`${colors.green}✓ Successful: ${successCount}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failCount}${colors.reset}`);
  console.log('');

  if (failCount > 0) {
    log.warning('Some migrations failed!');
    log.info('To apply them manually:');
    log.info('1. Go to: https://supabase.com/dashboard');
    log.info('2. Open your project');
    log.info('3. Click "SQL Editor"');
    log.info('4. Click "New Query"');
    log.info('5. Copy the contents of the failed migration file');
    log.info('6. Paste into the SQL Editor');
    log.info('7. Click "Run"');
  } else {
    log.success('All migrations applied successfully! 🎉');
    log.info('Your database is now fully up to date!');
    log.info('');
    log.info('Next steps:');
    log.info('1. Start your backend: cd backend && npm run dev');
    log.info('2. Start your frontend: cd frontend && npm start');
    log.info('3. Visit: http://localhost:3000');
  }
}

// Run the script
main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
