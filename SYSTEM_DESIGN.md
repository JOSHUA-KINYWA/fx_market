# FX Trading Journal - System Design Document

## 1. System Overview

### Purpose
A comprehensive FX trading journal that allows traders to upload CSV data from their trading platforms, analyze performance, track psychology, and improve trading strategies.

### Key Objectives
- Import trades from multiple brokers via CSV upload
- Track both quantitative (P&L, win rate) and qualitative (emotions, mistakes) data
- Provide actionable insights through analytics and reports
- Help traders identify patterns in behavior and performance
- Support multiple trading accounts and strategies

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                        │
│                  (Next.js + TypeScript + Tailwind)           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth UI    │  │  Dashboard   │  │   Reports    │      │
│  │  - Login     │  │  - Overview  │  │  - Analytics │      │
│  │  - Register  │  │  - Metrics   │  │  - Charts    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Trade Entry  │  │ CSV Upload   │  │  Journal     │      │
│  │  - Manual    │  │  - Parser    │  │  - Review    │      │
│  │  - Quick Add │  │  - Mapping   │  │  - Notes     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API/SERVICE LAYER                       │
│                    (Next.js API Routes)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Trade Management Service                  │    │
│  │  - CRUD operations for trades                       │    │
│  │  - Validation and business logic                    │    │
│  │  - Calculate metrics (P&L, win rate, etc.)         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           CSV Processing Service                    │    │
│  │  - Parse CSV files from various brokers            │    │
│  │  - Map columns to database schema                  │    │
│  │  - Validate and clean data                         │    │
│  │  - Bulk insert trades                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Analytics Service                         │    │
│  │  - Calculate performance metrics                    │    │
│  │  - Generate reports and insights                    │    │
│  │  - Pattern detection (psychology & behavior)        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Authentication Service                    │    │
│  │  - User authentication via Supabase Auth           │    │
│  │  - Session management                              │    │
│  │  - Authorization checks                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATA LAYER                            │
│                  (Supabase PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   profiles   │  │   accounts   │  │  strategies  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │              trades (Main Table)                  │       │
│  │  - All trade data                                 │       │
│  │  - Links to accounts, strategies, etc.           │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ trade_notes  │  │trade_emotions│  │trade_mistakes│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │emotion_tags  │  │mistake_tags  │  │trade_setups  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │           csv_import_logs                         │       │
│  │  - Track import history and status                │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Core Features & Connections

### 3.1 User Authentication & Profile Management

**Components:**
- Auth pages (login, register, password reset)
- Profile settings page

**Connections:**
```
User (Supabase Auth)
  ↓
profiles (user metadata)
  ↓
├── trading_accounts (1:many)
├── strategies (1:many)
├── trade_setups (1:many)
├── emotion_tags (1:many)
├── mistake_tags (1:many)
└── trades (through accounts)
```

**Flow:**
1. User registers/logs in via Supabase Auth
2. Profile created automatically via database trigger
3. User can manage multiple trading accounts
4. All data is isolated per user (Row Level Security)

---

### 3.2 CSV Upload & Trade Import System

**Components:**
- CSV upload interface
- Column mapping tool
- Import preview & validation
- Bulk import processor

**Connection Flow:**
```
CSV File Upload
  ↓
Parse CSV (detect format)
  ↓
Map Columns to Schema
  ┌─────────────────────────────────────┐
  │ CSV Column    →    DB Field         │
  │ "Date/Time"   →    entry_time       │
  │ "Symbol"      →    currency_pair    │
  │ "Type"        →    direction         │
  │ "Lots"        →    position_size    │
  │ "Price"       →    entry_price      │
  │ "S/L"         →    stop_loss        │
  │ "T/P"         →    take_profit      │
  │ "Profit"      →    profit_loss      │
  └─────────────────────────────────────┘
  ↓
Validate Data
  - Check required fields
  - Validate data types
  - Check for duplicates
  - Calculate missing fields
  ↓
Preview (show first 10 rows)
  ↓
User Confirms
  ↓
Bulk Insert into trades table
  ↓
Update account balance
  ↓
Log import in csv_import_logs
  ↓
Show success summary
```

**Key Features:**
- Auto-detect broker format (MT4, MT5, cTrader, etc.)
- Smart column mapping with presets
- Duplicate detection (same ticket/order ID)
- Validation errors with clear messages
- Ability to save mapping templates for future imports
- Rollback capability if import fails

---

### 3.3 Trade Management System

**Components:**
- Trade list/table view
- Trade detail modal
- Manual trade entry form
- Quick trade add button
- Trade edit/delete functions

**Connection Structure:**
```
trades (main record)
  ├── linked to: trading_account
  ├── linked to: strategy (optional)
  ├── linked to: trade_setup (optional)
  │
  ├── has many: trade_notes (1:many)
  ├── has many: trade_emotions (many:many via junction)
  ├── has many: trade_mistakes (many:many via junction)
  └── has many: trade_screenshots (1:many)
```

**Trade Lifecycle:**
```
1. Trade Created
   ├── Via CSV import (automated)
   └── Via manual entry (user input)
   
2. Trade Enrichment (manual step)
   ├── Add psychology data
   │   ├── Pre-trade emotions
   │   ├── Conviction level
   │   └── Market conditions
   │
   ├── Tag strategy & setup
   ├── Add screenshots
   └── Write notes
   
3. Trade Closed
   ├── Calculate actual P&L
   ├── Calculate R-multiple
   ├── Update account balance
   └── Trigger analytics recalculation
   
4. Trade Review
   ├── Add post-trade emotions
   ├── Tag mistakes
   ├── Add lessons learned
   └── Rate execution quality
```

---

### 3.4 Psychology Tracking System

**Components:**
- Emotion selector (multi-select tags)
- Conviction slider (1-10)
- Mistake checklist
- Discipline rating
- Free-form notes

**Connection Model:**
```
Before Trade:
  trade
    ↓
  pre_trade_emotions (tags: "Confident", "Calm", "FOMO")
    ↓
  conviction_level (1-10 scale)
    ↓
  market_conditions (text)

During Trade:
  trade
    ↓
  during_notes (text: thought process)
    ↓
  rule_followed (boolean: followed plan?)

After Trade:
  trade
    ↓
  post_trade_emotions (tags: "Satisfied", "Frustrated", "Greedy")
    ↓
  mistakes (tags: "Moved SL", "Revenge Trade")
    ↓
  lessons_learned (text)
    ↓
  execution_rating (1-10: how well executed?)
```

**Analytics Queries:**
```sql
-- Example: Win rate by emotion
SELECT 
  emotion,
  COUNT(*) as total_trades,
  SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(CASE WHEN profit_loss > 0 THEN 100 ELSE 0 END), 2) as win_rate_pct
FROM trades t
JOIN trade_emotions te ON t.id = te.trade_id
JOIN emotion_tags et ON te.emotion_id = et.id
WHERE te.timing = 'pre_trade'
GROUP BY emotion
ORDER BY win_rate_pct DESC;

-- Example: Cost of mistakes
SELECT 
  mt.name as mistake,
  COUNT(*) as times_made,
  SUM(t.profit_loss) as total_cost,
  AVG(t.profit_loss) as avg_cost
FROM trades t
JOIN trade_mistakes tm ON t.id = tm.trade_id
JOIN mistake_tags mt ON tm.mistake_id = mt.id
GROUP BY mt.name
ORDER BY total_cost ASC;
```

---

### 3.5 Analytics & Reporting System

**Components:**
- Dashboard with key metrics
- Performance charts (equity curve, win rate over time)
- Detailed reports (by strategy, pair, time, emotion)
- Pattern detection

**Data Flow:**
```
trades table
  ↓
Calculate Metrics
  ├── Overall Stats
  │   ├── Total trades
  │   ├── Win rate
  │   ├── Profit factor
  │   ├── Average R-multiple
  │   ├── Max drawdown
  │   ├── Expectancy
  │   └── Sharpe ratio
  │
  ├── Breakdown by Dimensions
  │   ├── By currency pair
  │   ├── By strategy
  │   ├── By trade setup
  │   ├── By time of day
  │   ├── By day of week
  │   ├── By session (Asian/London/NY)
  │   └── By market condition
  │
  └── Psychology Insights
      ├── Win rate by emotion
      ├── P&L by conviction level
      ├── Cost of mistakes
      ├── Rule violation impact
      └── Best/worst trading hours
  ↓
Cache Results (materialized views or Redis)
  ↓
Display in UI (charts, tables, cards)
```

**Key Reports:**

1. **Performance Overview**
   - Total P&L, win rate, profit factor
   - Equity curve chart
   - Monthly performance table
   - Best/worst trades

2. **Strategy Analysis**
   - Compare multiple strategies
   - Which setups work best
   - Win rate per strategy
   - Average R per strategy

3. **Psychology Report**
   - Emotion correlation matrix
   - Mistake frequency & cost
   - Conviction level analysis
   - Time-of-day patterns

4. **Risk Analysis**
   - Position sizing consistency
   - Risk/reward ratio distribution
   - Maximum consecutive losses
   - Drawdown periods

5. **Currency Pair Analysis**
   - Best/worst performing pairs
   - Win rate by pair
   - Average profit per pair
   - Trading frequency per pair

---

### 3.6 Strategy & Setup Management

**Components:**
- Strategy library
- Setup templates
- Rule definition

**Connection:**
```
User defines strategies
  ↓
Create trade setups (patterns)
  ↓
Assign to trades during entry/import
  ↓
Filter & analyze by strategy/setup
  ↓
Refine strategy based on results
```

**Example Structure:**
```
Strategy: "Breakout Strategy"
  ├── Rules:
  │   - Enter on break of resistance
  │   - Wait for retest
  │   - Stop loss below support
  │   - Target 2:1 R:R minimum
  │
  ├── Timeframe: H1, H4
  │
  └── Setups (variations):
      ├── "Horizontal Resistance Break"
      ├── "Trend Line Break"
      └── "Range Break"

Each trade tagged with:
  - strategy_id → links to "Breakout Strategy"
  - setup_id → links to specific setup
```

---

## 4. Database Schema Relationships

### Entity Relationship Diagram

```
profiles (1)
  ├──< trading_accounts (many)
  │     └──< trades (many)
  │           ├──< trade_notes (many)
  │           ├──<> trade_emotions (many-to-many)
  │           │     └── emotion_tags
  │           ├──<> trade_mistakes (many-to-many)
  │           │     └── mistake_tags
  │           ├──< trade_screenshots (many)
  │           ├──> strategy (optional)
  │           └──> trade_setup (optional)
  │
  ├──< strategies (many)
  ├──< trade_setups (many)
  ├──< emotion_tags (many)
  ├──< mistake_tags (many)
  └──< csv_import_logs (many)
```

### Key Tables:

**Core Tables:**
- `profiles` - User information
- `trading_accounts` - Broker accounts
- `trades` - Main trade records
- `strategies` - Trading strategies
- `trade_setups` - Trade patterns/setups

**Psychology Tables:**
- `emotion_tags` - Predefined emotions
- `mistake_tags` - Common mistakes
- `trade_emotions` - Junction table (trade ↔ emotion)
- `trade_mistakes` - Junction table (trade ↔ mistake)
- `trade_notes` - Free-form notes

**Support Tables:**
- `trade_screenshots` - Chart images
- `csv_import_logs` - Import history
- `user_settings` - User preferences

---

## 5. User Workflows

### Workflow 1: New User Onboarding

```
1. User signs up
   ↓
2. Email verification (Supabase)
   ↓
3. Create profile (auto-trigger)
   ↓
4. Onboarding wizard
   ├── Create first trading account
   ├── Set default currency/timezone
   ├── Create initial strategies (optional)
   └── Create emotion/mistake tags (presets provided)
   ↓
5. Dashboard (empty state with prompts)
   ├── "Import your first trades"
   └── "Add a manual trade"
```

### Workflow 2: Import Trades from CSV

```
1. Navigate to "Import" page
   ↓
2. Select trading account
   ↓
3. Upload CSV file
   ↓
4. System detects broker format
   ↓
5. Show column mapping
   ├── Auto-mapped columns (green)
   ├── Unmapped columns (yellow - user maps)
   └── Missing required fields (red - error)
   ↓
6. Preview data (first 10 rows)
   ↓
7. User confirms
   ↓
8. System processes
   ├── Validate all rows
   ├── Check for duplicates
   ├── Calculate derived fields
   └── Insert trades
   ↓
9. Show import summary
   ├── X trades imported
   ├── Y duplicates skipped
   ├── Z errors (with details)
   └── Link to view imported trades
```

### Workflow 3: Manual Trade Entry

```
1. Click "Add Trade" button
   ↓
2. Quick entry form
   ├── Account (dropdown)
   ├── Currency pair (autocomplete)
   ├── Direction (Buy/Sell)
   ├── Entry price
   ├── Position size
   ├── Stop loss
   ├── Take profit
   └── Entry time (defaults to now)
   ↓
3. Save trade (opens in pending state)
   ↓
4. Trade appears in list
   ↓
5. User can enrich later with:
   ├── Psychology tags
   ├── Strategy assignment
   ├── Notes
   └── Screenshots
```

### Workflow 4: Trade Review & Journaling

```
1. Navigate to trade detail
   ↓
2. Review trade information
   ├── Price action
   ├── P&L calculation
   └── Risk/reward ratio
   ↓
3. Add psychology data
   ├── Select pre-trade emotions
   ├── Rate conviction (1-10)
   ├── Tag any mistakes made
   └── Rate execution quality
   ↓
4. Write notes
   ├── What worked?
   ├── What didn't work?
   ├── Lessons learned
   └── What to do differently
   ↓
5. Save enriched trade
   ↓
6. Data flows into analytics
```

### Workflow 5: Analytics Review

```
1. Navigate to Dashboard
   ↓
2. View key metrics
   ├── Overall P&L
   ├── Win rate
   ├── Best/worst trades
   └── Equity curve
   ↓
3. Drill into reports
   ├── Filter by date range
   ├── Filter by strategy
   ├── Filter by emotion
   └── Filter by mistake
   ↓
4. Discover insights
   ├── "I win 80% when calm but 20% when anxious"
   ├── "Friday afternoons are my worst trading time"
   ├── "Moving stop loss costs me $500/month"
   └── "EUR/USD is my best pair"
   ↓
5. Adjust strategy based on data
   ↓
6. Track improvement over time
```

---

## 6. Technical Implementation Details

### 6.1 Authentication Flow (Supabase)

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Session management (middleware)
export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  await supabase.auth.getSession();
  return res;
}

// Protected routes check
const session = await supabase.auth.getSession();
if (!session) redirect('/login');
```

### 6.2 CSV Processing Flow

```typescript
// Step 1: Parse CSV
import Papa from 'papaparse';

const parseCSV = (file: File) => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => resolve(results.data),
      skipEmptyLines: true
    });
  });
};

// Step 2: Detect broker format
const detectBrokerFormat = (headers: string[]) => {
  // MT4/MT5 has "Ticket", "Symbol", "Type"
  if (headers.includes('Ticket') && headers.includes('Symbol')) {
    return 'MT4';
  }
  // cTrader has "Position ID", "Symbol", "Trade Side"
  if (headers.includes('Position ID') && headers.includes('Trade Side')) {
    return 'cTrader';
  }
  return 'unknown';
};

// Step 3: Map columns
const columnMappings = {
  MT4: {
    'Ticket': 'ticket_id',
    'Open Time': 'entry_time',
    'Symbol': 'currency_pair',
    'Type': 'direction',
    'Volume': 'position_size',
    'Price': 'entry_price',
    'S / L': 'stop_loss',
    'T / P': 'take_profit',
    'Close Time': 'exit_time',
    'Close Price': 'exit_price',
    'Profit': 'profit_loss'
  },
  cTrader: {
    // Different mapping
  }
};

// Step 4: Transform & validate
const transformRow = (row: any, mapping: any) => {
  const transformed = {};
  for (const [csvCol, dbField] of Object.entries(mapping)) {
    transformed[dbField] = row[csvCol];
  }
  
  // Calculate derived fields
  transformed.pips = calculatePips(transformed);
  transformed.r_multiple = calculateRMultiple(transformed);
  
  return transformed;
};

// Step 5: Bulk insert
const { data, error } = await supabase
  .from('trades')
  .insert(transformedData);
```

### 6.3 Analytics Calculation

```typescript
// Calculate key metrics
const calculateMetrics = async (userId: string, accountId?: string) => {
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .order('entry_time', { ascending: true });

  const metrics = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => t.profit_loss > 0).length,
    losingTrades: trades.filter(t => t.profit_loss < 0).length,
    totalProfit: trades.filter(t => t.profit_loss > 0)
      .reduce((sum, t) => sum + t.profit_loss, 0),
    totalLoss: trades.filter(t => t.profit_loss < 0)
      .reduce((sum, t) => sum + Math.abs(t.profit_loss), 0),
  };

  metrics.winRate = (metrics.winningTrades / metrics.totalTrades) * 100;
  metrics.profitFactor = metrics.totalProfit / metrics.totalLoss;
  metrics.netProfit = metrics.totalProfit - metrics.totalLoss;
  metrics.avgWin = metrics.totalProfit / metrics.winningTrades;
  metrics.avgLoss = metrics.totalLoss / metrics.losingTrades;
  metrics.expectancy = (metrics.winRate/100 * metrics.avgWin) - 
                       ((1-metrics.winRate/100) * metrics.avgLoss);

  return metrics;
};

// Equity curve calculation
const calculateEquityCurve = (trades: Trade[], initialBalance: number) => {
  let balance = initialBalance;
  return trades.map(trade => {
    balance += trade.profit_loss;
    return {
      date: trade.exit_time,
      balance: balance
    };
  });
};
```

### 6.4 Psychology Analysis

```typescript
// Analyze win rate by emotion
const analyzeEmotionPerformance = async (userId: string) => {
  const { data } = await supabase
    .from('trades')
    .select(`
      id,
      profit_loss,
      trade_emotions (
        emotion_tags (name)
      )
    `)
    .eq('user_id', userId);

  // Group by emotion
  const emotionStats = {};
  
  data.forEach(trade => {
    trade.trade_emotions.forEach(({ emotion_tags }) => {
      const emotion = emotion_tags.name;
      if (!emotionStats[emotion]) {
        emotionStats[emotion] = { 
          total: 0, 
          wins: 0, 
          profit: 0 
        };
      }
      
      emotionStats[emotion].total++;
      if (trade.profit_loss > 0) {
        emotionStats[emotion].wins++;
      }
      emotionStats[emotion].profit += trade.profit_loss;
    });
  });

  // Calculate win rates
  Object.keys(emotionStats).forEach(emotion => {
    const stats = emotionStats[emotion];
    stats.winRate = (stats.wins / stats.total) * 100;
  });

  return emotionStats;
};
```

---

## 7. Security & Performance Considerations

### 7.1 Security

**Row Level Security (RLS) in Supabase:**
```sql
-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Trades: Users can only access their own trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Similar policies for all user-owned tables
```

**API Security:**
- All API routes check authentication status
- Validate user ownership of resources
- Rate limiting on CSV uploads (prevent abuse)
- File size limits on uploads
- SQL injection prevention (use parameterized queries)

### 7.2 Performance

**Optimization Strategies:**

1. **Database Indexes:**
```sql
-- Index for common queries
CREATE INDEX idx_trades_user_account 
  ON trades(user_id, account_id);

CREATE INDEX idx_trades_entry_time 
  ON trades(entry_time);

CREATE INDEX idx_trades_currency_pair 
  ON trades(currency_pair);

-- Composite index for analytics
CREATE INDEX idx_trades_analytics 
  ON trades(user_id, account_id, entry_time, profit_loss);
```

2. **Caching:**
- Cache dashboard metrics (update every 5 minutes)
- Cache emotion/mistake tag lists (rarely change)
- Use React Query for client-side caching

3. **Pagination:**
- Trade list: Load 50 trades at a time
- Infinite scroll or pagination controls

4. **Lazy Loading:**
- Load trade details on demand
- Load screenshots only when viewing trade

5. **Aggregation:**
- Pre-calculate metrics in database views
- Update on trade insert/update

---

## 8. Feature Prioritization (MVP → Advanced)

### Phase 1: MVP (Core Functionality)
✅ User authentication
✅ Single trading account setup
✅ CSV import (MT4/MT5 format)
✅ Manual trade entry
✅ Basic trade list view
✅ Simple dashboard (key metrics)
✅ Basic filtering (by date, pair)

### Phase 2: Enhanced Features
✅ Multiple account support
✅ Psychology tracking (emotions, mistakes)
✅ Strategy & setup management
✅ Advanced analytics dashboard
✅ Equity curve chart
✅ Trade notes & screenshots

### Phase 3: Advanced Features
✅ Multiple broker CSV format support
✅ Pattern detection & insights
✅ Detailed reports (by strategy, emotion, time)
✅ Trade replay (show chart at entry time)
✅ Goal setting & tracking
✅ Export reports (PDF)

### Phase 4: Premium Features
✅ AI-powered trade analysis
✅ Community sharing
✅ Mentor review system
✅ Mobile app
✅ Real-time account sync (API)
✅ Backtesting integration

---

## 9. User Interface Structure

### Page Structure:

```
/
├── / (landing page - if not logged in)
├── /login
├── /register
├── /forgot-password
│
├── /dashboard (protected)
│   ├── Overview metrics
│   ├── Equity curve chart
│   ├── Recent trades
│   └── Quick actions
│
├── /trades (protected)
│   ├── /trades (list view with filters)
│   ├── /trades/new (manual entry)
│   ├── /trades/:id (detail view)
│   └── /trades/:id/edit
│
├── /import (protected)
│   ├── Upload CSV
│   ├── Map columns
│   └── Preview & import
│
├── /analytics (protected)
│   ├── Performance overview
│   ├── Strategy analysis
│   ├── Psychology insights
│   ├── Currency pair analysis
│   └── Custom reports
│
├── /journal (protected)
│   └── Trade journal view (calendar/timeline)
│
├── /accounts (protected)
│   ├── List of trading accounts
│   └── Add/edit accounts
│
├── /strategies (protected)
│   ├── List strategies
│   ├── Create/edit strategy
│   └── View performance per strategy
│
├── /settings (protected)
│   ├── Profile
│   ├── Preferences
│   ├── Tags (emotions, mistakes)
│   └── Import templates
│
└── /help
    ├── Documentation
    ├── CSV format guide
    └── Support
```

---

## 10. Next Steps for Implementation

### Development Roadmap:

1. **Setup Project** ✅ (You're here!)
   - Initialize Next.js with TypeScript
   - Setup Tailwind CSS
   - Configure Supabase client

2. **Create Database Schema**
   - Run SQL migrations in Supabase
   - Setup RLS policies
   - Create necessary indexes

3. **Implement Authentication**
   - Login/Register pages
   - Session management
   - Protected route middleware

4. **Build Core Features**
   - Trading account CRUD
   - Manual trade entry
   - Trade list with basic filtering

5. **CSV Import System**
   - File upload component
   - CSV parser
   - Column mapping interface
   - Bulk insert logic

6. **Analytics Engine**
   - Metrics calculation functions
   - Dashboard components
   - Charts (use recharts or chart.js)

7. **Psychology Features**
   - Tag management
   - Trade enrichment UI
   - Psychology reports

8. **Polish & Optimize**
   - Error handling
   - Loading states
   - Performance optimization
   - Mobile responsiveness

---

## Summary

This system design focuses on:

1. **Flexible Import**: Accept CSV from any broker with smart mapping
2. **Rich Data Model**: Track both numbers AND psychology
3. **Connected Analytics**: Every piece of data feeds into insights
4. **User-Centric**: Easy workflows for busy traders
5. **Scalable**: Can grow from MVP to advanced features
6. **Secure**: User data isolation and protection

The key insight is that trades are the central entity, but they're enriched with:
- Account context
- Strategy/setup classification
- Psychology data (emotions, mistakes, notes)
- Performance metrics (calculated)

All of this connects to provide actionable insights that help traders improve.

Ready to start building? I can help you:
1. Create the database schema SQL
2. Setup the Next.js project structure
3. Build specific features
4. Or all of the above!
