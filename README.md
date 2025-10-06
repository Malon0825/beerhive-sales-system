# BeerHive POS System

A modern Point of Sale system built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

## Features

- 🍺 Point of Sale Interface
- 👨‍🍳 Kitchen Display System
- 🍹 Bartender Display
- 📊 Inventory Management
- 👥 Customer Management with VIP Tiers
- 🎉 Birthday & Anniversary Offers
- ⏰ Happy Hour Pricing
- 📈 Sales Reports & Analytics
- 🔐 Role-Based Access Control

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Handling**: React Hook Form + Zod
- **State Management**: React Context

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd beerhive-sales-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials.

4. Run the database migrations:
- Go to your Supabase project SQL Editor
- Execute the SQL script from `docs/Database Structure.sql`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

See `docs/Folder Structure.md` for detailed architecture documentation.

## Documentation

- **Implementation Guide**: `docs/IMPLEMENTATION_GUIDE.md`
- **Database Schema**: `docs/Database Structure.sql`
- **Folder Structure**: `docs/Folder Structure.md`

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

## Deployment

The BeerHive POS System can be deployed to multiple platforms. We support both **Netlify** and **Vercel** for production deployments.

### Netlify (Recommended for Small Teams)

**Quick Deploy:**
1. Connect your repository to Netlify
2. Set environment variables (see `.env.netlify.example`)
3. Deploy automatically on push

**Documentation:**
- 📘 **Full Guide:** `docs/NETLIFY_DEPLOYMENT_GUIDE.md`
- ⚡ **Quick Start:** `docs/NETLIFY_QUICK_START.md`

**Benefits:**
- Cost-effective team pricing ($19/month)
- Built-in form handling and split testing
- 300 build minutes/month (Free tier)

### Vercel (Best Next.js Performance)

**Quick Deploy:**
1. Import project to Vercel
2. Configure environment variables
3. Deploy

**Documentation:**
- 📘 **Setup Guide:** `docs/VERCEL_DEPLOYMENT_STEPS.md`

**Benefits:**
- Zero-configuration for Next.js
- 6000 build minutes/month (Free tier)
- Native Next.js optimizations

### Platform Comparison

Need help choosing? See `docs/DEPLOYMENT_COMPARISON.md` for detailed platform comparison.

### Environment Variables

Required environment variables for deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_NAME=BeerHive POS
NEXT_PUBLIC_APP_URL=your_deployment_url
```

See `.env.local.example` or `.env.netlify.example` for complete list.

## License

Private - All rights reserved
