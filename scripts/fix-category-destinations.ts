/**
 * Fix Category Destinations Script
 * Sets default_destination for product categories
 * 
 * Usage: npx tsx scripts/fix-category-destinations.ts
 */

import { supabaseAdmin } from '../src/data/supabase/server-client';

/**
 * Category destination mappings
 * Maps category names (case-insensitive) to their destination
 */
const categoryMappings: Record<string, 'kitchen' | 'bartender' | 'both'> = {
  // Beverages
  'beverages': 'bartender',
  'drinks': 'bartender',
  'beers': 'bartender',
  'wine': 'bartender',
  'cocktails': 'bartender',
  'spirits': 'bartender',
  'soft drinks': 'bartender',
  'juices': 'bartender',
  
  // Food
  'food': 'kitchen',
  'pulutan': 'kitchen',
  'appetizers': 'kitchen',
  'main course': 'kitchen',
  'meals': 'kitchen',
  'snacks': 'kitchen',
  'sides': 'kitchen',
  'finger food': 'kitchen',
  'filipino food': 'kitchen',
  'grilled': 'kitchen',
  'fried': 'kitchen',
  
  // Both (requires both kitchen and bar)
  'desserts': 'both',
  'combos': 'both',
  'platters': 'both',
};

async function fixCategoryDestinations() {
  console.log('🔧 Fixing Category Destinations\n');

  // 1. Fetch all categories
  console.log('1️⃣ Fetching categories...');
  const { data: categories, error: fetchError } = await supabaseAdmin
    .from('product_categories')
    .select('id, name, default_destination');

  if (fetchError) {
    console.error('❌ Error fetching categories:', fetchError.message);
    return;
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️  No categories found. Please create categories first.');
    return;
  }

  console.log(`✅ Found ${categories.length} categories\n`);

  // 2. Update categories
  console.log('2️⃣ Updating category destinations...');
  let updated = 0;
  let skipped = 0;

  for (const category of categories) {
    const categoryName = category.name.toLowerCase().trim();
    
    // Check if we have a mapping for this category
    let destination: 'kitchen' | 'bartender' | 'both' | null = null;
    
    // Exact match
    if (categoryMappings[categoryName]) {
      destination = categoryMappings[categoryName];
    } else {
      // Partial match (check if category name contains any key)
      for (const [key, value] of Object.entries(categoryMappings)) {
        if (categoryName.includes(key) || key.includes(categoryName)) {
          destination = value;
          break;
        }
      }
    }

    // Default fallback based on common keywords
    if (!destination) {
      if (categoryName.includes('beer') || categoryName.includes('drink') || 
          categoryName.includes('beverage') || categoryName.includes('wine')) {
        destination = 'bartender';
      } else {
        destination = 'kitchen'; // Default to kitchen
      }
    }

    // Only update if different or not set
    if (category.default_destination !== destination) {
      const { error: updateError } = await supabaseAdmin
        .from('product_categories')
        .update({ default_destination: destination })
        .eq('id', category.id);

      if (updateError) {
        console.error(`❌ Error updating ${category.name}:`, updateError.message);
      } else {
        console.log(`✅ Updated "${category.name}": ${category.default_destination || 'NULL'} → ${destination}`);
        updated++;
      }
    } else {
      console.log(`⏭️  Skipped "${category.name}": already set to ${destination}`);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${categories.length}`);

  // 3. Verify the changes
  console.log('\n3️⃣ Verifying changes...');
  const { data: updatedCategories, error: verifyError } = await supabaseAdmin
    .from('product_categories')
    .select('id, name, default_destination');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError.message);
    return;
  }

  console.log('\n✅ Current category destinations:');
  updatedCategories?.forEach((cat: any) => {
    const icon = cat.default_destination === 'kitchen' ? '🍳' : 
                 cat.default_destination === 'bartender' ? '🍺' : '🍳🍺';
    console.log(`   ${icon} ${cat.name}: ${cat.default_destination}`);
  });

  console.log('\n✅ Fix complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Create a new order from the POS');
  console.log('   2. Check http://localhost:3000/kitchen');
  console.log('   3. Orders should appear automatically!');
}

// Run the fix
fixCategoryDestinations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
