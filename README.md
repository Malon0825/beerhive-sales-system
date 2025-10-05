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

## License

Private - All rights reserved
