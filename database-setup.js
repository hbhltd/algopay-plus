require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🎯 SUPPORTLY DATABASE SETUP INSTRUCTIONS        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('creators').select('count').limit(1);

    if (error && error.code === 'PGRST204') {
      // Table doesn't exist yet - this is expected
      console.log('✅ Connection successful (database is empty - ready for setup)\n');
    } else if (error) {
      console.log('⚠️  Connection warning:', error.message);
      console.log('   (This is OK if the database is not set up yet)\n');
    } else {
      console.log('✅ Connection successful (database already has tables)\n');
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('📋 COMPLETE DATABASE SETUP STEPS:\n');
    console.log('1. Open Supabase Dashboard:');
    console.log('   👉 https://supabase.com/dashboard\n');

    console.log('2. Select your project:');
    console.log('   👉 jygcuixcfjsndutjpomu\n');

    console.log('3. Click "SQL Editor" in the left sidebar\n');

    console.log('4. Click "New Query" button\n');

    console.log('5. Open this file and copy ALL contents:');
    console.log('   👉 database/reset-database.sql\n');

    console.log('6. Paste the SQL into the editor\n');

    console.log('7. Click "Run" (or press Cmd/Ctrl + Enter)\n');

    console.log('8. Wait for completion message:\n');
    console.log('   ✅ "Supportly database reset and setup completed successfully! 🎉"\n');

    console.log('═══════════════════════════════════════════════════\n');
    console.log('💡 TIPS:\n');
    console.log('   • The script is safe to run multiple times');
    console.log('   • It will clean up and recreate everything fresh');
    console.log('   • All errors from old data will be handled automatically\n');

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🚀 AFTER DATABASE SETUP:\n');
    console.log('   Run: npm start\n');
    console.log('   This will start the Supportly backend server\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 This might mean:');
    console.log('   1. Supabase credentials are not set correctly');
    console.log('   2. Check backend/.env file');
    console.log('   3. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are correct\n');
    process.exit(1);
  }
}

setupDatabase();
