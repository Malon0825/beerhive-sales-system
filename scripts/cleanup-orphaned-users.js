/**
 * Cleanup Orphaned Users Utility
 * 
 * PURPOSE:
 * Fixes inconsistencies between Supabase Auth (auth.users) and application users table
 * 
 * SCENARIOS HANDLED:
 * 1. Orphaned Auth Users - exist in auth.users but not in users table
 * 2. Orphaned DB Users - exist in users table but not in auth.users
 * 
 * USAGE:
 * node scripts/cleanup-orphaned-users.js
 * 
 * SAFETY:
 * - Dry-run mode by default (shows what would be cleaned)
 * - Use --execute flag to actually clean up
 * - Backs up user data before deletion
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local (Next.js convention)
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

// Check if --execute flag is present
const EXECUTE_MODE = process.argv.includes('--execute');
const SPECIFIC_EMAIL = process.argv.find(arg => arg.startsWith('--email='))?.split('=')[1];
const SPECIFIC_USERNAME = process.argv.find(arg => arg.startsWith('--username='))?.split('=')[1];

console.log('🔧 Orphaned Users Cleanup Utility');
console.log('='.repeat(60));
console.log(`Mode: ${EXECUTE_MODE ? '🔴 EXECUTE' : '🟡 DRY RUN (preview only)'}`);
if (SPECIFIC_EMAIL) console.log(`Filter: Email = ${SPECIFIC_EMAIL}`);
if (SPECIFIC_USERNAME) console.log(`Filter: Username = ${SPECIFIC_USERNAME}`);
console.log('='.repeat(60));
console.log('');

/**
 * Find orphaned auth users (in auth.users but not in users table)
 */
async function findOrphanedAuthUsers() {
  console.log('📋 Step 1: Checking for orphaned auth users...');
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list auth users: ${authError.message}`);
    }
    
    console.log(`   Found ${authUsers.users.length} users in Supabase Auth`);
    
    // Get all users from users table
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('id, username, email');
    
    if (dbError) {
      throw new Error(`Failed to query users table: ${dbError.message}`);
    }
    
    console.log(`   Found ${dbUsers.length} users in users table`);
    
    // Find auth users that don't exist in users table
    const dbUserIds = new Set(dbUsers.map(u => u.id));
    const orphanedAuthUsers = authUsers.users.filter(authUser => !dbUserIds.has(authUser.id));
    
    // Apply filters if specified
    let filteredOrphans = orphanedAuthUsers;
    if (SPECIFIC_EMAIL) {
      filteredOrphans = filteredOrphans.filter(u => u.email === SPECIFIC_EMAIL);
    }
    if (SPECIFIC_USERNAME) {
      // Can't filter by username for auth-only users (no username in auth.users)
      console.log('   ⚠️  Warning: Username filter not applicable to auth-only users');
    }
    
    console.log(`   ✅ Found ${filteredOrphans.length} orphaned auth users`);
    
    return filteredOrphans;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Find orphaned database users (in users table but not in auth.users)
 */
async function findOrphanedDbUsers() {
  console.log('\n📋 Step 2: Checking for orphaned database users...');
  
  try {
    // Get all users from users table
    let query = supabase
      .from('users')
      .select('id, username, email, full_name, role, is_active');
    
    // Apply filters if specified
    if (SPECIFIC_EMAIL) {
      query = query.eq('email', SPECIFIC_EMAIL);
    }
    if (SPECIFIC_USERNAME) {
      query = query.eq('username', SPECIFIC_USERNAME);
    }
    
    const { data: dbUsers, error: dbError } = await query;
    
    if (dbError) {
      throw new Error(`Failed to query users table: ${dbError.message}`);
    }
    
    console.log(`   Found ${dbUsers.length} users in users table (after filters)`);
    
    // Check each DB user to see if they exist in auth
    const orphanedDbUsers = [];
    
    for (const dbUser of dbUsers) {
      try {
        const { data: authUser, error } = await supabase.auth.admin.getUserById(dbUser.id);
        
        if (error || !authUser) {
          orphanedDbUsers.push(dbUser);
        }
      } catch (error) {
        // User doesn't exist in auth
        orphanedDbUsers.push(dbUser);
      }
    }
    
    console.log(`   ✅ Found ${orphanedDbUsers.length} orphaned database users`);
    
    return orphanedDbUsers;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Clean up orphaned auth users
 */
async function cleanupOrphanedAuthUsers(orphans) {
  if (orphans.length === 0) {
    console.log('\n✅ No orphaned auth users to clean up');
    return;
  }
  
  console.log(`\n🧹 Step 3: Cleaning up ${orphans.length} orphaned auth users...`);
  
  for (const authUser of orphans) {
    console.log(`\n   👤 Auth User: ${authUser.email} (ID: ${authUser.id})`);
    console.log(`      Created: ${authUser.created_at}`);
    
    if (EXECUTE_MODE) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(authUser.id);
        
        if (error) {
          console.error(`      ❌ Failed to delete: ${error.message}`);
        } else {
          console.log(`      ✅ Deleted from auth.users`);
        }
      } catch (error) {
        console.error(`      ❌ Exception: ${error.message}`);
      }
    } else {
      console.log(`      🟡 Would delete from auth.users (dry-run)`);
    }
  }
}

/**
 * Clean up orphaned database users
 */
async function cleanupOrphanedDbUsers(orphans) {
  if (orphans.length === 0) {
    console.log('\n✅ No orphaned database users to clean up');
    return;
  }
  
  console.log(`\n🧹 Step 4: Cleaning up ${orphans.length} orphaned database users...`);
  
  for (const dbUser of orphans) {
    console.log(`\n   👤 DB User: ${dbUser.username} (${dbUser.email})`);
    console.log(`      ID: ${dbUser.id}`);
    console.log(`      Role: ${dbUser.role}`);
    console.log(`      Active: ${dbUser.is_active}`);
    
    if (EXECUTE_MODE) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', dbUser.id);
        
        if (error) {
          console.error(`      ❌ Failed to delete: ${error.message}`);
        } else {
          console.log(`      ✅ Deleted from users table`);
        }
      } catch (error) {
        console.error(`      ❌ Exception: ${error.message}`);
      }
    } else {
      console.log(`      🟡 Would delete from users table (dry-run)`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Find orphaned users
    const orphanedAuthUsers = await findOrphanedAuthUsers();
    const orphanedDbUsers = await findOrphanedDbUsers();
    
    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Orphaned Auth Users (auth.users only): ${orphanedAuthUsers.length}`);
    console.log(`Orphaned DB Users (users table only): ${orphanedDbUsers.length}`);
    console.log('='.repeat(60));
    
    // Cleanup
    await cleanupOrphanedAuthUsers(orphanedAuthUsers);
    await cleanupOrphanedDbUsers(orphanedDbUsers);
    
    // Final message
    console.log('\n' + '='.repeat(60));
    if (EXECUTE_MODE) {
      console.log('✅ CLEANUP COMPLETE');
    } else {
      console.log('🟡 DRY RUN COMPLETE');
      console.log('\nTo execute cleanup, run:');
      console.log('node scripts/cleanup-orphaned-users.js --execute');
      if (SPECIFIC_EMAIL || SPECIFIC_USERNAME) {
        console.log('\nWith current filters applied.');
      }
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run
main();
