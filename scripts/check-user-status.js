/**
 * Quick User Status Check
 * Checks if a specific user exists in auth and/or users table
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
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get email or username from command line
const email = process.argv.find(arg => arg.startsWith('--email='))?.split('=')[1];
const username = process.argv.find(arg => arg.startsWith('--username='))?.split('=')[1];

if (!email && !username) {
  console.log('Usage: node scripts/check-user-status.js --email=user@example.com');
  console.log('   OR: node scripts/check-user-status.js --username=username');
  process.exit(1);
}

async function checkUser() {
  console.log('\n========================================');
  console.log('USER STATUS CHECK');
  console.log('========================================\n');
  
  if (email) {
    console.log(`Checking email: ${email}\n`);
    
    // Check in users table
    console.log('1. Checking users table...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, full_name, is_active')
      .eq('email', email)
      .maybeSingle();
    
    if (dbUser) {
      console.log('   ✅ FOUND in users table');
      console.log(`      ID: ${dbUser.id}`);
      console.log(`      Username: ${dbUser.username}`);
      console.log(`      Email: ${dbUser.email}`);
      console.log(`      Active: ${dbUser.is_active}`);
    } else {
      console.log('   ❌ NOT FOUND in users table');
    }
    
    // Check in auth
    console.log('\n2. Checking Supabase Auth...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === email);
    
    if (authUser) {
      console.log('   ✅ FOUND in auth.users');
      console.log(`      ID: ${authUser.id}`);
      console.log(`      Email: ${authUser.email}`);
      console.log(`      Created: ${authUser.created_at}`);
    } else {
      console.log('   ❌ NOT FOUND in auth.users');
    }
    
    // Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    
    if (dbUser && authUser) {
      console.log('✅ User is COMPLETE (both auth and DB)');
      console.log('   Status: Can login successfully');
    } else if (authUser && !dbUser) {
      console.log('⚠️  User is ORPHANED (auth only)');
      console.log('   Status: Cannot login - missing DB record');
      console.log('   Fix: Delete from auth.users');
    } else if (dbUser && !authUser) {
      console.log('⚠️  User is ORPHANED (DB only)');
      console.log('   Status: Cannot login - missing auth');
      console.log('   Fix: Delete from users table OR create auth user');
    } else {
      console.log('✅ User does NOT exist');
      console.log('   Status: Can be created');
    }
    
  } else if (username) {
    console.log(`Checking username: ${username}\n`);
    
    // Check in users table
    console.log('1. Checking users table...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, full_name, is_active')
      .eq('username', username)
      .maybeSingle();
    
    if (dbUser) {
      console.log('   ✅ FOUND in users table');
      console.log(`      ID: ${dbUser.id}`);
      console.log(`      Username: ${dbUser.username}`);
      console.log(`      Email: ${dbUser.email}`);
      console.log(`      Active: ${dbUser.is_active}`);
      
      // Check auth
      console.log('\n2. Checking Supabase Auth...');
      const { data: authUser } = await supabase.auth.admin.getUserById(dbUser.id);
      
      if (authUser) {
        console.log('   ✅ FOUND in auth.users');
      } else {
        console.log('   ❌ NOT FOUND in auth.users (ORPHANED)');
      }
      
      // Summary
      console.log('\n========================================');
      console.log('SUMMARY');
      console.log('========================================');
      
      if (authUser) {
        console.log('✅ User is COMPLETE (both auth and DB)');
        console.log('   Status: Can login successfully');
      } else {
        console.log('⚠️  User is ORPHANED (DB only)');
        console.log('   Status: Cannot login - missing auth');
      }
    } else {
      console.log('   ❌ NOT FOUND in users table');
      console.log('\n✅ Username is AVAILABLE');
      console.log('   Status: Can be created');
    }
  }
  
  console.log('========================================\n');
}

checkUser().catch(console.error);
