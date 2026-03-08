# Pokémon TCG Price Tracker

A Turborepo monorepo for tracking Pokémon TCG card prices and browsing the full card catalog.

## Packages

| Package | Description |
|---------|-------------|
| `packages/db` | Prisma schema, migrations, seed pipeline |
| `packages/shared` | Shared TypeScript types |
| `packages/tsconfig` | Shared TS config presets |
| `apps/price-tracker/server` | Node.js + Express API |
| `apps/price-tracker/client` | React + Vite frontend |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL database

### Install

```bash
pnpm install
```

### Configure Environment

```bash
cp .env.example .env
# Edit DATABASE_URL in .env
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed the card catalog from pokemon-tcg-data
pnpm db:seed
```

### Development

```bash
# Start all apps
pnpm dev

# Or individually:
cd apps/price-tracker/server && pnpm dev   # API on :3001
cd apps/price-tracker/client && pnpm dev   # Frontend on :5173
```

## API Endpoints

```
GET  /api/sets                          List all sets
GET  /api/sets/:setId                   Set detail + card count
GET  /api/sets/:setId/cards             Paginated card list (page, pageSize)
GET  /api/cards/search?q=&set=&rarity=  Search cards
GET  /api/cards/:cardId                 Card detail + latest prices
GET  /api/cards/:cardId/price-history   Price history (source, condition, limit)
```

## Architecture

### Schema Design Principles

- **Card catalog is read-only** — `Set` and `Card` are seeded once and never written by app UI.
- **Prices are append-only** — `PriceSnapshot` and `EbayListing` rows are only ever inserted. Queries use `ORDER BY recordedAt DESC LIMIT 1` for current price.
- **Collection layer is extensible** — `UserCollection` is designed for the future storage organizer app, which will add `StorageBox` + `StorageSlot` and FK columns.

### Extension Points for Price Agents

External agents (running on a Mac mini) can write price data directly to the database:

```typescript
// Insert a new price snapshot
await prisma.priceSnapshot.create({
  data: {
    cardId: "base1-4",         // Card ID from the catalog
    source: "TCGPLAYER",       // TCGPLAYER | EBAY | CARDMARKET
    condition: "NEAR_MINT",    // See CardCondition enum
    price: 12.50,
    currency: "USD",
  }
});

// Insert an eBay sold listing
await prisma.ebayListing.create({
  data: {
    itemId: "ebay-12345",
    cardId: "base1-4",
    title: "Charizard Base Set Holo",
    soldPrice: 350.00,
    soldAt: new Date(),
    listingUrl: "https://ebay.com/itm/12345",
  }
});
```

## Future Apps

- `apps/storage-organizer` — Physical card storage tracker (will extend `UserCollection` with `StorageBox`/`StorageSlot`)
- `packages/price-agent` — eBay + TCGPlayer price scraper (runs on Mac mini)
