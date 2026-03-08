export type PriceSource = "TCGPLAYER" | "EBAY" | "CARDMARKET";

export type CardCondition =
  | "NEAR_MINT"
  | "LIGHTLY_PLAYED"
  | "MODERATELY_PLAYED"
  | "HEAVILY_PLAYED"
  | "DAMAGED"
  | "GRADED";

export interface PriceSummary {
  source: PriceSource;
  condition: CardCondition;
  price: number;
  currency: string;
  recordedAt: string;
}

export interface PriceHistoryEntry extends PriceSummary {
  id: string;
}

export interface EbayListing {
  id: string;
  itemId: string;
  cardId: string;
  title: string;
  soldPrice: number;
  condition: string | null;
  isGraded: boolean;
  grader: string | null;
  grade: string | null;
  soldAt: string;
  listingUrl: string;
}
