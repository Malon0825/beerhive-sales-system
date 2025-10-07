/**
 * User State Diagnostic Tool
 * 
 * This script helps diagnose user creation issues by:
 * 1. Listing all users in Supabase Auth
 * 2. Listing all users in the database
 * 3. Identifying orphaned auth users (in auth but not in database)
 * 4. Identifying orphaned database users (in database but not in auth)
 * 5. Providing cleanup commands for orphaned users
 * 
 * Usage:
 * - To diagnose: ts-node scripts/diagnose-user-state.ts
 * - To check a specific user: ts-node scripts/diagnose-user-state.ts <username_or_email>
 * - To cleanup orphans: ts-node scripts/diagnose-user-state.ts --cleanup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
}

interface DatabaseUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

/**
 * Get all users from Supabase Auth
 */
async function getAuthUsers(): Promise<AuthUser[]> {
  console.log('\n🔍 Fetching users from Supabase Auth...');
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching auth users:', error);
      return [];
    }
    
    console.log(`✅ Found ${data.users.length} users in Auth`);
    return data.users.map(user => ({
      id: user.id,
      email: user.email || 'NO_EMAIL',
      created_at: user.created_at,
      confirmed_at: user.confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
    }));
  } catch (error) {
    console.error('❌ Exception fetching auth users:', error);
    return [];
  }
}

/**
 * Get all users from database
 */
async function getDatabaseUsers(): Promise<DatabaseUser[]> {
  console.log('\n🔍 Fetching users from database...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, roles, is_active, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching database users:', error);
      return [];
    }
    
    console.log(`✅ Found ${data.length} users in Database`);
    return data;
  } catch (error) {
    console.error('❌ Exception fetching database users:', error);
    return [];
  }
}

/**
 * Find orphaned users
 */
function findOrphans(authUsers: AuthUser[], dbUsers: DatabaseUser[]) {
  const authUserIds = new Set(authUsers.map(u => u.id));
  const dbUserIds = new Set(dbUsers.map(u => u.id));
  
  // Orphaned auth users (in auth but not in database)
  const orphanedAuthUsers = authUsers.filter(u => !dbUserIds.has(u.id));
  
  // Orphaned database users (in database but not in auth)
  const orphanedDbUsers = dbUsers.filter(u => !authUserIds.has(u.id));
  
  return { orphanedAuthUsers, orphanedDbUsers };
}

/**
 * Display user details
 */
function displayUserDetails(authUsers: AuthUser[], dbUsers: DatabaseUser[]) {
  console.log('\n========================================');
  console.log('📊 USER STATE ANALYSIS');
  console.log('========================================\n');
  
  console.log('📈 Summary:');
  console.log(`   Auth Users: ${authUsers.length}`);
  console.log(`   Database Users: ${dbUsers.length}`);
  
  const { orphanedAuthUsers, orphanedDbUsers } = findOrphans(authUsers, dbUsers);
  
  console.log(`   Orphaned Auth Users: ${orphanedAuthUsers.length}`);
  console.log(`   Orphaned DB Users: ${orphanedDbUsers.length}`);
  
  // Display all users
  if (dbUsers.length > 0) {
    console.log('\n📋 All Users:');
    console.log('─'.repeat(100));
    console.log(
      'ID'.padEnd(38) + 
      'Username'.padEnd(20) + 
      'Email'.padEnd(30) + 
      'Active'.padEnd(8) + 
      'Created'
    );
    console.log('─'.repeat(100));
    
    dbUsers.forEach(user => {
      const isOrphaned = !authUsers.some(au => au.id === user.id);
      const marker = isOrphaned ? '⚠️ ' : '✅ ';
      
      console.log(
        marker +
        user.id.padEnd(36) + 
        user.username.padEnd(20) + 
        user.email.padEnd(30) + 
        (user.is_active ? 'Yes' : 'No').padEnd(8) + 
        new Date(user.created_at).toLocaleString()
      );
    });
  }
  
  // Display orphaned auth users (need cleanup)
  if (orphanedAuthUsers.length > 0) {
    console.log('\n⚠️  ORPHANED AUTH USERS (in Auth but not in Database):');
    console.log('─'.repeat(100));
    console.log('These users should be deleted from Supabase Auth:');
    console.log('');
    
    orphanedAuthUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log('');
    });
    
    console.log('💡 To cleanup these orphaned auth users, run:');
    console.log('   ts-node scripts/diagnose-user-state.ts --cleanup');
  }
  
  // Display orphaned database users (rare, but possible)
  if (orphanedDbUsers.length > 0) {
    console.log('\n⚠️  ORPHANED DATABASE USERS (in Database but not in Auth):');
    console.log('─'.repeat(100));
    console.log('These users cannot log in (no auth record):');
    console.log('');
    
    orphanedDbUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
  }
  
  console.log('\n========================================\n');
}

/**
 * Cleanup orphaned auth users
 */
async function cleanupOrphanedAuthUsers(orphanedUsers: AuthUser[]) {
  if (orphanedUsers.length === 0) {
    console.log('✅ No orphaned auth users to cleanup');
    return;
  }
  
  console.log(`\n🧹 Cleaning up ${orphanedUsers.length} orphaned auth users...`);
  console.log('─'.repeat(80));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of orphanedUsers) {
    try {
      console.log(`\nDeleting: ${user.email} (${user.id})`);
      
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error(`❌ Failed: ${error.message}`);
        failCount++;
      } else {
        console.log('✅ Deleted successfully');
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Exception: ${error}`);
      failCount++;
    }
  }
  
  console.log('\n─'.repeat(80));
  console.log(`📊 Cleanup Summary:`);
  console.log(`   ✅ Successfully deleted: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('─'.repeat(80)\n');
}

/**
 * Search for a specific user
 */
async function searchUser(searchTerm: string, authUsers: AuthUser[], dbUsers: DatabaseUser[]) {
  console.log(`\n🔍 Searching for user: ${searchTerm}`);
  console.log('─'.repeat(80));
  
  const term = searchTerm.toLowerCase();
  
  // Search in auth users
  const authMatches = authUsers.filter(u => 
    u.email.toLowerCase().includes(term) || 
    u.id.toLowerCase().includes(term)
  );
  
  // Search in database users
  const dbMatches = dbUsers.filter(u => 
    u.username.toLowerCase().includes(term) || 
    u.email.toLowerCase().includes(term) || 
    u.id.toLowerCase().includes(term)
  );
  
  if (authMatches.length === 0 && dbMatches.length === 0) {
    console.log('❌ No users found matching:', searchTerm);
    return;
  }
  
  if (dbMatches.length > 0) {
    console.log('\n📋 Database Matches:');
    dbMatches.forEach(user => {
      const hasAuth = authUsers.some(au => au.id === user.id);
      console.log(`\n${hasAuth ? '✅' : '⚠️ '} ${user.username} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${user.roles.join(', ')}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Auth Status: ${hasAuth ? 'Has auth record' : '⚠️  NO AUTH RECORD'}`);
    });
  }
  
  if (authMatches.length > 0) {
    console.log('\n🔐 Auth Matches:');
    authMatches.forEach(user => {
      const hasDb = dbUsers.some(du => du.id === user.id);
      console.log(`\n${hasDb ? '✅' : '⚠️ '} ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Confirmed: ${user.confirmed_at ? new Date(user.confirmed_at).toLocaleString() : 'Not confirmed'}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log(`   Database Status: ${hasDb ? 'Has database record' : '⚠️  NO DATABASE RECORD (ORPHANED)'}`);
    });
  }
  
  console.log('\n─'.repeat(80)\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isCleanup = args.includes('--cleanup');
  const searchTerm = args.find(arg => !arg.startsWith('--'));
  
  console.log('🚀 User State Diagnostic Tool');
  console.log('═'.repeat(80));
  
  // Fetch all users
  const authUsers = await getAuthUsers();
  const dbUsers = await getDatabaseUsers();
  
  // Handle search
  if (searchTerm) {
    await searchUser(searchTerm, authUsers, dbUsers);
    return;
  }
  
  // Display analysis
  displayUserDetails(authUsers, dbUsers);
  
  // Handle cleanup
  if (isCleanup) {
    const { orphanedAuthUsers } = findOrphans(authUsers, dbUsers);
    await cleanupOrphanedAuthUsers(orphanedAuthUsers);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
