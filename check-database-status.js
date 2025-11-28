#!/usr/bin/env node

/**
 * 🔍 DATABASE STATUS CHECKER
 * This script checks what's already set up in your Supabase database
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function checkDatabase() {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════╗`);
  console.log(`║   🔍 SUPPORTLY DATABASE STATUS CHECK              ║`);
  console.log(`╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log(`${colors.red}❌ Missing Supabase credentials!${colors.reset}`);
    console.log(`${colors.yellow}Please set up your backend/.env file first.${colors.reset}\n`);
    console.log(`Run: cp backend/.env.example backend/.env`);
    console.log(`Then edit backend/.env with your Supabase credentials\n`);
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log(`${colors.blue}📊 Checking which tables exist...${colors.reset}\n`);

  // List of all expected tables
  const expectedTables = [
    'creators',
    'donations',
    'nft_configs',
    'nfts',
    'subscriptions',
    'content',
    'analytics_events',
    'email_preferences',
    'subscription_history',         // Added by migration 001
    'invoices',                      // Added by migration 001
    'discord_connections',           // Added by migration 002
    'zapier_connections',            // Added by migration 003
    'quickbooks_connections',        // Added by migration 004
    'social_media_posts',            // Added by migration 005
    'digital_products',              // Added by migration 006
    'creator_payment_methods',       // Added by migration 008
    'creator_qr_codes',              // Added by migration 008
    'shop_items',                    // Added by migration 008
    'storage_connections',           // Added by migration 008
    'community_subscribers',         // Added by migration 009
    'newsletters',                   // Added by migration 010
  ];

  const existingTables = [];
  const missingTables = [];

  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          missingTables.push(tableName);
          console.log(`${colors.red}❌${colors.reset} ${tableName}`);
        } else {
          // Table exists, but might have RLS or other issues
          existingTables.push(tableName);
          console.log(`${colors.green}✅${colors.reset} ${tableName}`);
        }
      } else {
        existingTables.push(tableName);
        console.log(`${colors.green}✅${colors.reset} ${tableName}`);
      }
    } catch (err) {
      missingTables.push(tableName);
      console.log(`${colors.red}❌${colors.reset} ${tableName}`);
    }
  }

  // Summary
  console.log(`\n${colors.bold}═══════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.green}✅ Tables found: ${existingTables.length}${colors.reset}`);
  console.log(`${colors.red}❌ Tables missing: ${missingTables.length}${colors.reset}\n`);

  // Recommendations
  console.log(`${colors.bold}${colors.cyan}📋 RECOMMENDATIONS:${colors.reset}\n`);

  if (existingTables.length === 0) {
    // No tables exist - need fresh setup
    console.log(`${colors.yellow}⚠️  Your database is empty.${colors.reset}\n`);
    console.log(`${colors.bold}Next steps:${colors.reset}`);
    console.log(`1. Run the complete database setup:`);
    console.log(`   ${colors.cyan}node database-setup.js${colors.reset}`);
    console.log(`   This will show you instructions to set up the database.\n`);

  } else if (missingTables.length > 0) {
    // Some tables exist - need migrations
    console.log(`${colors.yellow}⚠️  You have some tables, but migrations are pending.${colors.reset}\n`);
    console.log(`${colors.bold}Missing tables that need to be added:${colors.reset}`);

    missingTables.forEach(table => {
      let migration = 'unknown';
      if (['subscription_history', 'invoices'].includes(table)) migration = '001_enhance_subscriptions.sql';
      if (['discord_connections'].includes(table)) migration = '002_add_discord_integration.sql';
      if (['zapier_connections'].includes(table)) migration = '003_add_zapier_integration.sql';
      if (['quickbooks_connections'].includes(table)) migration = '004_add_quickbooks_integration.sql';
      if (['social_media_posts'].includes(table)) migration = '005_add_social_media_integration.sql';
      if (['digital_products'].includes(table)) migration = '006_add_digital_products.sql';
      if (['creator_payment_methods', 'creator_qr_codes', 'shop_items', 'storage_connections'].includes(table)) {
        migration = '008_add_shop_storage_social.sql';
      }
      if (['community_subscribers'].includes(table)) migration = '009_add_community_subscribers.sql';
      if (['newsletters'].includes(table)) migration = '010_add_newsletter_system.sql';

      console.log(`   • ${table} ${colors.cyan}(${migration})${colors.reset}`);
    });

    console.log(`\n${colors.bold}Options:${colors.reset}\n`);
    console.log(`${colors.yellow}Option A: Apply pending migrations${colors.reset}`);
    console.log(`   1. Go to: https://supabase.com/dashboard`);
    console.log(`   2. Select SQL Editor`);
    console.log(`   3. Apply each missing migration manually from database/migrations/\n`);

    console.log(`${colors.yellow}Option B: Fresh start (reset everything)${colors.reset}`);
    console.log(`   ${colors.red}⚠️  WARNING: This will delete all existing data!${colors.reset}`);
    console.log(`   1. Go to: https://supabase.com/dashboard`);
    console.log(`   2. Select SQL Editor`);
    console.log(`   3. Run: database/reset-database.sql`);
    console.log(`   4. Then apply all migrations in order\n`);

  } else {
    // All tables exist!
    console.log(`${colors.green}✅ All tables are set up!${colors.reset}\n`);
    console.log(`${colors.bold}Your database is ready to use.${colors.reset}\n`);
    console.log(`${colors.bold}Next steps:${colors.reset}`);
    console.log(`1. Start backend: ${colors.cyan}cd backend && npm run dev${colors.reset}`);
    console.log(`2. Start frontend: ${colors.cyan}cd frontend && npm start${colors.reset}`);
    console.log(`3. Visit: ${colors.cyan}http://localhost:3000${colors.reset}\n`);
  }

  console.log(`${colors.bold}═══════════════════════════════════════════════════${colors.reset}\n`);
}

checkDatabase().catch(err => {
  console.error(`\n${colors.red}❌ Error: ${err.message}${colors.reset}\n`);

  if (err.message.includes('fetch')) {
    console.log(`${colors.yellow}💡 This might mean:${colors.reset}`);
    console.log(`   1. Your Supabase URL or key is incorrect`);
    console.log(`   2. Check backend/.env file`);
    console.log(`   3. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are correct\n`);
  }

  process.exit(1);
});
