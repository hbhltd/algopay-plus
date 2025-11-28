#!/usr/bin/env node
/**
 * Print Migration SQL
 * Outputs migration SQL for easy copying to Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2] || '008_add_shop_storage_social.sql';
const migrationPath = path.join(__dirname, 'migrations', migrationFile);

console.log('\n' + '='.repeat(60));
console.log('📋 MIGRATION SQL - Ready to Copy');
console.log('='.repeat(60));
console.log(`\nFile: ${migrationFile}\n`);
console.log('INSTRUCTIONS:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Click "SQL Editor" in the sidebar');
console.log('4. Click "New Query"');
console.log('5. Copy the SQL below (starting after the line)');
console.log('6. Paste into SQL Editor');
console.log('7. Click "Run" or press Cmd/Ctrl + Enter');
console.log('\n' + '-'.repeat(60));
console.log('SQL MIGRATION (copy everything below this line):\n');
console.log('-'.repeat(60) + '\n');

try {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(sql);
  console.log('\n' + '-'.repeat(60));
  console.log('✅ End of SQL migration');
  console.log('='.repeat(60) + '\n');
} catch (error) {
  console.error('\n❌ Error reading migration file:', error.message);
  console.error(`\nMake sure the file exists at: ${migrationPath}\n`);
  process.exit(1);
}
