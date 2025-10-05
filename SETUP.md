# BeerHive POS - Setup Instructions

## Phase 1 - Completed ✅

The project foundation has been successfully set up. Follow these steps to complete the setup.

## Next Steps

### 1. Install Dependencies

Run the following command in your terminal:

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase Client
- shadcn/ui components
- React Hook Form & Zod
- Date-fns
- Lucide React (icons)

### 2. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - **Name**: beerhive-pos
   - **Database Password**: (choose a strong password)
   - **Region**: Select closest to your location
5. Wait for the project to be created (~2 minutes)

### 3. Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep this secret!)

### 4. Configure Environment Variables

1. Copy the example file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 5. Run Database Migrations

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `docs/Database Structure.sql`
4. Paste into the SQL Editor
5. Click "Run" or press `Ctrl+Enter`
6. Verify all tables were created successfully by checking the **Table Editor**

### 6. Generate TypeScript Types (Optional but Recommended)

After running the migrations, generate TypeScript types from your database:

```bash
npx supabase login
npx supabase link --project-ref your_project_ref
npx supabase gen types typescript --linked > src/models/database.types.ts
```

Replace `your_project_ref` with your project reference ID (found in Supabase Settings → General).

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure Created

```
beerhive-sales-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (redirects to login)
│   │   ├── globals.css         # Global styles
│   │   ├── error.tsx           # Error handler
│   │   └── not-found.tsx       # 404 page
│   │
│   ├── views/                  # UI Components
│   │   └── shared/
│   │       ├── ui/             # Base UI components (Button, Card, Input, Label)
│   │       └── feedback/       # Feedback components (Loading, EmptyState)
│   │
│   ├── models/                 # TypeScript Types
│   │   ├── entities/           # Domain entities (User, Customer, Product, Order, Table, KitchenOrder)
│   │   ├── dtos/               # Data Transfer Objects
│   │   ├── enums/              # Enumerations (UserRole, OrderStatus, etc.)
│   │   ├── database.types.ts   # Supabase generated types (placeholder)
│   │   └── index.ts            # Barrel exports
│   │
│   ├── core/                   # Business Logic
│   │   ├── services/           # (Placeholder - will be populated in later phases)
│   │   ├── use-cases/          # (Placeholder)
│   │   ├── validators/         # (Placeholder)
│   │   └── utils/
│   │       ├── calculations/   # Price calculator
│   │       └── generators/     # Order number generator
│   │
│   ├── data/                   # Data Access Layer
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   └── server-client.ts # Server Supabase client
│   │   ├── repositories/       # (Placeholder)
│   │   ├── queries/            # (Placeholder)
│   │   └── mutations/          # (Placeholder)
│   │
│   └── lib/                    # Shared Utilities
│       ├── config/
│       │   ├── app.config.ts   # App configuration
│       │   └── constants.ts    # Constants (routes, API routes, messages)
│       ├── utils/
│       │   ├── cn.ts           # Class name merger
│       │   └── formatters/     # Currency and date formatters
│       └── errors/
│           └── AppError.ts     # Custom error classes
│
├── docs/                       # Documentation
│   └── IMPLEMENTATION_GUIDE.md # Updated with Phase 1 completion
│
├── public/                     # Static assets
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind config
├── next.config.js              # Next.js config
├── components.json             # shadcn/ui config
└── README.md                   # Project overview
```

## What's Next?

Phase 1 is complete! The project foundation is ready. The implementation will continue with:

- **Phase 2**: Database schema deployment and TypeScript type generation
- **Phase 3**: Authentication system and shared UI components
- **Phase 4**: Core POS functionality

Refer to `docs/IMPLEMENTATION_GUIDE.md` for the complete roadmap.

## Troubleshooting

### Dependencies Installation Issues
If you encounter issues with `npm install`:
- Make sure you're using Node.js 18 or higher: `node --version`
- Try clearing the cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Supabase Connection Issues
- Double-check your environment variables in `.env.local`
- Ensure there are no extra spaces in the values
- Restart the development server after changing environment variables

### TypeScript Errors
- Run `npm run type-check` to see all type errors
- The type errors will resolve after running `npm install`
- Some types depend on Supabase schema, so run migrations first

## Support

For issues or questions, refer to:
- Next.js Documentation: https://nextjs.org/docs
- Supabase Documentation: https://supabase.com/docs
- shadcn/ui Documentation: https://ui.shadcn.com
