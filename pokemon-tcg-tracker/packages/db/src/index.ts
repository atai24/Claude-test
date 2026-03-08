import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client.
 * In development, reuse across hot-reloads to avoid exhausting connection pool.
 */
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export { PrismaClient };
export type {
  Set,
  Card,
  CardVariant,
  PriceSnapshot,
  EbayListing,
  UserCollection,
  PriceSource,
  CardCondition,
} from "@prisma/client";
