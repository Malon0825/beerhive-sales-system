# Unified Inventory Management for Packages - Product Strategy

**Version**: 1.0  
**Date**: October 20, 2025  
**Status**: Proposed  

---

## Executive Summary

**Problem**: Users struggle to manage inventory because packages and products share the same stock, but the system doesn't surface this relationship in monitoring tools.

**Solution**: Add inventory intelligence that makes package-product relationships visible without changing the underlying stock mechanism.

**Impact**: 80% reduction in stockout surprises, 60% faster reorder identification, improved inventory accuracy.

---

## Problem Diagnosis

### Current State

After analyzing the codebase (`StockDeduction.ts`, `PackageRepository.ts`, `InventoryDashboard.tsx`), the inventory system works as follows:

1. **Packages DO share product inventory** - When a package is sold, component products are deducted from the same inventory pool
2. **Stock deduction is automatic** - `StockDeduction.deductForOrder()` expands packages into components and deducts each product
3. **No visibility gap** - The inventory dashboard ONLY shows individual products, not package implications

### Root Cause

The inventory monitoring tools don't reflect package-product relationships:

- ❌ No indication which packages use a given product
- ❌ No calculation of "how many packages can I sell" based on component stocks
- ❌ No package-level stock warnings
- ❌ Reorder calculations ignore package sales patterns
- ❌ Low stock alerts don't mention affected packages

**Example Pain Point**:
```
Manager sees: "Beer A - Stock: 50 units"
Manager thinks: "Plenty of beer available"
Reality: VIP Package needs 2x Beer A, only 25 packages sellable
Result: Surprised when packages become unavailable
```

---

## Proposed Solution: Unified Inventory Visibility System

### Solution Principles

1. **Make the Invisible Visible** - Surface what's hidden, don't change what works
2. **Zero Schema Changes** - All calculations at service layer
3. **Progressive Enhancement** - Additive features, no breaking changes
4. **User-Centric** - Focus on actionable insights, not data dumps

---

## Detailed Feature Design

### Feature 1: Package Impact View

**Location**: `src/views/inventory/InventoryListResponsive.tsx`

**Enhancement**: Add expandable "Used in Packages" section to each product row

**UI Design**:
```
┌─ Beer A ───────────────────────────────────┐
│ Stock: 50 units | Status: ✓ Adequate       │
│                                              │
│ ▼ Used in 2 Packages:                       │
│   • VIP Premium Bundle (2 units/pkg)        │
│     → Max sellable: 25 packages             │
│   • Happy Hour Promo (1 unit/pkg)           │
│     → Max sellable: 50 packages             │
│                                              │
│ Total Package Capacity: 25 (limited by VIP) │
└──────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// Add to InventoryListResponsive.tsx
interface ProductWithPackages extends Product {
  used_in_packages?: Array<{
    package_id: string;
    package_name: string;
    quantity_per_package: number;
    max_sellable: number;
  }>;
}
```

**Benefits**:
- Instant visibility of package dependencies
- Understand restocking impact on package availability
- Identify critical products used in popular packages

---

### Feature 2: Package Availability Calculator

**New Service**: `src/core/services/inventory/PackageAvailabilityService.ts`

**Core Algorithm**:
```typescript
export class PackageAvailabilityService {
  /**
   * Calculate how many units of a package can be sold
   * based on current component product stocks
   */
  static async calculatePackageAvailability(
    packageId: string
  ): Promise<{
    max_sellable: number;
    bottleneck_product?: {
      product_id: string;
      product_name: string;
      current_stock: number;
      required_per_package: number;
    };
    component_availability: Array<{
      product_id: string;
      product_name: string;
      current_stock: number;
      required_per_package: number;
      max_packages: number;
    }>;
  }> {
    // 1. Get package with items
    const pkg = await PackageRepository.getById(packageId);
    
    // 2. For each component product:
    //    max_packages = floor(current_stock / quantity_per_package)
    const availability = pkg.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product.name,
      current_stock: item.product.current_stock,
      required_per_package: item.quantity,
      max_packages: Math.floor(item.product.current_stock / item.quantity)
    }));
    
    // 3. Find minimum (bottleneck)
    const bottleneck = availability.reduce((min, curr) => 
      curr.max_packages < min.max_packages ? curr : min
    );
    
    return {
      max_sellable: bottleneck.max_packages,
      bottleneck_product: bottleneck,
      component_availability: availability
    };
  }
  
  /**
   * Calculate availability for all active packages
   */
  static async calculateAllPackageAvailability(): Promise<Map<string, number>> {
    const packages = await PackageRepository.getActivePackages();
    const availabilityMap = new Map<string, number>();
    
    for (const pkg of packages) {
      const { max_sellable } = await this.calculatePackageAvailability(pkg.id);
      availabilityMap.set(pkg.id, max_sellable);
    }
    
    return availabilityMap;
  }
}
```

**Caching Strategy**:
```typescript
// Cache for 5 minutes to reduce DB load
private static cache = new Map<string, {
  data: number;
  expires: number;
}>();
```

**Benefits**:
- Real-time package sellability calculation
- Identifies bottleneck products preventing package sales
- Enables proactive inventory management

---

### Feature 3: Package Stock Status Dashboard

**New Tab**: Add to `src/views/inventory/InventoryDashboard.tsx`

**UI Design**:
```
┌─ Inventory Dashboard ─────────────────────┐
│ Tabs: [All Products] [Analytics] [Low Stock] [📦 Package Status] │
└───────────────────────────────────────────┘

┌─ Package Stock Status ───────────────────┐
│                                           │
│ ✓ Available (15)  ⚠️ Low Stock (3)  ❌ Out of Stock (1) │
│                                           │
│ ┌─ VIP Premium Bundle ─────────────┐     │
│ │ Status: ⚠️ Low Stock              │     │
│ │ Max Sellable: 15 packages         │     │
│ │ Price: ₱500 | Type: VIP Only      │     │
│ │                                   │     │
│ │ Components (3):                   │     │
│ │ ✓ Beer A: 2 units (stock: 30)    │     │
│ │ ⚠️ Snack B: 1 unit (stock: 15)   │     │
│ │ ✓ Chips C: 3 units (stock: 100)  │     │
│ │                                   │     │
│ │ Bottleneck: Snack B              │     │
│ │ Action: Restock 35+ units to     │     │
│ │         enable 50 packages        │     │
│ └───────────────────────────────────┘     │
└───────────────────────────────────────────┘
```

**Implementation**:
```typescript
// Add to InventoryDashboard.tsx
const [activeTab, setActiveTab] = useState<
  'all' | 'analytics' | 'low-stock' | 'package-status'
>('all');

{activeTab === 'package-status' && (
  <PackageStockStatus />
)}
```

**New Component**: `src/views/inventory/PackageStockStatus.tsx`
```typescript
export default function PackageStockStatus() {
  const [packages, setPackages] = useState<PackageWithAvailability[]>([]);
  const [stats, setStats] = useState({
    available: 0,
    lowStock: 0,
    outOfStock: 0
  });
  
  // Load packages with availability calculations
  // Group by status
  // Display with bottleneck analysis
}
```

**Benefits**:
- Dedicated view for package inventory health
- Proactive package availability management
- Clear actionable restocking priorities

---

### Feature 4: Smart Reorder Recommendations

**Enhancement**: `src/core/services/reports/InventoryReport.ts`

**New Method**:
```typescript
export class InventoryReportService {
  /**
   * Calculate reorder recommendations considering both
   * direct product sales and package consumption
   */
  static async getSmartReorderRecommendations(
    params: InventoryReportParams = {}
  ): Promise<SmartReorderItem[]> {
    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();
    
    // 1. Get direct product sales
    const directSales = await this.getProductSales(startDate, endDate);
    
    // 2. Get package sales and expand to component products
    const packageSales = await this.getPackageSalesWithComponents(startDate, endDate);
    
    // 3. Combine to get total product consumption
    const productConsumption = this.aggregateConsumption(directSales, packageSales);
    
    // 4. Calculate velocity and reorder point
    const recommendations = productConsumption.map(item => {
      const dailyVelocity = item.total_consumed / 30;
      const daysUntilStockout = item.current_stock / dailyVelocity;
      const recommended_reorder = dailyVelocity * 14; // 2 weeks buffer
      
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        current_stock: item.current_stock,
        direct_sales: item.direct_sales,
        package_consumption: item.package_consumption,
        total_consumed: item.total_consumed,
        daily_velocity: dailyVelocity,
        days_until_stockout: daysUntilStockout,
        recommended_reorder: recommended_reorder,
        priority: daysUntilStockout < 7 ? 'urgent' : 
                 daysUntilStockout < 14 ? 'high' : 'normal',
        usage_breakdown: item.package_breakdown // Which packages used this
      };
    });
    
    return recommendations.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
  }
  
  /**
   * Get package sales with component product breakdown
   */
  private static async getPackageSalesWithComponents(
    startDate: string,
    endDate: string
  ): Promise<Array<{
    product_id: string;
    quantity_consumed: number;
    package_name: string;
    package_sales: number;
  }>> {
    // Query order_items where package_id is not null
    // Join with package_items to get components
    // Aggregate: product_id -> total quantity consumed via packages
  }
}
```

**UI Display**:
```
Reorder Recommendations (Last 30 Days)

🔴 URGENT - Beer A
   Current Stock: 20 units
   Days Until Stockout: 4 days
   Recommended Order: 100 units
   
   Consumption Breakdown:
   • Direct sales: 40 units (2 units/day)
   • VIP Package: 60 units (30 packages sold × 2 units)
   • Promo Bundle: 20 units (20 packages sold × 1 unit)
   Total: 120 units consumed
```

**Benefits**:
- Accurate demand forecasting including package impact
- Prevents understocking due to hidden package consumption
- Data-driven purchasing decisions

---

### Feature 5: Enhanced Low Stock Alerts

**Update**: `src/views/inventory/LowStockAlert.tsx`

**Current Behavior**: Shows products below reorder point

**Enhancement**: Add package impact context

**New Display**:
```
⚠️ Low Stock Alerts

┌─ Critical (2) ────────────────────────────┐
│                                            │
│ Snack B - 15 units remaining              │
│ Reorder Point: 20 units                   │
│                                            │
│ Impact on Sales:                           │
│ • Direct product sales available          │
│ • VIP Package: Only 15 remaining          │
│   (normally 50+ available)                │
│ • Promo Bundle: Only 15 remaining         │
│                                            │
│ Revenue at Risk: ₱7,500                    │
│ (30 packages × ₱250 lost opportunity)     │
│                                            │
│ Recommended Action:                        │
│ Order 50 units to support 2 weeks sales   │
│ and enable 35+ packages                    │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface LowStockAlertWithPackageContext {
  product: Product;
  affected_packages: Array<{
    package_id: string;
    package_name: string;
    current_max_sellable: number;
    normal_availability: number;
    revenue_per_package: number;
  }>;
  revenue_at_risk: number;
  recommended_reorder: number;
}
```

**Benefits**:
- Business impact clarity
- Revenue-based prioritization
- Actionable recommendations

---

### Feature 6: Package Sales Impact Tracker

**New Component**: `src/views/inventory/PackageSalesImpact.tsx`

**Purpose**: Show how packages contribute to product inventory consumption

**UI Design**:
```
┌─ Inventory Consumption Analysis (Last 7 Days) ─┐
│                                                  │
│ Product: Beer A                                  │
│ Total Consumed: 100 units                        │
│                                                  │
│ By Channel:                                      │
│ ████████████ 60% via Packages (60 units)        │
│ ████████ 40% via Direct Sales (40 units)        │
│                                                  │
│ Package Breakdown:                               │
│ 1. VIP Bundle: 40 units (20 pkgs × 2 units)     │
│ 2. Promo Pack: 20 units (10 pkgs × 2 units)     │
│                                                  │
│ Insight: Packages drive 60% of Beer A demand    │
│ Consider prioritizing package component stock   │
└──────────────────────────────────────────────────┘
```

**Data Query**:
```sql
-- Get product consumption by channel
SELECT 
  p.id,
  p.name,
  -- Direct sales
  COALESCE(SUM(oi.quantity) FILTER (WHERE oi.package_id IS NULL), 0) as direct_sales,
  -- Package sales (expanded to component products)
  COALESCE(SUM(oi.quantity * pi.quantity) FILTER (WHERE oi.package_id IS NOT NULL), 0) as package_sales
FROM products p
LEFT JOIN order_items oi ON (
  oi.product_id = p.id 
  OR oi.package_id IN (
    SELECT package_id FROM package_items WHERE product_id = p.id
  )
)
LEFT JOIN package_items pi ON pi.product_id = p.id AND pi.package_id = oi.package_id
WHERE oi.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name;
```

**Benefits**:
- Understand sales channel impact on inventory
- Data-driven package optimization
- Identify high-impact products for packages

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2) - CRITICAL PATH

**Priority**: P0 - Must Have

**Deliverables**:
1. `PackageAvailabilityService.ts` - Core calculation engine
2. Database query optimization
3. Unit tests for availability calculations
4. API endpoint: `GET /api/packages/availability`

**Success Criteria**:
- Accurately calculate package availability for all active packages
- Response time < 500ms for all packages
- 100% test coverage for calculation logic

---

### Phase 2: UI Enhancement (Week 2-3) - HIGH VALUE

**Priority**: P0 - Must Have

**Deliverables**:
1. "Used in Packages" section in `InventoryListResponsive.tsx`
2. "Package Status" tab in `InventoryDashboard.tsx`
3. New component: `PackageStockStatus.tsx`
4. Enhanced `LowStockAlert.tsx` with package context

**Success Criteria**:
- All UI components render correctly
- Real-time data updates
- Mobile-responsive design
- Positive user feedback from 3+ managers

---

### Phase 3: Intelligence (Week 3-4) - BUSINESS IMPACT

**Priority**: P1 - Should Have

**Deliverables**:
1. Smart reorder recommendations in `InventoryReport.ts`
2. `PackageSalesImpact.tsx` component
3. Bottleneck identification algorithm
4. Export reports to CSV/PDF

**Success Criteria**:
- Reorder recommendations 90%+ accurate
- Revenue at risk calculation validated
- Managers use reports for purchasing decisions

---

### Phase 4: Automation (Week 4+) - SCALING

**Priority**: P2 - Nice to Have

**Deliverables**:
1. Auto-alerts when package becomes unavailable
2. Suggested package substitutions
3. POS integration for real-time availability
4. Predictive analytics for seasonal demand

**Success Criteria**:
- Zero missed stockout notifications
- 50% reduction in manual monitoring
- Automated reorder suggestions

---

## Technical Implementation Details

### Database Schema

**No Changes Required** ✅

Current schema already supports all features:
- `products` table has `current_stock`
- `packages` table links to `package_items`
- `package_items` has `product_id` and `quantity`
- `order_items` tracks both product and package sales

### Performance Optimization

**Indexes to Add**:
```sql
-- Speed up package-product lookups
CREATE INDEX IF NOT EXISTS idx_package_items_product_id 
ON package_items(product_id);

-- Speed up sales analysis
CREATE INDEX IF NOT EXISTS idx_order_items_created_at 
ON order_items(created_at);

-- Speed up package availability queries
CREATE INDEX IF NOT EXISTS idx_package_items_package_product 
ON package_items(package_id, product_id);
```

**Caching Strategy**:
```typescript
// Cache package availability for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

class PackageAvailabilityCache {
  private cache = new Map<string, { data: number; expires: number }>();
  
  get(packageId: string): number | null {
    const cached = this.cache.get(packageId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }
  
  set(packageId: string, availability: number): void {
    this.cache.set(packageId, {
      data: availability,
      expires: Date.now() + CACHE_TTL
    });
  }
  
  invalidate(productId?: string): void {
    // If product stock changes, invalidate all packages using that product
    if (productId) {
      // Implementation: query package_items, clear relevant packages
    } else {
      this.cache.clear();
    }
  }
}
```

### API Endpoints

**New Endpoints**:
```typescript
// GET /api/packages/availability
// Returns availability for all active packages
{
  "success": true,
  "data": [
    {
      "package_id": "uuid",
      "package_name": "VIP Bundle",
      "max_sellable": 25,
      "bottleneck": {
        "product_id": "uuid",
        "product_name": "Beer A",
        "current_stock": 50,
        "required_per_package": 2
      }
    }
  ]
}

// GET /api/packages/:packageId/availability
// Returns detailed availability for single package
{
  "success": true,
  "data": {
    "max_sellable": 25,
    "bottleneck_product": { ... },
    "component_availability": [ ... ]
  }
}

// GET /api/inventory/package-impact/:productId
// Returns packages affected by a product
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "product_name": "Beer A",
    "current_stock": 50,
    "packages": [
      {
        "package_id": "uuid",
        "package_name": "VIP Bundle",
        "quantity_per_package": 2,
        "max_sellable": 25
      }
    ]
  }
}
```

### Error Handling

**Graceful Degradation**:
```typescript
// If package availability calculation fails, fall back to showing package without availability
try {
  const availability = await PackageAvailabilityService.calculatePackageAvailability(packageId);
  return { ...package, availability };
} catch (error) {
  console.error('Failed to calculate availability:', error);
  return { ...package, availability: null }; // UI handles null gracefully
}
```

---

## Success Metrics

### User Experience Metrics

**Target Improvements**:
- ⬇️ 80% reduction in "out of stock" surprises during package sales
- ⬇️ 60% reduction in time to identify reorder needs
- ⬆️ 90% user satisfaction with inventory visibility
- ⬇️ 50% reduction in inventory-related support tickets

**Measurement**:
- User surveys (weekly)
- Time-to-reorder tracking
- Stockout incident logs
- Support ticket analysis

### Business Impact Metrics

**Target Improvements**:
- ⬇️ 30% reduction in stockouts (both products and packages)
- ⬆️ 20% improvement in inventory turnover
- ⬇️ 50% reduction in overstocking incidents
- ⬆️ 15% increase in package sales (due to better availability)

**Measurement**:
- Weekly stockout reports
- Monthly inventory turnover ratio
- Excess inventory tracking
- Package sales analysis

### Technical Metrics

**Performance Targets**:
- Page load time < 2 seconds for Package Status dashboard
- API response time < 500ms for availability calculations
- 99.9% uptime for inventory services
- Cache hit rate > 80% for availability queries

---

## Risk Assessment & Mitigation

### Risk 1: Performance Degradation

**Risk**: Availability calculations may slow down with many packages

**Mitigation**:
- Implement aggressive caching (5-minute TTL)
- Add database indexes on `package_items`
- Consider materialized view for frequently accessed data
- Load test with 100+ packages, 1000+ products

**Contingency**: If performance issues occur, implement background job to pre-calculate availability

---

### Risk 2: Data Consistency

**Risk**: Cache may show stale availability after stock changes

**Mitigation**:
- Invalidate cache on stock adjustments
- Add cache version tracking
- Implement optimistic locking for stock updates
- Add "Last Updated" timestamp to UI

**Contingency**: Allow manual refresh of availability data

---

### Risk 3: User Adoption

**Risk**: Users may not utilize new features

**Mitigation**:
- In-app tooltips and onboarding
- Training sessions for managers
- Email notifications when packages go low
- Success stories and best practices sharing

**Contingency**: Gather feedback, iterate on UX, add more automation

---

## Alternative Solutions Considered

### ❌ Alternative 1: Separate Package Inventory

**Approach**: Create dedicated stock pool for packages, separate from products

**Pros**:
- Clear separation of concerns
- No calculation needed

**Cons**:
- Double inventory management burden
- Synchronization complexity
- Risk of inventory fragmentation
- Doesn't reflect real-world usage (same physical stock)
- Higher implementation cost

**Decision**: Rejected - Increases complexity without solving visibility problem

---

### ❌ Alternative 2: Real-time Stock Reservation

**Approach**: Reserve product stock when package is added to cart

**Pros**:
- Prevents overselling
- Accurate real-time availability

**Cons**:
- Complex reservation system needed
- Timeout management required
- Performance overhead
- Doesn't solve monitoring problem

**Decision**: Deferred to Phase 4 - Not MVP, can be added later

---

### ✅ Selected Approach: Visibility-First Enhancement

**Rationale**:
- Solves core user pain (visibility)
- Minimal implementation effort
- Zero schema changes
- Low risk, high reward
- Can iterate based on feedback

---

## FAQ

### Q: Will this change how stock deduction works?

**A**: No. Stock deduction logic in `StockDeduction.ts` remains unchanged. We're only adding visibility layers on top of the existing mechanism.

---

### Q: What happens if a product is used in multiple packages?

**A**: The system calculates availability for each package independently. If Beer A is used in 3 packages, you'll see:
- Package 1 can sell: 25 units (limited by Beer A)
- Package 2 can sell: 25 units (limited by Beer A)
- Package 3 can sell: 50 units (limited by different component)

The actual constraint is "first come, first served" - whichever package sells first consumes the shared stock.

---

### Q: How accurate are the reorder recommendations?

**A**: Recommendations are based on historical consumption (30-day default). Accuracy improves over time. Managers can adjust the calculation period (7, 14, 30, 60 days) based on seasonality.

---

### Q: Can I hide package information for certain products?

**A**: Yes. In Phase 3, we'll add a toggle to show/hide package impact in the inventory list for cleaner views when not needed.

---

### Q: Will this work with the existing inventory reports?

**A**: Yes. This enhancement is additive. Existing reports continue to work. New package-aware reports are additional options.

---

## Next Steps

### Immediate Actions (This Week)

1. **Stakeholder Review** - Present this plan to managers/admin users
2. **Validate Assumptions** - Confirm pain points match this solution
3. **Prioritize Features** - Rank P0/P1/P2 based on user feedback
4. **Technical Spike** - Prototype `PackageAvailabilityService` (1-2 days)

### Week 1-2: Foundation

1. Implement `PackageAvailabilityService.ts`
2. Add database indexes
3. Create API endpoints
4. Write unit tests
5. Performance testing

### Week 2-3: UI Development

1. Build `PackageStockStatus.tsx` component
2. Enhance `InventoryListResponsive.tsx`
3. Update `LowStockAlert.tsx`
4. Mobile responsive testing
5. User acceptance testing

### Week 3-4: Intelligence Features

1. Smart reorder recommendations
2. Package sales impact tracker
3. Export functionality
4. Documentation and training materials

---

## Approval & Sign-off

**Prepared by**: Product Manager / Senior Developer  
**Date**: October 20, 2025  
**Status**: Awaiting Approval  

**Approvals Required**:
- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer
- [ ] Inventory Manager (User Representative)

**Estimated Effort**: 4 weeks (1 developer)  
**Estimated Cost**: [To be determined]  
**Target Release**: Release v1.1.0

---

## Appendix

### A. Database Schema Reference

**Relevant Tables**:
```sql
-- Products table
products (
  id UUID PRIMARY KEY,
  name VARCHAR,
  current_stock DECIMAL,
  reorder_point DECIMAL,
  ...
)

-- Packages table
packages (
  id UUID PRIMARY KEY,
  name VARCHAR,
  package_type VARCHAR,
  base_price DECIMAL,
  is_active BOOLEAN,
  ...
)

-- Package items (components)
package_items (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES packages,
  product_id UUID REFERENCES products,
  quantity DECIMAL,
  ...
)

-- Order items (sales tracking)
order_items (
  id UUID PRIMARY KEY,
  order_id UUID,
  product_id UUID NULLABLE,
  package_id UUID NULLABLE,
  quantity DECIMAL,
  ...
)
```

### B. File Structure

**New Files**:
```
src/
├── core/
│   └── services/
│       └── inventory/
│           ├── PackageAvailabilityService.ts       [NEW]
│           └── PackageImpactAnalyzer.ts           [NEW]
├── views/
│   └── inventory/
│       ├── PackageStockStatus.tsx                 [NEW]
│       ├── PackageSalesImpact.tsx                 [NEW]
│       ├── InventoryListResponsive.tsx            [MODIFIED]
│       ├── InventoryDashboard.tsx                 [MODIFIED]
│       └── LowStockAlert.tsx                      [MODIFIED]
└── app/
    └── api/
        └── packages/
            └── availability/
                └── route.ts                       [NEW]
```

### C. Code Examples

See inline code examples throughout this document for implementation details.

---

**End of Document**
