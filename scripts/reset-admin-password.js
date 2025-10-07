/**
 * Reset Admin Password Utility (JavaScript)
 * 
 * This script resets the admin user's password to a known value.
 * Use this if you're locked out or forgot the admin password.
 * 
 * Usage:
 *   node scripts/reset-admin-password.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

const env = loadEnvFile();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure the following are set in .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase Admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Main function to reset admin password
 */
async function resetAdminPassword() {
  try {
    console.log('🔄 Starting admin password reset...\n');

    // Step 1: Find admin user
    console.log('📋 Step 1: Looking for admin user...');
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, role, roles, is_active')
      .eq('username', 'admin')
      .single();

    if (fetchError || !users) {
      console.error('❌ Admin user not found in database!');
      console.error('Error:', fetchError?.message);
      process.exit(1);
    }

    console.log('✅ Found admin user:');
    console.log(`   - ID: ${users.id}`);
    console.log(`   - Username: ${users.username}`);
    console.log(`   - Email: ${users.email}`);
    console.log(`   - Roles: ${JSON.stringify(users.roles)}`);
    console.log(`   - Active: ${users.is_active}\n`);

    if (!users.is_active) {
      console.warn('⚠️  Warning: Admin user is inactive!');
      console.log('🔄 Reactivating admin user...');
      
      const { error: reactivateError } = await supabaseAdmin
        .from('users')
        .update({ is_active: true })
        .eq('id', users.id);

      if (reactivateError) {
        console.error('❌ Failed to reactivate user:', reactivateError.message);
      } else {
        console.log('✅ Admin user reactivated\n');
      }
    }

    // Step 2: Set new password
    const newPassword = 'Admin123!';
    console.log('🔐 Step 2: Resetting password...');
    console.log(`   New password: ${newPassword}`);

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      users.id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error('❌ Failed to reset password!');
      console.error('Error:', passwordError.message);
      process.exit(1);
    }

    console.log('✅ Password reset successfully!\n');

    // Step 3: Confirm email (if not confirmed)
    console.log('📧 Step 3: Confirming email...');
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      users.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.warn('⚠️  Warning: Could not confirm email:', confirmError.message);
    } else {
      console.log('✅ Email confirmed\n');
    }

    // Step 4: Verify roles are correct
    console.log('🔧 Step 4: Verifying roles configuration...');
    const rolesArray = Array.isArray(users.roles) ? users.roles : ['admin'];
    
    const { error: rolesError } = await supabaseAdmin
      .from('users')
      .update({ 
        roles: rolesArray,
        role: rolesArray[0]
      })
      .eq('id', users.id);

    if (rolesError) {
      console.warn('⚠️  Warning: Could not update roles:', rolesError.message);
    } else {
      console.log('✅ Roles verified\n');
    }

    // Success summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ADMIN PASSWORD RESET COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📝 Login Credentials:');
    console.log(`   Username: ${users.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Email:    ${users.email}`);
    console.log('\n🌐 Login URL: http://localhost:3000/login');
    console.log('\n⚠️  IMPORTANT: Change this password after logging in!');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();
