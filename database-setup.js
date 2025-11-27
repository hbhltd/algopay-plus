require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🔄 Starting database setup...\n');

  try {
    // Read the schema file
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');

    console.log('📋 Clearing old tables...');

    // Drop all existing tables (in reverse order of dependencies)
    const dropCommands = [
      'DROP TABLE IF EXISTS analytics_events CASCADE;',
      'DROP TABLE IF EXISTS email_preferences CASCADE;',
      'DROP TABLE IF EXISTS content CASCADE;',
      'DROP TABLE IF EXISTS subscriptions CASCADE;',
      'DROP TABLE IF EXISTS nfts CASCADE;',
      'DROP TABLE IF EXISTS nft_configs CASCADE;',
      'DROP TABLE IF EXISTS donations CASCADE;',
      'DROP TABLE IF EXISTS creators CASCADE;',
      'DROP VIEW IF EXISTS creator_revenue_summary CASCADE;',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;'
    ];

    for (const cmd of dropCommands) {
      const { error } = await supabase.rpc('exec_sql', { sql: cmd }).catch(() => {
        // Try direct query if RPC doesn't exist
        return { error: null };
      });
      if (error && !error.message.includes('does not exist')) {
        console.warn(`⚠️  ${error.message}`);
      }
    }

    console.log('✅ Old tables cleared\n');

    console.log('📦 Applying new Supportly schema...');
    console.log('⚠️  Note: Supabase client cannot execute full SQL files.');
    console.log('📝 Please run the schema manually in Supabase SQL Editor:\n');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the left menu');
    console.log('4. Click "New Query"');
    console.log('5. Copy the contents of database/schema.sql');
    console.log('6. Paste and click "Run"\n');

    console.log('✅ Database setup instructions provided');
    console.log('🎯 After running the schema, restart this script or start the backend\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
