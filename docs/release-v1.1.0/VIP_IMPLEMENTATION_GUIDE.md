# VIP Tiers Implementation Guide
## Step-by-Step Task Checklist

**Version**: 1.0 | **Date**: Jan 11, 2025 | **Duration**: 4 weeks

---

## Phase 1: Foundation & Validation (Days 1-2)

### Task 1.1: Validate VIP Services
**Reference**: `src/core/services/pricing/VIPPricing.ts`

- [ ] Verify `hasActiveBenefits()` (Lines 13-32) - checks tier & expiry
- [ ] Verify `getVIPPrice()` (Lines 37-53) - calculates VIP price
- [ ] Verify `apply()` (Lines 58-88) - returns pricing object
- [ ] Verify `getDiscountPercentage()` (Lines 93-105) - Silver 10%, Gold 15%, Platinum 20%

### Task 1.2: Create Unit Tests
**Create**: `src/core/services/pricing/__tests__/VIPPricing.test.ts`

- [ ] Test: Silver tier gets 10% discount (base 100 → VIP 90)
- [ ] Test: Expired VIP gets base price
- [ ] Test: Product vip_price overrides tier discount
- [ ] Test: Null customer returns base price
- [ ] Run tests: `npm test VIPPricing.test.ts` - must pass 100%

---

## Phase 2: Cart Context Enhancement (Days 3-5)

### Task 2.1: Add VIP State
**File**: `src/lib/contexts/CartContext.tsx`

- [ ] Import VIPPricing at top: `import { VIPPricing } from '@/core/services/pricing/VIPPricing';`
- [ ] Add state: `const [vipSavings, setVipSavings] = useState<number>(0);` (after line 45)
- [ ] Add to interface: `vipSavings: number;` in CartContextType
- [ ] Expose in return: Add `vipSavings,` to context value

### Task 2.2: Enhance addItem with VIP
**File**: `src/lib/contexts/CartContext.tsx` (find `addItem` function ~line 150)

- [ ] Add VIP pricing logic:
```typescript
let isVIPPrice = false;
let vipDiscount = 0;
if (selectedCustomer && VIPPricing.hasActiveBenefits(selectedCustomer)) {
  const vipPricing = VIPPricing.apply(product, selectedCustomer, quantity);
  unitPrice = vipPricing.unitPrice;
  isVIPPrice = vipPricing.isVIPPrice;
  vipDiscount = vipPricing.discount;
}
```
- [ ] Add to CartItem: `isVIPPrice?: boolean; vipDiscount?: number;`

### Task 2.3: VIP Savings Calculator
**File**: `src/lib/contexts/CartContext.tsx`

- [ ] Create `calculateVIPSavings()` function (after addItem):
```typescript
const calculateVIPSavings = useCallback(() => {
  const total = items.reduce((sum, item) => 
    sum + (item.vipDiscount || 0) * item.quantity, 0);
  setVipSavings(total);
}, [items]);
```
- [ ] Add useEffect: `useEffect(() => { calculateVIPSavings(); }, [selectedCustomer, items]);`

### Task 2.4: Package VIP Pricing
**File**: `src/lib/contexts/CartContext.tsx` (find `addPackage`)

- [ ] Add VIP logic for packages (use vip_price if set, else apply tier discount)
- [ ] Test: VIP Gold + package ₱500 base → ₱425 (15% off)

---

## Phase 3: POS Interface (Days 6-10)

### Task 3.1: Customer Search VIP Badge
**File**: `src/views/pos/CustomerSearch.tsx`

- [ ] Import: `VIPPricing`, `Badge`, `Award` from lucide-react
- [ ] Find selectedCustomer display section
- [ ] Add VIP badge after customer name:
```typescript
{selectedCustomer.tier !== 'regular' && (
  <Badge style={{ backgroundColor: VIPPricing.getTierColor(selectedCustomer.tier) }}>
    <Award className="h-3 w-3 mr-1" />
    {VIPPricing.getTierDisplayName(selectedCustomer.tier)}
  </Badge>
)}
```

### Task 3.2: Product Card VIP Pricing
**File**: `src/views/pos/components/ProductCard.tsx`

- [ ] Add prop: `customer?: Customer | null;`
- [ ] Calculate: `const displayPrice = customer ? VIPPricing.getVIPPrice(product, customer) : product.base_price;`
- [ ] Update price display:
```typescript
{showVIP ? (
  <>
    <span className="line-through text-gray-500">₱{product.base_price}</span>
    <span className="text-green-600 font-bold ml-2">₱{displayPrice}</span>
    <Badge>VIP</Badge>
  </>
) : <span>₱{product.base_price}</span>}
```

### Task 3.3: ProductGrid Pass Customer
**File**: `src/views/pos/ProductGrid.tsx`

- [ ] Get customer: `const { selectedCustomer } = useCart();`
- [ ] Pass to ProductCard: `<ProductCard customer={selectedCustomer} />`

### Task 3.4: Order Summary VIP Savings
**File**: `src/views/pos/components/OrderSummaryPanel.tsx`

- [ ] Get vipSavings from cart: `const { vipSavings } = useCart();`
- [ ] Add line after subtotal:
```typescript
{vipSavings > 0 && (
  <div className="text-green-600">
    <Award className="h-4 w-4" />
    VIP Savings: -₱{vipSavings.toFixed(2)}
  </div>
)}
```

### Task 3.5: Payment Panel VIP Summary
**File**: `src/views/pos/PaymentPanel.tsx`

- [ ] Add VIP benefits box before payment methods:
```typescript
{cart.vipSavings > 0 && (
  <div className="bg-green-50 p-4 rounded">
    <Award /> {VIPPricing.getTierDisplayName(cart.selectedCustomer.tier)}
    <div>Savings: ₱{cart.vipSavings}</div>
  </div>
)}
```

### Task 3.6: Receipt VIP Display
**File**: `src/views/pos/PrintableReceipt.tsx`

- [ ] Add VIP tier after customer name
- [ ] Calculate and show VIP savings in totals section

---

## Phase 4: Tab Module (Days 11-15)

### Task 4.1: Session Customer Loading
**File**: `src/views/pos/SessionOrderFlow.tsx`

- [ ] Add state: `const [sessionCustomer, setSessionCustomer] = useState<Customer | null>(null);`
- [ ] Add useEffect to fetch customer when session.customer_id changes
- [ ] Display VIP badge if customer is VIP tier

### Task 4.2: Session Product Selector
**File**: `src/views/pos/SessionProductSelector.tsx`

- [ ] Add customer prop to interface
- [ ] Pass customer to product cards
- [ ] Apply VIP pricing when creating orders

### Task 4.3: Tab Bill VIP Summary
**File**: `src/views/orders/TabBillReceipt.tsx`

- [ ] Calculate total VIP savings across all orders:
```typescript
const totalVIPSavings = orders.reduce((total, order) => 
  total + order.items.reduce((sum, item) => 
    sum + (item.discount_amount || 0), 0), 0);
```
- [ ] Display VIP savings section with tier badge

### Task 4.4: Active Tabs VIP Badge
**File**: `src/views/tabs/TabManagementDashboard.tsx`

- [ ] Add VIP badge to tab cards where customer tier !== 'regular'

---

## Phase 5: Package VIP Features (Days 16-18)

### Task 5.1: VIP-Only Package Filter
**File**: `src/views/pos/ProductGrid.tsx`

- [ ] Filter packages:
```typescript
const availablePackages = packages.filter(pkg => {
  if (pkg.package_type === 'vip_only') {
    return selectedCustomer?.tier !== 'regular' && 
           VIPPricing.hasActiveBenefits(selectedCustomer);
  }
  return true;
});
```

### Task 5.2: VIP-Only Badge
**File**: Package card component

- [ ] Add badge: `{pkg.package_type === 'vip_only' && <Badge>VIP EXCLUSIVE</Badge>}`

### Task 5.3: Package VIP Pricing
**File**: Package card component

- [ ] Calculate package VIP price (use vip_price if set, else apply tier %)
- [ ] Display with strikethrough base price

---

## Phase 6: Testing (Days 19-22)

### Task 6.1: POS Flow Tests

- [ ] Test: Select VIP Silver → Add product ₱100 → Verify ₱90 + savings shown
- [ ] Test: No customer → Verify base prices only
- [ ] Test: Remove customer → Verify prices revert
- [ ] Test: VIP Gold + package → Verify 15% discount applied
- [ ] Test: Complete payment → Verify order has is_vip_price=true

### Task 6.2: Tab Flow Tests

- [ ] Test: Open session with VIP customer → VIP badge shown
- [ ] Test: Add orders to session → VIP pricing applied
- [ ] Test: Close tab → Bill shows cumulative VIP savings
- [ ] Test: Session without customer → No VIP indicators

### Task 6.3: Edge Cases

- [ ] Test: Expired VIP → Base prices used
- [ ] Test: Product with vip_price → Uses vip_price not tier %
- [ ] Test: VIP-only package → Hidden from regular customers
- [ ] Test: Happy Hour + VIP → Best price wins

### Task 6.4: Database Validation

```sql
-- Verify VIP orders saved correctly
SELECT o.*, oi.is_vip_price, oi.discount_amount 
FROM orders o 
JOIN order_items oi ON oi.order_id = o.id 
WHERE o.customer_id IN (SELECT id FROM customers WHERE tier != 'regular')
ORDER BY o.created_at DESC LIMIT 10;
```

- [ ] Run query → Verify is_vip_price=true for VIP orders
- [ ] Verify discount_amount matches expected savings

---

## Phase 7: Deployment (Days 23-28)

### Task 7.1: Staging Deployment

- [ ] Build: `npm run build`
- [ ] Deploy to staging environment
- [ ] Smoke test: Complete POS order with VIP customer
- [ ] Smoke test: Complete tab session with VIP customer

### Task 7.2: Production Deployment

- [ ] Deploy during off-peak hours
- [ ] Monitor error logs for 1 hour
- [ ] Test with real VIP customer (if available)
- [ ] Monitor database queries for performance

### Task 7.3: Monitoring Setup

- [ ] Create dashboard for VIP orders count
- [ ] Create alert for VIP pricing errors (negative prices)
- [ ] Track average VIP savings per order

### Task 7.4: Documentation

- [ ] Update user manual with VIP features
- [ ] Train staff on VIP customer identification
- [ ] Create VIP benefits poster for display

---

## Acceptance Criteria

### Technical
- [ ] Zero regression bugs in non-VIP flows
- [ ] 100% VIP pricing accuracy (validated with test data)
- [ ] <100ms VIP price calculation latency
- [ ] All unit tests pass
- [ ] All integration tests pass

### Business
- [ ] VIP customers receive correct discounts every time
- [ ] VIP benefits clearly displayed throughout flow
- [ ] Receipts show VIP tier and savings
- [ ] Staff can easily identify VIP customers

### Data
- [ ] All existing orders remain valid
- [ ] is_vip_price flag set correctly
- [ ] discount_amount calculated correctly
- [ ] No database schema changes required

---

## Rollback Plan

If critical issues arise:

1. **Disable VIP Display** (UI only):
   - Comment out VIP badges/indicators
   - Keep pricing logic (already working)

2. **Disable VIP Auto-Pricing** (Cart):
   - Revert CartContext changes
   - Manual VIP price entry if needed

3. **Full Rollback**:
   - Revert to previous git commit
   - All data remains valid (backward compatible)

---

## Quick Reference

**Key Files**:
- VIP Services: `src/core/services/pricing/VIPPricing.ts`
- Cart Context: `src/lib/contexts/CartContext.tsx`
- POS Main: `src/views/pos/POSInterface.tsx`
- Product Card: `src/views/pos/components/ProductCard.tsx`
- Order Summary: `src/views/pos/components/OrderSummaryPanel.tsx`
- Session Flow: `src/views/pos/SessionOrderFlow.tsx`
- Tab Bill: `src/views/orders/TabBillReceipt.tsx`

**VIP Discount Rates**:
- Silver: 10%
- Gold: 15%
- Platinum: 20%

**Database Fields** (Already exist):
- `customers.tier` (enum)
- `customers.vip_expiry_date`
- `products.vip_price`
- `packages.vip_price`
- `order_items.is_vip_price`
- `order_items.discount_amount`

---

## Progress Tracking

**Phase 1**: ⬜⬜⬜⬜⬜ 0/5  
**Phase 2**: ⬜⬜⬜⬜ 0/4  
**Phase 3**: ⬜⬜⬜⬜⬜⬜ 0/6  
**Phase 4**: ⬜⬜⬜⬜ 0/4  
**Phase 5**: ⬜⬜⬜ 0/3  
**Phase 6**: ⬜⬜⬜⬜ 0/4  
**Phase 7**: ⬜⬜⬜⬜ 0/4  

**Total Progress**: 0/30 tasks complete

---

**READY TO START**: Begin with Phase 1, Task 1.1 ✅
