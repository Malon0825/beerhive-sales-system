/**
 * Quick script to create test users via API
 * Run with: node scripts/create-test-user.js
 */

const API_URL = 'http://localhost:3000/api/users';

const testUsers = [
  {
    username: 'admin',
    email: 'admin@beerhive.com',
    password: 'Admin123!',
    full_name: 'System Administrator',
    role: 'admin'
  },
  {
    username: 'manager',
    email: 'manager@beerhive.com',
    password: 'Manager123!',
    full_name: 'Store Manager',
    role: 'manager'
  },
  {
    username: 'cashier',
    email: 'cashier@beerhive.com',
    password: 'Cashier123!',
    full_name: 'John Cashier',
    role: 'cashier'
  },
  {
    username: 'kitchen',
    email: 'kitchen@beerhive.com',
    password: 'Kitchen123!',
    full_name: 'Kitchen Staff',
    role: 'kitchen'
  },
  {
    username: 'bartender',
    email: 'bartender@beerhive.com',
    password: 'Bartender123!',
    full_name: 'Bar Tender',
    role: 'bartender'
  }
];

async function createUser(user) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Created user: ${user.username} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
    } else {
      console.log(`❌ Failed to create ${user.username}: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Error creating ${user.username}:`, error.message);
  }
}

async function createAllUsers() {
  console.log('Creating test users...\n');
  
  for (const user of testUsers) {
    await createUser(user);
    console.log('');
  }
  
  console.log('\n✅ Done! You can now login with any of the users above.');
}

createAllUsers();
