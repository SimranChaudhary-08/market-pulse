# Market Pulse

Market Pulse is a smart stock watchlist designed to answer one simple question:

> **What meaningfully changed since I last checked?**

Instead of requiring users to manually compare prices and activity, Market Pulse stores a personal last-seen baseline and highlights stocks that deserve attention.

## Product Pitch

Market Pulse turns a passive stock watchlist into a changes-first market monitor. It remembers what each user last saw, compares new market data against that personal baseline, and highlights meaningful price or volume movements. Users can quickly see what changed, why it matters, and whether the data is fresh, cached, or served from a fallback snapshot. The system prioritizes reliability by storing market snapshots and continuing to serve previously saved data when the external market-data provider is unavailable. Instead of predicting prices, Market Pulse focuses on helping users understand what deserves attention now, while making data freshness and limitations explicit.

## Key Features

- Create and manage a persistent watchlist
- Add and remove stocks
- Prevent duplicate stocks
- Track each user's last-seen state
- Detect meaningful price movements
- Detect unusual volume using historical snapshots
- Categorize changes as:
  - High attention
  - Worth watching
  - New
  - No material change
- Explain why a stock was highlighted
- Store market snapshots for historical comparison
- Handle external API failures using cached data
- Display market-data freshness
- Handle empty watchlists and invalid input

## How It Works

The core flow is:

```text
User opens Market Pulse
        ↓
Fetch watchlist
        ↓
Get latest market data
        ↓
Compare with user's last-seen state
        ↓
Compare volume with recent history
        ↓
Classify meaningful change
        ↓
Explain why the stock was highlighted
```

The user's baseline is only updated when they explicitly click:

**Mark as seen**

Refreshing the dashboard does not reset the baseline.

## Meaningful Change Logic

Market Pulse currently uses the following heuristic:

### High Attention

A stock receives `High attention` when:

- Absolute price movement is at least 5%

OR

- Price movement is at least 3% and unusual volume is detected

### Worth Watching

A stock receives `Worth watching` when:

- Absolute price movement is at least 2%

OR

- Unusual volume is detected

### Normal

If neither condition is met, the stock is classified as:

`No material change`

### New

A newly added stock has no previous user baseline, so it is classified as:

`New`

The system also generates a human-readable reason explaining the classification.

## Architecture

```text
┌─────────────────────────────┐
│          Browser            │
│      Next.js Frontend       │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│       Next.js API Layer     │
├─────────────────────────────┤
│ Watchlist API               │
│ Market API                  │
│ Seen/Baseline API           │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌──────────────┐  ┌─────────────────┐
│ PostgreSQL   │  │ Market Service  │
│              │  │                 │
│ Watchlists   │  │ BharatStock API │
│ User State   │  │                 │
│ Snapshots    │  └─────────────────┘
└──────────────┘
```

The project intentionally uses a modular backend inside a single Next.js application rather than introducing microservices.

This keeps the system simple enough to develop and deploy quickly while maintaining clear boundaries between responsibilities.

## Data Model

The main database entities are:

### User

Stores the application user.

### Watchlist

Represents a user's watchlist.

### WatchlistItem

Stores individual stock symbols in a watchlist.

A unique constraint prevents the same stock from being added twice to the same watchlist.

### UserStockState

Stores the user's personal last-seen baseline:

- Last seen price
- Last seen volume
- Last seen timestamp

This is the key entity for answering:

> What changed since this user last checked?

### MarketSnapshot

Stores historical market observations:

- Symbol
- Price
- Volume
- Timestamp
- Data source

These snapshots are used for historical volume analysis and resilience.

## Reliability

Market data depends on an external provider, so the application does not assume that the provider will always be available.

The market-data flow is:

```text
Request market data
        ↓
Recent database snapshot available?
       / \
     YES  NO
      ↓    ↓
    Cache  BharatStock
             ↓
       Save snapshot
             ↓
       Return market data
```

If the provider fails but an older snapshot exists:

```text
BharatStock unavailable
        ↓
Use saved MarketSnapshot
        ↓
Dashboard continues working
```

The UI identifies when saved data is being used.

This prevents a temporary external API failure from making the entire watchlist unusable.

## Market Data

Market data is provided by BharatStock.

The application currently uses:

- NSE stock data
- End-of-Day prices
- Previous close
- Trading volume

Because the provider supplies EOD data, the application explicitly displays the data freshness rather than presenting it as real-time market data.

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js API Routes
- TypeScript

### Database

- PostgreSQL
- Prisma ORM
- Neon PostgreSQL

### External Data

- BharatStock API

## Project Structure

```text
market-pulse/
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── watchlist/
│   │   │       ├── route.ts
│   │   │       └── [watchlistId]/
│   │   │           ├── items/
│   │   │           │   └── route.ts
│   │   │           ├── market/
│   │   │           │   └── route.ts
│   │   │           └── seen/
│   │   │               └── route.ts
│   │   │
│   │   └── page.tsx
│   │
│   └── lib/
│       ├── api.ts
│       ├── change-engine.ts
│       ├── demo-user.ts
│       ├── prisma.ts
│       └── market/
│           └── twelve-data.ts
│
├── package.json
├── package-lock.json
└── README.md
```

> Note: `twelve-data.ts` is the current filename of the market-data integration module. The implementation uses BharatStock as the external provider.

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd market-pulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL="your-postgresql-connection-string"
BHARATSTOCK_API_KEY="your-bharatstock-api-key"
```

Do not commit `.env` or API keys to GitHub.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

### 6. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## API Endpoints

### Get Watchlists

```text
GET /api/watchlist
```

### Create Watchlist

```text
POST /api/watchlist
```

Example:

```json
{
  "name": "My Watchlist"
}
```

### Add Stock

```text
POST /api/watchlist/{watchlistId}/items
```

Example:

```json
{
  "symbol": "INFY"
}
```

### Remove Stock

```text
DELETE /api/watchlist/{watchlistId}/items
```

Example:

```json
{
  "itemId": "watchlist-item-id"
}
```

### Get Market Data

```text
GET /api/watchlist/{watchlistId}/market
```

### Mark Stocks as Seen

```text
POST /api/watchlist/{watchlistId}/seen
```

## Design Decisions

### Why a personal last-seen state?

The challenge is about understanding what changed since the user last checked.

A global timestamp would not represent individual user behaviour correctly.

Therefore, Market Pulse stores a separate baseline per user and stock.

### Why EOD data?

The application explicitly represents its data as EOD rather than pretending to provide real-time prices.

This makes freshness visible and avoids misleading users.

### Why store market snapshots?

Snapshots provide:

- Historical context
- Volume analysis
- Debugging visibility
- A fallback when the external provider is unavailable

### Why not microservices?

The application does not currently need the operational complexity of microservices.

Clear service boundaries inside one Next.js application provide most of the architectural benefits while keeping deployment and maintenance simple.

## Future Improvements

Possible future improvements include:

- Real-time or delayed intraday market data
- Multiple watchlists per user
- Authentication
- Market-relative movement detection
- More sophisticated volume baselines
- Snapshot retention and aggregation
- Background market-data ingestion
- Automated alerts

These are intentionally not part of the current MVP to keep the system focused on the core problem.

## Security

- API keys are stored in environment variables.
- Secrets are not exposed to the browser.
- Watchlist operations are scoped to the current demo user.
- Duplicate database records are prevented with unique constraints.
- External market-data failures are handled without exposing internal errors to users.