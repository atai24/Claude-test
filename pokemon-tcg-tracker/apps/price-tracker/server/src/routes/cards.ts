import { Router } from "express";
import { prisma } from "@pokemon-tcg/db";
import { AppError } from "../middleware/errorHandler";
import type {
  CardDetail,
  CardSummary,
  PaginatedResponse,
  PriceSummary,
  PriceHistoryEntry,
} from "@pokemon-tcg/shared";
import type { PriceSource, CardCondition } from "@pokemon-tcg/db";

export const cardsRouter = Router();

/**
 * GET /api/cards/search?q=&set=&rarity=&page=&pageSize=
 * Search cards by name (fuzzy), optional set and rarity filters.
 */
cardsRouter.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query["q"] ?? "").trim();
    const setFilter = String(req.query["set"] ?? "").trim() || undefined;
    const rarityFilter = String(req.query["rarity"] ?? "").trim() || undefined;
    const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query["pageSize"] ?? "20"), 10))
    );
    const skip = (page - 1) * pageSize;

    const where = {
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(setFilter ? { setId: setFilter } : {}),
      ...(rarityFilter ? { rarity: rarityFilter } : {}),
    };

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          number: true,
          rarity: true,
          imageSmall: true,
          setId: true,
          set: { select: { name: true } },
          priceSnapshots: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { price: true },
          },
        },
      }),
      prisma.card.count({ where }),
    ]);

    const data: CardSummary[] = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity,
      imageSmall: c.imageSmall,
      setId: c.setId,
      setName: c.set.name,
      latestPrice: c.priceSnapshots[0]
        ? Number(c.priceSnapshots[0].price)
        : null,
    }));

    const response: PaginatedResponse<CardSummary> = {
      data,
      total,
      page,
      pageSize,
      hasMore: skip + data.length < total,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/:cardId
 * Card detail with latest price snapshots per source/condition.
 */
cardsRouter.get("/:cardId", async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        set: {
          select: { name: true, series: true },
        },
        priceSnapshots: {
          orderBy: { recordedAt: "desc" },
          take: 20, // enough to get latest per source+condition combo
        },
      },
    });

    if (!card) {
      throw new AppError(404, `Card '${cardId}' not found`);
    }

    // Deduplicate: keep latest snapshot per source+condition pair
    const seen = new Set<string>();
    const latestPrices: PriceSummary[] = [];
    for (const snap of card.priceSnapshots) {
      const key = `${snap.source}:${snap.condition}`;
      if (!seen.has(key)) {
        seen.add(key);
        latestPrices.push({
          source: snap.source as PriceSource,
          condition: snap.condition as CardCondition,
          price: Number(snap.price),
          currency: snap.currency,
          recordedAt: snap.recordedAt.toISOString(),
        });
      }
    }

    const response: CardDetail = {
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      subtypes: card.subtypes,
      hp: card.hp,
      types: card.types,
      evolvesFrom: card.evolvesFrom,
      rarity: card.rarity,
      number: card.number,
      artist: card.artist,
      nationalPokedexNumbers: card.nationalPokedexNumbers,
      imageSmall: card.imageSmall,
      imageLarge: card.imageLarge,
      language: card.language,
      setId: card.setId,
      setName: card.set.name,
      setSeries: card.set.series,
      latestPrices,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/:cardId/price-history
 * All price snapshots sorted by recordedAt desc.
 * Query params: source, condition, limit (default 100)
 */
cardsRouter.get("/:cardId/price-history", async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const sourceFilter = String(req.query["source"] ?? "").trim() || undefined;
    const conditionFilter =
      String(req.query["condition"] ?? "").trim() || undefined;
    const limit = Math.min(
      500,
      Math.max(1, parseInt(String(req.query["limit"] ?? "100"), 10))
    );

    // Verify card exists
    const cardExists = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true },
    });
    if (!cardExists) {
      throw new AppError(404, `Card '${cardId}' not found`);
    }

    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        cardId,
        ...(sourceFilter ? { source: sourceFilter as PriceSource } : {}),
        ...(conditionFilter
          ? { condition: conditionFilter as CardCondition }
          : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });

    const response: PriceHistoryEntry[] = snapshots.map((snap) => ({
      id: snap.id,
      source: snap.source as PriceSource,
      condition: snap.condition as CardCondition,
      price: Number(snap.price),
      currency: snap.currency,
      recordedAt: snap.recordedAt.toISOString(),
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
});
