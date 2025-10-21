# Phase 4: Automation & Polish - Technical Documentation

**Version**: 1.0  
**Release**: v1.1.0  
**Date**: October 21, 2025  
**Status**: Complete  

---

## Overview

Phase 4 implements automated notifications, real-time POS integration, performance optimization, and production-ready polish for the Unified Inventory Management system.

### Key Deliverables

1. **Automated Notifications** - Proactive alerts for inventory issues
2. **POS Integration** - Real-time package availability in sales interface
3. **Background Jobs** - Scheduled monitoring and checks
4. **API Endpoints** - Complete REST API for inventory notifications
5. **Performance Optimization** - Caching and efficient data fetching

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 4 ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Cron Scheduler  │ (Vercel Cron / GitHub Actions)
└────────┬─────────┘
         │ Every 10 minutes
         ↓
┌──────────────────────────────────────────────────────────────┐
│  /api/cron/inventory-monitor                                 │
│  └─→ InventoryMonitorJob.run()                              │
│      └─→ InventoryNotificationService.runScheduledChecks()  │
└──────────────────┬───────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ↓                   ↓
┌─────────────────┐  ┌──────────────────┐
│ Check Packages  │  │ Check Bottlenecks│
│ Availability    │  │                  │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         └────────┬───────────┘
                  ↓
         ┌────────────────┐
         │ Notification   │
         │ Service        │
         │ (Cooldown)     │
         └────────┬───────┘
                  ↓
         ┌────────────────┐
         │ Create         │
         │ Notifications  │
         └────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  POS Integration (Real-time)                                 │
│                                                               │
│  SessionProductSelector                                      │
│  └─→ useEffect: fetchAllPackageAvailability()               │
│      └─→ Updates every 30 seconds                           │
│      └─→ Validates before adding to cart                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. Automated Notifications Service

### 1.1 InventoryNotificationService

**Location**: `src/core/services/notifications/InventoryNotificationService.ts`

**Purpose**: Manages automated inventory notifications with cooldown mechanism to prevent spam.

#### Class Structure

```typescript
class InventoryNotificationService {
  // Configuration
  private static config: InventoryNotificationConfig;
  private static notificationCache: Map<string, number>;

  // Public Methods
  static configure(config: Partial<InventoryNotificationConfig>): void;
  static checkAndNotifyPackageAvailability(packageId: string): Promise<NotificationTriggerResult>;
  static checkAndNotifyBottlenecks(): Promise<NotificationTriggerResult[]>;
  static runScheduledChecks(): Promise<JobSummary>;
  static clearCooldownCache(): void;
  static getCooldownStats(): CooldownStats;
}
```

#### Notification Types

| Type | Priority | Trigger Condition | Cooldown |
|------|----------|-------------------|----------|
| `PACKAGE_UNAVAILABLE` | URGENT | `max_sellable === 0` | 24h |
| `PACKAGE_LOW_STOCK` | HIGH | `max_sellable < 20% normal` | 24h |
| `PACKAGE_BOTTLENECK` | URGENT | Product limits 2+ packages | 24h |
| `STOCKOUT_PREDICTED` | HIGH | Predicted stockout < 7 days | 24h |

#### Configuration

```typescript
interface InventoryNotificationConfig {
  packageLowStockThreshold: number;      // Default: 0.2 (20%)
  stockoutPredictionDays: number;        // Default: 7
  bottleneckMinPackages: number;         // Default: 2
  notificationCooldownHours: number;     // Default: 24
}
```

#### Usage Examples

**Manual Check**:
```typescript
// Check specific package
const result = await InventoryNotificationService.checkAndNotifyPackageAvailability('pkg-123');

if (result.triggered) {
  console.log(`Notification sent: ${result.notification_id}`);
} else {
  console.log(`No notification: ${result.reason}`);
}
```

**Check All Bottlenecks**:
```typescript
const results = await InventoryNotificationService.checkAndNotifyBottlenecks();
const notifiedCount = results.filter(r => r.triggered).length;
console.log(`Sent ${notifiedCount} bottleneck notifications`);
```

**Scheduled Run**:
```typescript
const summary = await InventoryNotificationService.runScheduledChecks();
console.log(summary);
// {
//   packages_checked: 15,
//   notifications_sent: 3,
//   bottlenecks_detected: 1,
//   errors: []
// }
```

---

## 2. Background Jobs

### 2.1 InventoryMonitorJob

**Location**: `src/core/services/jobs/InventoryMonitorJob.ts`

**Purpose**: Scheduled background job that runs periodic inventory checks.

#### Implementation

```typescript
export class InventoryMonitorJob {
  static async run(): Promise<JobRunResult>;
  static async healthCheck(): Promise<boolean>;
}
```

#### Job Result

```typescript
interface JobRunResult {
  success: boolean;
  timestamp: string;
  duration_ms: number;
  summary: {
    packages_checked: number;
    notifications_sent: number;
    bottlenecks_detected: number;
    errors: string[];
  };
}
```

### 2.2 Cron Endpoint

**Endpoint**: `GET /api/cron/inventory-monitor`

**Security**: Requires `CRON_SECRET` environment variable for authentication.

**Headers**:
```
Authorization: Bearer <CRON_SECRET>
```

**Or Query Parameter**:
```
GET /api/cron/inventory-monitor?token=<CRON_SECRET>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "timestamp": "2025-10-21T12:00:00.000Z",
    "duration_ms": 1250,
    "summary": {
      "packages_checked": 15,
      "notifications_sent": 2,
      "bottlenecks_detected": 1,
      "errors": []
    }
  }
}
```

### 2.3 Scheduling Options

#### Option 1: Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/inventory-monitor",
    "schedule": "*/10 * * * *"
  }]
}
```

#### Option 2: GitHub Actions

Create `.github/workflows/inventory-monitor.yml`:
```yaml
name: Inventory Monitor
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger inventory monitor
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/inventory-monitor
```

#### Option 3: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Uptime Robot](https://uptimerobot.com) (with monitoring endpoint)

---

## 3. POS Integration

### 3.1 Real-time Package Availability

**Component**: `SessionProductSelector.tsx`

**Enhancement**: Added real-time package availability checking before cart addition.

#### Implementation Details

```typescript
// State management
const [packageAvailability, setPackageAvailability] = useState<PackageAvailabilityItem[]>([]);
const [availabilityLoading, setAvailabilityLoading] = useState(false);

// Auto-refresh every 30 seconds
useEffect(() => {
  const loadAvailability = async () => {
    const data = await fetchAllPackageAvailability();
    setPackageAvailability(data);
  };

  loadAvailability();
  const intervalId = setInterval(loadAvailability, 30000);
  return () => clearInterval(intervalId);
}, []);
```

#### Validation Before Cart Addition

```typescript
const handlePackageClick = (pkg: Package) => {
  // Check availability
  const availability = getPackageAvailabilityData(pkg.id);
  
  if (availability && availability.max_sellable === 0) {
    const bottleneck = availability.bottleneck?.product_name || 'a component';
    alert(`Package unavailable due to insufficient ${bottleneck} stock.`);
    return;
  }
  
  // Proceed with cart addition
  onPackageSelect(pkg, price);
};
```

### 3.2 Data Flow

```
1. Component Mount
   └─→ fetchAllPackageAvailability()
       └─→ GET /api/packages/availability
           └─→ PackageAvailabilityService.calculateAllPackageAvailability()
               └─→ Return Map<packageId, maxSellable>

2. Every 30 Seconds
   └─→ Auto-refresh availability data
       └─→ Update UI badges and availability status

3. User Clicks Package
   └─→ getPackageAvailabilityData(packageId)
       └─→ Check max_sellable
           └─→ if 0: Show error, prevent addition
           └─→ if > 0: Allow cart addition
```

---

## 4. API Endpoints

### 4.1 Notification Check Endpoint

**POST** `/api/inventory/notifications/check`

**Request Body**:
```json
{
  "package_id": "uuid",          // Optional: Check specific package
  "check_bottlenecks": true,     // Optional: Check for bottlenecks
  "check_all": true              // Optional: Run all checks (default)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "type": "full_check",
    "summary": {
      "packages_checked": 15,
      "notifications_sent": 3,
      "bottlenecks_detected": 1,
      "errors": []
    }
  }
}
```

### 4.2 Cooldown Statistics

**GET** `/api/inventory/notifications/check`

**Response**:
```json
{
  "success": true,
  "data": {
    "total_entries": 10,
    "by_type": {
      "package_unavailable": 3,
      "package_low_stock": 5,
      "package_bottleneck": 2
    }
  }
}
```

### 4.3 Package Availability (Existing)

**GET** `/api/packages/availability`

**GET** `/api/packages/:packageId/availability`

**GET** `/api/inventory/package-impact/:productId`

---

## 5. Performance Optimization

### 5.1 Caching Strategy

#### Package Availability Cache

- **TTL**: 5 minutes
- **Storage**: In-memory Map
- **Invalidation**: On stock changes
- **Cache Key**: `packageId`

```typescript
private static cache = new Map<string, {
  data: number;
  expires: number;
}>();
```

#### Notification Cooldown Cache

- **TTL**: 24 hours (configurable)
- **Storage**: In-memory Map
- **Purpose**: Prevent duplicate notifications
- **Cache Key**: `${notificationType}_${referenceId}`

```typescript
private static notificationCache = new Map<string, number>();
```

### 5.2 Query Optimization

All queries use existing database indexes created in Phase 1:
- `idx_package_items_product_id`
- `idx_package_items_package_product`
- `idx_order_items_created_at`

### 5.3 Frontend Optimization

- **Lazy Loading**: Package availability only loaded when needed
- **Polling**: 30-second intervals (not real-time WebSocket to reduce load)
- **Debouncing**: Search and filter operations
- **Memoization**: Filtered/sorted lists using `useMemo`

---

## 6. Error Handling

### 6.1 Graceful Degradation

If availability calculation fails:
```typescript
try {
  const availability = await fetchAllPackageAvailability();
  setPackageAvailability(availability);
} catch (error) {
  console.error('Failed to load availability:', error);
  // App continues to function, availability just not shown
}
```

### 6.2 Notification Failures

If notification creation fails:
```typescript
try {
  await NotificationService.notifySystemAlert(...);
} catch (error) {
  console.error('Notification failed:', error);
  // Job continues, logs error in summary
  summary.errors.push(`Notification failed: ${error.message}`);
}
```

### 6.3 Job Failures

If scheduled job fails:
```typescript
{
  "success": false,
  "timestamp": "...",
  "duration_ms": 500,
  "summary": {
    "packages_checked": 0,
    "notifications_sent": 0,
    "bottlenecks_detected": 0,
    "errors": ["Database connection failed"]
  }
}
```

---

## 7. Security Considerations

### 7.1 Cron Endpoint Security

**Authentication Methods**:

1. **Bearer Token** (Recommended):
   ```
   Authorization: Bearer <CRON_SECRET>
   ```

2. **Query Parameter** (For external services):
   ```
   ?token=<CRON_SECRET>
   ```

3. **IP Whitelist** (Not implemented - future enhancement):
   - Restrict to Vercel/GitHub IP ranges
   - Check `x-forwarded-for` header

### 7.2 Environment Variables

Required environment variables:
```env
# Optional: Cron authentication
CRON_SECRET=your-secure-random-token

# Existing Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 7.3 Rate Limiting

**Recommended**:
- Implement rate limiting on notification endpoints
- Prevent excessive manual trigger calls
- Monitor job execution frequency

---

## 8. Monitoring & Observability

### 8.1 Logging

All services include structured logging:

```typescript
console.log('[InventoryMonitorJob] Starting job at', timestamp);
console.log('[InventoryNotificationService] Notification sent:', notificationId);
console.error('[InventoryMonitorJob] Job failed:', error);
```

### 8.2 Metrics to Track

| Metric | Description | Source |
|--------|-------------|--------|
| Job execution time | Duration of each cron run | JobRunResult.duration_ms |
| Packages checked | Total packages analyzed | summary.packages_checked |
| Notifications sent | Total notifications created | summary.notifications_sent |
| Bottlenecks detected | Critical bottleneck count | summary.bottlenecks_detected |
| Error rate | Failed jobs / total jobs | summary.errors.length |
| Cache hit rate | Cooldown cache effectiveness | getCooldownStats() |

### 8.3 Alerting Recommendations

Set up alerts for:
- Job failures (success: false)
- High error rate (errors.length > 5)
- Long execution time (duration_ms > 10000)
- No packages checked (packages_checked === 0)

---

## 9. Testing

### 9.1 Manual Testing

**Test Notification Trigger**:
```bash
curl -X POST http://localhost:3000/api/inventory/notifications/check \
  -H "Content-Type: application/json" \
  -d '{"check_all": true}'
```

**Test Cron Job**:
```bash
curl -X GET "http://localhost:3000/api/cron/inventory-monitor?token=YOUR_SECRET"
```

**Test Package Availability in POS**:
1. Open TAB module
2. Switch to "Packages" tab
3. Observe availability badges
4. Try adding out-of-stock package (should show error)

### 9.2 Unit Testing (Future Enhancement)

Recommended test cases:
```typescript
describe('InventoryNotificationService', () => {
  test('should trigger notification for unavailable package');
  test('should respect cooldown period');
  test('should not trigger if cooldown active');
  test('should detect critical bottlenecks');
});

describe('InventoryMonitorJob', () => {
  test('should complete successfully');
  test('should handle errors gracefully');
  test('should return valid summary');
});
```

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] Set `CRON_SECRET` environment variable
- [ ] Configure cron scheduler (Vercel/GitHub Actions)
- [ ] Test notification endpoints
- [ ] Verify database indexes exist
- [ ] Test POS package availability

### Post-Deployment

- [ ] Verify cron job runs successfully
- [ ] Check notification creation
- [ ] Monitor job execution logs
- [ ] Test real-time availability updates
- [ ] Validate cooldown mechanism

---

## 11. Future Enhancements

### Priority 1: Email Notifications
- Integrate email service (SendGrid/AWS SES)
- User notification preferences
- Email templates for alerts

### Priority 2: Predictive Analytics
- Machine learning for demand forecasting
- Seasonal pattern detection
- Automatic reorder point adjustment

### Priority 3: Real-time WebSocket
- Replace polling with WebSocket connections
- Instant availability updates
- Push notifications to connected clients

### Priority 4: Advanced Monitoring
- Grafana/Prometheus integration
- Custom dashboards
- Historical trend analysis

---

## 12. Troubleshooting

### Issue: Notifications not being sent

**Diagnosis**:
1. Check cooldown cache: `GET /api/inventory/notifications/check`
2. Verify packages are actually unavailable
3. Check notification service logs

**Solution**:
```typescript
// Clear cooldown cache
InventoryNotificationService.clearCooldownCache();
```

### Issue: Cron job not running

**Diagnosis**:
1. Check cron configuration (vercel.json or GitHub Actions)
2. Verify CRON_SECRET is set
3. Check endpoint responds: `curl /api/cron/inventory-monitor`

**Solution**:
- Re-deploy with correct configuration
- Verify environment variables
- Check scheduler service status

### Issue: POS shows stale availability

**Diagnosis**:
1. Check network tab: Is API being called?
2. Verify 30-second interval is active
3. Check for JavaScript errors

**Solution**:
- Hard refresh browser (Ctrl+Shift+R)
- Clear localStorage
- Check API endpoint directly

---

## 13. API Reference Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/inventory/notifications/check` | Manual notification trigger |
| GET | `/api/inventory/notifications/check` | Get cooldown stats |
| GET | `/api/cron/inventory-monitor` | Scheduled job endpoint |
| GET | `/api/packages/availability` | All package availability |
| GET | `/api/packages/:id/availability` | Single package availability |
| GET | `/api/inventory/package-impact/:id` | Package impact on product |

---

## 14. File Structure

```
src/
├── app/
│   └── api/
│       ├── cron/
│       │   └── inventory-monitor/
│       │       └── route.ts                    [NEW]
│       └── inventory/
│           └── notifications/
│               └── check/
│                   └── route.ts                [NEW]
├── core/
│   └── services/
│       ├── jobs/
│       │   └── InventoryMonitorJob.ts         [NEW]
│       └── notifications/
│           └── InventoryNotificationService.ts [NEW]
├── data/
│   └── queries/
│       └── package-availability.queries.ts     [MODIFIED]
├── models/
│   ├── dtos/
│   │   └── InventoryNotification.ts           [NEW]
│   └── enums/
│       └── NotificationType.ts                 [MODIFIED]
└── views/
    └── pos/
        └── SessionProductSelector.tsx          [MODIFIED]
```

---

**End of Technical Documentation**
