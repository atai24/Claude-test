export type CollectionCondition =
  | "NEAR_MINT"
  | "LIGHTLY_PLAYED"
  | "MODERATELY_PLAYED"
  | "HEAVILY_PLAYED"
  | "DAMAGED"
  | "GRADED";

export interface CollectionEntry {
  id: string;
  userId: string;
  cardId: string;
  variantId: string | null;
  quantity: number;
  condition: CollectionCondition;
  acquiredAt: string | null;
  acquiredPrice: number | null;
  notes: string | null;
}
