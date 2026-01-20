# FX Trading Journal

A comprehensive FX trading journal application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- 📊 Import trades from CSV files (MT4, MT5, cTrader, etc.)
- 📝 Manual trade entry and management
- 🧠 Psychology tracking (emotions, mistakes, conviction levels)
- 📈 Advanced analytics and performance metrics
- 🎯 Strategy and setup management
- 📱 Responsive design

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **CSV Parsing**: PapaParse

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
journal/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── trades/            # Trade management pages
│   ├── import/            # CSV import page
│   └── analytics/         # Analytics pages
├── components/            # React components
├── lib/                  # Utility functions
│   └── supabase/         # Supabase client setup
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Database Setup

The database schema needs to be created in Supabase. See `SYSTEM_DESIGN.md` for the complete schema design.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Create database schema in Supabase
2. Set up authentication pages
3. Implement trade management features
4. Build CSV import functionality
5. Create analytics dashboard

For detailed system design, see `SYSTEM_DESIGN.md` in the root directory.
