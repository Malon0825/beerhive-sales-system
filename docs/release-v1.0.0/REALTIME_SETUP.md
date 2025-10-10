# Supabase Realtime Configuration

## Enable Realtime for Tables

1. Go to **Database** → **Replication** in Supabase
2. Enable for these tables:
   - ✅ orders
   - ✅ kitchen_orders
   - ✅ restaurant_tables
   - ✅ inventory_movements
   - ✅ products

## Usage Example

```typescript
// Subscribe to kitchen orders
const channel = supabase
  .channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'kitchen_orders'
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```
