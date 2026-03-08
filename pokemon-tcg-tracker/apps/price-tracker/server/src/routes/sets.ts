import { Router } from "express";
import { prisma } from "@pokemon-tcg/db";
import { AppError } from "../middleware/errorHandler";
import type { SetSummary, SetDetail, PaginatedResponse, CardSummary } from "@pokemon-tcg/shared";

export const setsRouter = Router();

/**
 * GET /api/sets
 * List all sets ordered by releaseDate desc.
 */
setsRouter.get("/", async (_req, res, next) => {
  try {
    const sets = await prisma.set.findMany({
      orderBy: { releaseDate: "desc" },
      select: {
        id: true,
        name: true,
        series: true,
        releaseDate: true,
        logoUrl: true,
        symbolUrl: true,
      },
    });

    const response: SetSummary[] = sets.map((s) => ({
      id: s.id,
      name: s.name,
      series: s.series,
      releaseDate: s.releaseDate,
      logoUrl: s.logoUrl,
      symbolUrl: s.symbolUrl,
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sets/:setId
 * Set detail with card count.
 */
setsRouter.get("/:setId", async (req, res, next) => {
  try {
    const { setId } = req.params;

    const set = await prisma.set.findUnique({
      where: { id: setId },
      include: {
        _count: { select: { cards: true } },
      },
    });

    if (!set) {
      throw new AppError(404, `Set '${setId}' not found`);
    }

    const response: SetDetail = {
      id: set.id,
      name: set.name,
      series: set.series,
      printedTotal: set.printedTotal,
      total: set.total,
      releaseDate: set.releaseDate,
      logoUrl: set.logoUrl,
      symbolUrl: set.symbolUrl,
      cardCount: set._count.cards,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sets/:setId/cards
 * Paginated card list for a set.
 * Query params: page (default 1), pageSize (default 50)
 */
setsRouter.get("/:setId/cards", async (req, res, next) => {
  try {
    const { setId } = req.params;
    const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query["pageSize"] ?? "50"), 10))
    );
    const skip = (page - 1) * pageSize;

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where: { setId },
        skip,
        take: pageSize,
        orderBy: [{ number: "asc" }],
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
      prisma.card.count({ where: { setId } }),
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
