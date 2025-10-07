/**
 * Quick Duplicate User Checker
 * Shows exactly what username/email is causing conflicts
 * 
 * Usage: node scripts/check-duplicate-user.js --username=USERNAME --email=EMAIL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get parameters
const args = process.argv.slice(2);
const username = args.find(arg => arg.startsWith('--username='))?.split('=')[1];
const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];

if (!username && !email) {
  console.log('Usage: node scripts/check-duplicate-user.js --username=USERNAME --email=EMAIL');
  console.log('   OR: node scripts/check-duplicate-user.js --username=USERNAME');
  console.log('   OR: node scripts/check-duplicate-user.js --email=EMAIL');
  process.exit(1);
}

async function checkDuplicates() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DUPLICATE USER CHECKER');
  console.log('='.repeat(70));
  
  if (username) console.log(`Checking username: ${username}`);
  if (email) console.log(`Checking email: ${email}`);
  console.log('');
  
  // Build query
  let conditions = [];
  if (username) conditions.push(`username.eq.${username}`);
  if (email) conditions.push(`email.eq.${email}`);
  
  const orCondition = conditions.join(',');
  
  console.log('📋 Step 1: Checking users table...');
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('id, username, email, full_name, role, is_active, created_at')
    .or(orCondition);
  
  if (dbError) {
    console.error('❌ Database query failed:', dbError);
    process.exit(1);
  }
  
  console.log(`Found ${dbUsers.length} matching records in users table\n`);
  
  if (dbUsers.length > 0) {
    for (const user of dbUsers) {
      console.log('┌─ USER FOUND IN DATABASE ─────────────────────────────');
      console.log('│ ID:         ', user.id);
      console.log('│ Username:   ', user.username);
      console.log('│ Email:      ', user.email);
      console.log('│ Full Name:  ', user.full_name);
      console.log('│ Role:       ', user.role);
      console.log('│ Active:     ', user.is_active ? '✅ Yes' : '❌ No');
      console.log('│ Created:    ', user.created_at);
      console.log('│');
      
      // Check if auth user exists
      console.log('│ 🔐 Checking Supabase Auth...');
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authError || !authUser) {
          console.log('│ Auth Status: ❌ NOT FOUND (ORPHANED DB RECORD)');
          console.log('│ Issue:       User in DB but NOT in Auth');
          console.log('│ Fix:         DELETE this record OR create auth user');
        } else {
          console.log('│ Auth Status: ✅ FOUND');
          console.log('│ Auth Email: ', authUser.user.email);
          console.log('│ Issue:       None - user is complete');
        }
      } catch (err) {
        console.log('│ Auth Status: ❌ ERROR checking auth');
        console.log('│ Error:      ', err.message);
      }
      console.log('└────────────────────────────────────────────────────────\n');
    }
  } else {
    console.log('✅ NO CONFLICTS - Username and email are available!\n');
  }
  
  // Check auth for orphaned auth records
  console.log('📋 Step 2: Checking for orphaned auth records...');
  const { data: allAuthUsers } = await supabase.auth.admin.listUsers();
  
  let foundOrphanedAuth = false;
  for (const authUser of allAuthUsers.users) {
    if (email && authUser.email === email) {
      // Check if exists in DB
      const inDb = dbUsers.some(u => u.id === authUser.id);
      if (!inDb) {
        foundOrphanedAuth = true;
        console.log('┌─ ORPHANED AUTH USER ─────────────────────────────────');
        console.log('│ ID:         ', authUser.id);
        console.log('│ Email:      ', authUser.email);
        console.log('│ Created:    ', authUser.created_at);
        console.log('│ Issue:       User in Auth but NOT in DB');
        console.log('│ Fix:         DELETE from auth.users');
        console.log('└────────────────────────────────────────────────────────\n');
      }
    }
  }
  
  if (!foundOrphanedAuth && dbUsers.length === 0) {
    console.log('✅ No orphaned auth records found\n');
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  if (dbUsers.length === 0) {
    console.log('✅ NO DUPLICATES - You can create this user!');
  } else {
    console.log('❌ CONFLICTS FOUND - Cannot create user');
    console.log('');
    console.log('🔧 RECOMMENDED ACTION:');
    console.log('   1. Delete the orphaned records using cleanup script:');
    console.log('');
    if (username && email) {
      console.log(`   node scripts\\cleanup-orphaned-users.js --email=${email} --execute`);
    } else if (email) {
      console.log(`   node scripts\\cleanup-orphaned-users.js --email=${email} --execute`);
    } else if (username) {
      console.log(`   node scripts\\cleanup-orphaned-users.js --username=${username} --execute`);
    }
    console.log('');
    console.log('   2. Try creating the user again in the UI');
  }
  console.log('='.repeat(70) + '\n');
}

checkDuplicates().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
