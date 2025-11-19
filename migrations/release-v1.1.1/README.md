# Release v1.1.1 - Database Migrations

## Overview

This directory contains database migration scripts for release v1.1.1 of the Beerhive Sales System.

## Migration Files

### 1. add_cost_price_to_packages.sql

**Purpose:** Add cost price tracking to packages for net income calculation

**Changes:**
- Adds `cost_price` column to `packages` table
- Creates partial index for query performance
- Adds column documentation

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_packages_cost_price;
ALTER TABLE packages DROP COLUMN IF EXISTS cost_price;
```

## Deployment Instructions

### Prerequisites

- Database access credentials
- Backup of production database
- Migration testing completed in staging environment

### Step-by-Step Deployment

#### 1. Backup Database

```bash
# Create backup before migration
pg_dump -U postgres -d beerhive_db -F c -f backup_before_v1.1.1_$(date +%Y%m%d_%H%M%S).dump
```

#### 2. Apply Migration (Production)

```bash
# Connect to production database
psql -U postgres -d beerhive_db

# Apply migration
\i migrations/release-v1.1.1/add_cost_price_to_packages.sql

# Verify migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'packages' AND column_name = 'cost_price';

# Check index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'packages' AND indexname = 'idx_packages_cost_price';

# Exit
\q
```

#### 3. Verify Migration Success

```sql
-- Check that column was added
SELECT 
  COUNT(*) as total_packages,
  COUNT(cost_price) as packages_with_cost_price,
  COUNT(*) - COUNT(cost_price) as packages_without_cost_price
FROM packages;

-- Sample packages with/without cost price
SELECT id, name, base_price, cost_price 
FROM packages 
LIMIT 10;
```

#### 4. Deploy Application Code

```bash
# Deploy application with updated code
# Ensure the following files are deployed:
# - src/models/entities/Package.ts
# - src/views/packages/PackageForm.tsx
# - src/data/repositories/PackageRepository.ts
# - src/data/queries/reports.queries.ts

# Restart application services
npm run build
npm run start
```

### Testing Checklist

After deployment, verify:

- [ ] Package creation form shows cost price field
- [ ] Can create new package with cost price
- [ ] Can update existing package to add cost price
- [ ] Existing packages without cost price still work
- [ ] Reports show net income for packages with cost price
- [ ] Reports show "N/A" for packages without cost price
- [ ] No errors in application logs
- [ ] No database performance degradation

### Rollback Procedure

If issues arise, rollback using:

```bash
# 1. Restore application code to previous version
git checkout v1.1.0
npm run build
npm run start

# 2. Rollback database migration
psql -U postgres -d beerhive_db <<EOF
DROP INDEX IF EXISTS idx_packages_cost_price;
ALTER TABLE packages DROP COLUMN IF EXISTS cost_price;
EOF

# 3. Restore from backup if needed
pg_restore -U postgres -d beerhive_db backup_before_v1.1.1_YYYYMMDD_HHMMSS.dump
```

## Migration Validation

### Expected Results

**Before Migration:**
```sql
beerhive_db=# \d packages
-- cost_price column does not exist
```

**After Migration:**
```sql
beerhive_db=# \d packages
-- Column       | Type             | Nullable
-- cost_price   | numeric(10,2)    | YES

beerhive_db=# \di idx_packages_cost_price
-- Index exists with WHERE clause (cost_price IS NOT NULL)
```

### Performance Impact

- **Column Addition:** Instant (nullable column, no default)
- **Index Creation:** < 1 second (partial index on existing data)
- **Query Performance:** Improved for reporting queries
- **Storage Impact:** Minimal (~8 bytes per row when populated)

## Post-Migration Tasks

### Optional: Update Existing Packages

After migration, you may want to update existing packages with cost prices:

```sql
-- Example: Set cost price for specific package
UPDATE packages 
SET cost_price = 350.00
WHERE package_code = 'PKG-001';

-- Bulk update for promotional packages (example)
UPDATE packages
SET cost_price = base_price * 0.70  -- 70% of base price as cost
WHERE package_type = 'promotional' 
  AND cost_price IS NULL;
```

### Monitoring

Monitor the following after deployment:

1. **Application Logs:** Check for any errors related to package operations
2. **Database Performance:** Monitor query times for reports module
3. **User Feedback:** Confirm users can see and use the cost price field

## Support

For issues during migration:
1. Check migration logs for errors
2. Verify database user has ALTER TABLE permissions
3. Ensure no active transactions blocking the migration
4. Review detailed docs: `docs/release-v1.1.1/PACKAGE_COST_PRICE_IMPLEMENTATION.md`

## Change History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-19 | v1.1.1 | Development Team | Add cost_price to packages table |

---

**Migration Status:** ✅ Ready for Production  
**Risk Level:** Low (backward compatible, additive change)  
**Estimated Downtime:** None (online migration)
