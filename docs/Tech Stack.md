# BeerHive POS System - Comprehensive Tech Stack

## Technology Architecture Overview

This tech stack leverages modern web technologies to create a robust, scalable, and maintainable Point of Sale system. The architecture follows a serverless approach with Next.js for the full-stack framework and Supabase for backend services, optimized for real-time operations and multi-user environments.

---

## Core Technologies

### Frontend Framework

**Next.js 14+ (App Router)**
- **Purpose**: Full-stack React framework serving as the foundation for both client and server components
- **Key Features Used**:
  - App Router for file-based routing and layouts
  - Server Components for improved performance and SEO
  - Server Actions for secure backend operations without API routes
  - Middleware for authentication and route protection
  - API Routes for third-party integrations
  - Built-in optimization (image optimization, code splitting, lazy loading)
- **Justification**: Next.js provides enterprise-grade performance, excellent developer experience, and seamless integration with modern React patterns. The App Router enables efficient data fetching and reduces client-side JavaScript.

### UI Framework & Styling

**React 18+ with TypeScript**
- **Purpose**: Component-based UI library with type safety
- **TypeScript Benefits**: Catch errors at compile time, better IDE support, self-documenting code, safer refactoring

**Tailwind CSS 3+**
- **Purpose**: Utility-first CSS framework for rapid UI development
- **Configuration**: Custom color palette matching BeerHive branding, responsive breakpoints optimized for POS devices
- **Plugins**: 
  - `@tailwindcss/forms` - Better form styling
  - `@tailwindcss/typography` - Rich text formatting for reports
  - `tailwind-scrollbar` - Custom scrollbar styling

**shadcn/ui Components**
- **Purpose**: High-quality, accessible React components built on Radix UI
- **Components Used**:
  - Dialog/Modal for add-ons selection and confirmations
  - Command palette for quick product search
  - Data tables for inventory and reports
  - Toast notifications for real-time feedback
  - Form components with built-in validation
  - Dropdown menus for user actions
- **Customization**: Fully customizable with Tailwind, maintains consistent design system

**Additional UI Libraries**:
- **Lucide React**: Modern icon system (replaces heavyweight icon libraries)
- **Recharts**: Data visualization for sales analytics and reports
- **React Hot Toast**: Elegant toast notifications for user feedback
- **Framer Motion**: Smooth animations for UI transitions and micro-interactions

---

## Backend Services (Supabase)

### Database

**PostgreSQL via Supabase**
- **Purpose**: Primary relational database for all application data
- **Features Utilized**:
  - Row Level Security (RLS) for data access control
  - Database functions for complex queries and calculations
  - Triggers for automatic inventory updates
  - Views for pre-computed report data
  - Full-text search for product lookup
  - JSONB columns for flexible product attributes and add-ons
  
**Database Architecture**:
```sql
-- Core Tables Structure
users (auth.users) - Managed by Supabase Auth
├── user_profiles (role, permissions, cashier_code)
├── audit_logs (user_id, action, timestamp, details)

products
├── product_categories (hierarchical)
├── product_addons (many-to-many via junction)
├── product_images (using Supabase Storage URLs)
├── price_history (temporal pricing data)

inventory
├── stock_movements (all transactions)
├── reorder_alerts (computed view)

customers
├── vip_memberships (tier, expiry, benefits)
├── customer_orders (order history)

orders
├── order_items (line items with addons)
├── payments (multiple payment methods per order)
├── order_status_history (state tracking)

packages
├── package_items (included products)
├── package_choices (choice groups for customization)

sales_summary (materialized view for fast reporting)
```

**Performance Optimizations**:
- Indexes on frequently queried columns (customer_id, product_id, order_date)
- Materialized views refreshed hourly for dashboard metrics
- Partitioning for orders table by date (yearly partitions)
- Connection pooling via Supabase's built-in Supavisor

### Authentication & Authorization

**Supabase Auth**
- **Purpose**: Secure user authentication and session management
- **Authentication Methods**:
  - Email/Password (primary for staff accounts)
  - Magic links for admin recovery
  - Session management with JWT tokens
  
**Authorization Implementation**:
- **Row Level Security Policies**:
  ```sql
  -- Example: Cashiers can only view their own sales
  CREATE POLICY cashier_own_sales ON orders
    FOR SELECT TO authenticated
    USING (cashier_id = auth.uid() OR user_role() IN ('admin', 'manager'));
  ```
- **Role-Based Access Control**:
  - Roles stored in `user_profiles.role` column
  - Custom PostgreSQL function `user_role()` for policy evaluation
  - Middleware in Next.js validates role before rendering routes

**Session Management**:
- Automatic token refresh handling via Supabase client
- 30-minute inactivity timeout (configurable)
- Device-based "Remember Me" with 30-day refresh token
- Logout clears all sessions across devices option

### Real-Time Features

**Supabase Realtime**
- **Purpose**: Live updates for multi-cashier coordination and inventory changes
- **Subscriptions**:
  - `inventory` table - Alert all POS terminals when stock levels change
  - `orders` table - Kitchen display system updates
  - `low_stock_alerts` - Real-time notifications for managers
  - `audit_logs` - Live activity monitoring for admin dashboard

**Implementation Example**:
```typescript
// Subscribe to inventory changes
const inventoryChannel = supabase
  .channel('inventory-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'inventory' },
    (payload) => {
      // Update local state, show toast notification
      updateProductStock(payload.new);
    }
  )
  .subscribe();
```

### Storage

**Supabase Storage**
- **Purpose**: Secure file storage for product images, receipts, and reports
- **Buckets**:
  - `product-images`: Public bucket for product photos (WebP format, optimized)
  - `receipts`: Private bucket for transaction receipts (PDF)
  - `reports`: Private bucket for generated reports (PDF, Excel)
  - `documents`: Private bucket for invoices and PO documents
  
**Image Optimization Pipeline**:
1. Upload original image to Supabase Storage
2. Use Supabase Image Transformation API for resizing:
   - Thumbnail: 150x150px for POS grid
   - Medium: 400x400px for product details
   - Original: Stored for high-quality printing
3. Serve via CDN with automatic caching

**Security**:
- Bucket policies restrict access based on user role
- Signed URLs for private files (receipts, reports) with expiration
- File size limits (5MB for product images)
- Content type validation

---

## State Management

### Server State

**TanStack Query (React Query) v5**
- **Purpose**: Server state management with caching, background updates, and optimistic UI
- **Key Features**:
  - Automatic caching with smart invalidation
  - Background refetching to keep data fresh
  - Optimistic updates for instant UI feedback
  - Infinite queries for paginated product lists
  - Query prefetching for faster navigation
  
**Implementation Patterns**:
```typescript
// Product list with real-time sync
const { data: products, isLoading } = useQuery({
  queryKey: ['products', category],
  queryFn: () => getProducts(category),
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: 30000, // Background sync every 30s
});

// Optimistic inventory update
const mutation = useMutation({
  mutationFn: updateInventory,
  onMutate: async (newStock) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['inventory']);
    // Optimistically update UI
    queryClient.setQueryData(['inventory'], newStock);
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['inventory'], context.previousStock);
  },
});
```

### Client State

**Zustand**
- **Purpose**: Lightweight state management for client-side UI state
- **Use Cases**:
  - Current order/cart state
  - Selected customer information
  - POS UI preferences (layout, shortcuts)
  - Active filters and search terms
  - Modal/drawer open states
  
**Store Structure**:
```typescript
// Order Store
interface OrderStore {
  items: OrderItem[];
  customer: Customer | null;
  addItem: (product: Product, addons?: Addon[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  setCustomer: (customer: Customer) => void;
  clearOrder: () => void;
  calculateTotal: () => number;
}

// Persist cart to localStorage for recovery
const useOrderStore = create(
  persist(
    (set, get) => ({
      items: [],
      // ... store implementation
    }),
    { name: 'beerhive-order' }
  )
);
```

**Why Zustand over Context API**:
- Better performance (no unnecessary re-renders)
- Simpler API and less boilerplate
- Built-in persistence support
- DevTools integration
- No provider hell

---

## Form Handling & Validation

**React Hook Form**
- **Purpose**: Performant form management with minimal re-renders
- **Features**:
  - Uncontrolled components for better performance
  - Built-in validation
  - Error handling
  - Integration with UI libraries
  
**Zod**
- **Purpose**: TypeScript-first schema validation
- **Integration**: Use with React Hook Form via `@hookform/resolvers/zod`
- **Benefits**: 
  - Type inference (DRY - schemas define both validation and types)
  - Runtime validation
  - Custom error messages
  - Composable schemas for complex forms

**Example Implementation**:
```typescript
// Product form schema
const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sku: z.string().regex(/^[A-Z0-9-]+$/, 'Invalid SKU format'),
  price: z.number().positive('Price must be positive'),
  category: z.string().uuid('Invalid category'),
  reorder_point: z.number().int().min(0),
});

type ProductFormData = z.infer<typeof productSchema>;

// In component
const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
});
```

---

## Date & Time Handling

**date-fns**
- **Purpose**: Modern date utility library (lightweight alternative to Moment.js)
- **Use Cases**:
  - Date formatting for receipts and reports
  - Date range calculations for analytics
  - Timezone handling (Philippines timezone)
  - Relative time display ("2 hours ago")
  
**Why date-fns over alternatives**:
- Tree-shakeable (only import functions you use)
- Immutable and pure functions
- Excellent TypeScript support
- Smaller bundle size than Moment.js

---

## PDF Generation & Printing

**React-PDF (@react-pdf/renderer)**
- **Purpose**: Generate PDF receipts, invoices, and reports
- **Features**:
  - React component-based PDF creation
  - Automatic pagination
  - Custom styling
  - Font embedding
  
**Print Functionality**:
- Browser print API for receipt printing to thermal printers
- Custom print CSS for proper formatting
- Network printer support via print server

**Jspdf + html2canvas (Alternative for complex reports)**
- Convert HTML reports to PDF
- Better for charts and complex layouts
- Used for detailed financial reports

---

## Development Tools

### Code Quality

**ESLint**
- Next.js recommended config
- Custom rules for project conventions
- Import order enforcement

**Prettier**
- Consistent code formatting
- Integrated with ESLint
- Pre-commit hooks via Husky

**TypeScript**
- Strict mode enabled
- Path aliases for clean imports (`@/components`, `@/lib`)
- Shared types in `@/types` directory

### Testing

**Vitest**
- **Purpose**: Unit and integration testing
- Fast execution with native ESM support
- Compatible with Jest API
- Test database utilities, business logic, calculations

**Playwright**
- **Purpose**: End-to-end testing
- Test critical POS workflows (order creation, payment, inventory deduction)
- Cross-browser testing
- Visual regression testing

**React Testing Library**
- Component testing with user-centric approach
- Accessibility testing

### Git Hooks

**Husky + lint-staged**
- Pre-commit: Run ESLint and Prettier on staged files
- Pre-push: Run type checking and tests
- Commit message linting with commitlint (Conventional Commits)

---

## Deployment & Hosting

### Primary Hosting Option

**Hostinger VPS or Cloud Hosting**
- **Setup**: Node.js environment with PM2 process manager
- **Database**: Supabase (cloud-hosted, no local DB needed)
- **Web Server**: Nginx as reverse proxy
- **SSL**: Let's Encrypt with automatic renewal
- **Deployment**: Git-based deployment with CI/CD

### Alternative Hosting Options

**Vercel (Recommended Alternative)**
- **Pros**: 
  - Zero-config deployment for Next.js
  - Automatic HTTPS and CDN
  - Serverless functions scale automatically
  - Built-in preview deployments
  - Excellent DX with Git integration
- **Cons**: 
  - Cost can increase with high traffic
  - Serverless cold starts (mitigated by keeping app warm)

**Railway**
- Simpler than VPS, cheaper than Vercel
- Good for small to medium deployments
- Built-in monitoring

**DigitalOcean App Platform**
- Managed platform with automatic scaling
- Integrated with DO databases (though using Supabase)
---

## Environment Configuration

### Environment Variables

```bash
# .env.local (Development)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Server-side only, bypasses RLS

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=BeerHive POS

# Feature Flags
NEXT_PUBLIC_ENABLE_VIP_PACKAGES=true
NEXT_PUBLIC_ENABLE_LOYALTY_POINTS=false

# Sentry (Production)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# Email (for reports and notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=beerhive@example.com
SMTP_PASSWORD=xxx
```

### Configuration Management

- Use Supabase Edge Functions for sensitive operations
- Environment-specific configs in separate files
- Secrets managed via hosting platform's secret manager

---

## Security Considerations

### Application Security

1. **SQL Injection Prevention**: Supabase uses parameterized queries
2. **XSS Protection**: React's built-in escaping + Content Security Policy headers
3. **CSRF Protection**: SameSite cookies + CSRF tokens for sensitive operations
4. **Rate Limiting**: Implement via Supabase Edge Functions or Nginx
5. **Input Validation**: Zod schemas on both client and server
6. **Secure Headers**: Next.js security headers configuration

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ..."
  },
];
```

### Data Protection

- Supabase RLS for data access control
- Encrypted connections (HTTPS/SSL)
- PII encryption at rest (Supabase handles this)
- Regular automated backups (Supabase daily backups)
- Audit logging for all sensitive operations

---

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**: Automatic via Next.js dynamic imports
2. **Image Optimization**: Next.js Image component with Supabase transformation
3. **Lazy Loading**: React.lazy for heavy components (reports, analytics)
4. **Memoization**: React.memo, useMemo, useCallback for expensive computations
5. **Debouncing**: Search inputs, filter operations

### Backend Optimizations

1. **Database Indexing**: Strategic indexes on frequently queried columns
2. **Query Optimization**: Use Supabase's query analyzer
3. **Caching**: React Query for client-side, Redis for server-side (if needed)
4. **Connection Pooling**: Supabase Supavisor manages this automatically
5. **CDN**: Serve static assets via Vercel CDN or CloudFlare

### Monitoring

- Core Web Vitals tracking
- Database query performance monitoring
- Real User Monitoring (RUM) via Sentry
- Server resource monitoring (CPU, memory, disk)

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/beerhive/pos-system.git
cd pos-system

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run Supabase locally (optional)
npx supabase start

# 5. Run database migrations
npm run db:migrate

# 6. Seed development data
npm run db:seed

# 7. Start development server
npm run dev
```

### Database Management

```bash
# Generate new migration
npx supabase migration new add_vip_packages

# Apply migrations
npx supabase db push

# Reset database
npx supabase db reset

# Generate TypeScript types from schema
npx supabase gen types typescript --local > lib/database.types.ts
```

### Folder Structure

```
beerhive-pos/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main app routes
│   │   ├── pos/                  # POS interface
│   │   ├── inventory/            # Inventory management
│   │   ├── customers/            # Customer management
│   │   ├── packages/             # Package configuration
│   │   ├── reports/              # Analytics and reports
│   │   └── settings/             # System settings
│   ├── api/                      # API routes (for webhooks, external integrations)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── pos/                      # POS-specific components
│   ├── forms/                    # Form components
│   └── layout/                   # Layout components (Sidebar, Header)
├── lib/                          # Utilities and configurations
│   ├── supabase/                 # Supabase client and helpers
│   ├── utils/                    # Helper functions
│   ├── hooks/                    # Custom React hooks
│   ├── validations/              # Zod schemas
│   └── constants/                # App constants
├── types/                        # TypeScript type definitions
├── stores/                       # Zustand stores
├── public/                       # Static assets
├── supabase/                     # Supabase configuration
│   ├── migrations/               # Database migrations
│   └── seed.sql                  # Seed data
└── tests/                        # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

This stack balances cutting-edge technology with practical business needs, ensuring BeerHive POS is maintainable, performant, and ready to scale with business growth.