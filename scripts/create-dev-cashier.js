/**
 * Create Development Cashier Users
 * 
 * Purpose: Fix foreign key constraint errors by creating test cashier users
 * Error: "insert or update on table 'orders' violates foreign key constraint 'orders_cashier_id_fkey'"
 * 
 * This script creates Supabase Auth users and assigns them the cashier role
 * 
 * Usage:
 *   node scripts/create-dev-cashier.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Create a test cashier user
 */
async function createCashierUser(username, email, password, fullName) {
  try {
    console.log(`\n📝 Creating user: ${username} (${email})`);
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for dev
      user_metadata: {
        full_name: fullName,
        role: 'cashier'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  User ${email} already exists, updating role...`);
        
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          // Update user record in users table
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              role: 'cashier', 
              full_name: fullName,
              username: username,
              is_active: true 
            })
            .eq('id', existingUser.id);
            
          if (updateError) {
            console.error(`❌ Error updating user: ${updateError.message}`);
            return null;
          }
          
          console.log(`✅ Updated existing user: ${email}`);
          return existingUser.id;
        }
      } else {
        console.error(`❌ Auth error: ${authError.message}`);
        return null;
      }
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created: ${userId}`);

    // Update or insert in users table
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        username,
        email,
        role: 'cashier',
        full_name: fullName,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (dbError) {
      console.error(`❌ Database error: ${dbError.message}`);
      return null;
    }

    console.log(`✅ Cashier user created successfully: ${username}`);
    return userId;

  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    return null;
  }
}

/**
 * Verify users exist
 */
async function verifyUsers() {
  console.log('\n📊 Verifying cashier users...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, role, full_name, is_active')
    .in('role', ['cashier', 'admin', 'manager'])
    .order('role', { ascending: true });

  if (error) {
    console.error(`❌ Error fetching users: ${error.message}`);
    return;
  }

  console.log(`\n✅ Found ${data.length} staff users:\n`);
  console.table(data.map(u => ({
    Username: u.username,
    Email: u.email,
    Role: u.role,
    'Full Name': u.full_name,
    Active: u.is_active ? '✅' : '❌'
  })));
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Create Development Cashier Users');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('This script will create test cashier users to fix:');
  console.log('"orders_cashier_id_fkey" foreign key constraint errors');
  console.log('');

  // Create test cashiers
  const cashiers = [
    {
      username: 'cashier01',
      email: 'cashier01@beerhive.local',
      password: 'cashier123',
      fullName: 'Test Cashier 01'
    },
    {
      username: 'cashier02',
      email: 'cashier02@beerhive.local',
      password: 'cashier123',
      fullName: 'Test Cashier 02'
    },
    {
      username: 'cashier03',
      email: 'cashier03@beerhive.local',
      password: 'cashier123',
      fullName: 'Test Cashier 03'
    }
  ];

  console.log('Creating cashier users...\n');
  
  for (const cashier of cashiers) {
    await createCashierUser(
      cashier.username,
      cashier.email,
      cashier.password,
      cashier.fullName
    );
  }

  // Verify
  await verifyUsers();

  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Cashier users setup complete!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📝 Test Credentials:');
  console.log('   Email: cashier01@beerhive.local');
  console.log('   Password: cashier123');
  console.log('');
  console.log('💡 Use these users to test the POS system');
  console.log('');
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
