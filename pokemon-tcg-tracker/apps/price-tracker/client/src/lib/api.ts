import type {
  SetSummary,
  SetDetail,
  CardSummary,
  CardDetail,
  PaginatedResponse,
  PriceHistoryEntry,
} from "@pokemon-tcg/shared";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  sets: {
    list: () => get<SetSummary[]>("/api/sets"),
    get: (setId: string) => get<SetDetail>(`/api/sets/${setId}`),
    cards: (setId: string, page = 1, pageSize = 50) =>
      get<PaginatedResponse<CardSummary>>(
        `/api/sets/${setId}/cards?page=${page}&pageSize=${pageSize}`
      ),
  },
  cards: {
    search: (params: {
      q?: string;
      set?: string;
      rarity?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.set) qs.set("set", params.set);
      if (params.rarity) qs.set("rarity", params.rarity);
      if (params.page) qs.set("page", String(params.page));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      return get<PaginatedResponse<CardSummary>>(`/api/cards/search?${qs}`);
    },
    get: (cardId: string) => get<CardDetail>(`/api/cards/${cardId}`),
    priceHistory: (
      cardId: string,
      params?: { source?: string; condition?: string; limit?: number }
    ) => {
      const qs = new URLSearchParams();
      if (params?.source) qs.set("source", params.source);
      if (params?.condition) qs.set("condition", params.condition);
      if (params?.limit) qs.set("limit", String(params.limit));
      return get<PriceHistoryEntry[]>(
        `/api/cards/${cardId}/price-history?${qs}`
      );
    },
  },
};
