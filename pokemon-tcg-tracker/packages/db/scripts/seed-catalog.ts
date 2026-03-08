/**
 * Seed script: populates the Set and Card tables from the pokemon-tcg-data GitHub repo.
 *
 * Usage:
 *   pnpm db:seed          (from monorepo root)
 *   npx tsx scripts/seed-catalog.ts  (from packages/db)
 *
 * Data source: https://github.com/PokemonTCG/pokemon-tcg-data
 *   sets/en.json        → array of all English sets
 *   cards/en/<set-id>.json → array of cards per set
 *
 * Design notes:
 *   - Idempotent: uses upsert so safe to re-run
 *   - Cards with missing optional fields are handled gracefully
 *   - Progress is logged to stdout
 *   - Parse errors are collected and reported at the end (don't abort the run)
 */

import { PrismaClient } from "@prisma/client";
import https from "https";
import http from "http";

const prisma = new PrismaClient({
  log: ["error"],
});

// ─────────────────────────────────────────────
// Raw types from pokemon-tcg-data JSON
// ─────────────────────────────────────────────

interface RawSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images?: {
    symbol?: string;
    logo?: string;
  };
}

interface RawCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  rarity?: string;
  number: string;
  artist?: string;
  nationalPokedexNumbers?: number[];
  images?: {
    small?: string;
    large?: string;
  };
  set?: {
    id: string;
  };
}

// ─────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https://") ? https : http;
    const req = protocol.get(url, (res) => {
      // Follow redirects (GitHub raw returns 301/302 sometimes)
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        fetchJson<T>(res.headers.location).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch (err) {
          reject(new Error(`JSON parse error for ${url}: ${String(err)}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

// ─────────────────────────────────────────────
// Batch upsert helpers
// ─────────────────────────────────────────────

const BATCH_SIZE = 50;

async function upsertSets(sets: RawSet[]): Promise<number> {
  let upserted = 0;
  for (const raw of sets) {
    try {
      await prisma.set.upsert({
        where: { id: raw.id },
        create: {
          id: raw.id,
          name: raw.name,
          series: raw.series,
          printedTotal: raw.printedTotal ?? 0,
          total: raw.total ?? 0,
          releaseDate: raw.releaseDate ?? "",
          logoUrl: raw.images?.logo ?? null,
          symbolUrl: raw.images?.symbol ?? null,
          language: "en",
        },
        update: {
          name: raw.name,
          series: raw.series,
          printedTotal: raw.printedTotal ?? 0,
          total: raw.total ?? 0,
          releaseDate: raw.releaseDate ?? "",
          logoUrl: raw.images?.logo ?? null,
          symbolUrl: raw.images?.symbol ?? null,
        },
      });
      upserted++;
    } catch (err) {
      console.error(`  Error upserting set ${raw.id}:`, err);
    }
  }
  return upserted;
}

async function upsertCardsBatch(
  cards: RawCard[],
  setId: string
): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = [];
  let ok = 0;

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (raw) => {
        try {
          await prisma.card.upsert({
            where: { id: raw.id },
            create: {
              id: raw.id,
              name: raw.name,
              supertype: raw.supertype ?? null,
              subtypes: raw.subtypes ?? [],
              hp: raw.hp ?? null,
              types: raw.types ?? [],
              evolvesFrom: raw.evolvesFrom ?? null,
              rarity: raw.rarity ?? null,
              number: raw.number,
              artist: raw.artist ?? null,
              nationalPokedexNumbers: raw.nationalPokedexNumbers ?? [],
              imageSmall: raw.images?.small ?? null,
              imageLarge: raw.images?.large ?? null,
              language: "en",
              setId,
            },
            update: {
              name: raw.name,
              supertype: raw.supertype ?? null,
              subtypes: raw.subtypes ?? [],
              hp: raw.hp ?? null,
              types: raw.types ?? [],
              evolvesFrom: raw.evolvesFrom ?? null,
              rarity: raw.rarity ?? null,
              number: raw.number,
              artist: raw.artist ?? null,
              nationalPokedexNumbers: raw.nationalPokedexNumbers ?? [],
              imageSmall: raw.images?.small ?? null,
              imageLarge: raw.images?.large ?? null,
            },
          });
          ok++;
        } catch (err) {
          const msg = `card ${raw.id} in set ${setId}: ${String(err)}`;
          errors.push(msg);
        }
      })
    );
  }

  return { ok, errors };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

const BASE_URL =
  "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";

async function main(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Pokémon TCG — Catalog Seed");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Fetch sets
  console.log("\n[1/3] Fetching sets from pokemon-tcg-data...");
  const sets = await fetchJson<RawSet[]>(`${BASE_URL}/sets/en.json`);
  console.log(`      Found ${sets.length} sets.`);

  // 2. Upsert sets
  console.log("\n[2/3] Upserting sets...");
  const setsUpserted = await upsertSets(sets);
  console.log(`      ✓ ${setsUpserted}/${sets.length} sets upserted.`);

  // 3. Fetch and upsert cards per set
  console.log("\n[3/3] Fetching and upserting cards by set...");
  let totalCards = 0;
  let totalOk = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    process.stdout.write(
      `      [${String(i + 1).padStart(3)}/${sets.length}] ${set.name.padEnd(40)}`
    );

    let cards: RawCard[];
    try {
      cards = await fetchJson<RawCard[]>(
        `${BASE_URL}/cards/en/${set.id}.json`
      );
    } catch (err) {
      process.stdout.write(`  ✗ fetch error: ${String(err)}\n`);
      allErrors.push(`set ${set.id}: fetch error: ${String(err)}`);
      continue;
    }

    const { ok, errors } = await upsertCardsBatch(cards, set.id);
    totalCards += cards.length;
    totalOk += ok;
    allErrors.push(...errors);

    const statusIcon = errors.length === 0 ? "✓" : "⚠";
    process.stdout.write(
      `  ${statusIcon} ${ok}/${cards.length} cards\n`
    );
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Seed Complete");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Sets:   ${setsUpserted}/${sets.length}`);
  console.log(`  Cards:  ${totalOk}/${totalCards}`);
  console.log(`  Errors: ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.log("\nParse/upsert errors:");
    allErrors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
    if (allErrors.length > 20) {
      console.log(`  ... and ${allErrors.length - 20} more`);
    }
  }
}

main()
  .catch((err) => {
    console.error("\nFatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
