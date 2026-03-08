export interface SetSummary {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  logoUrl: string | null;
  symbolUrl: string | null;
}

export interface SetDetail extends SetSummary {
  printedTotal: number;
  total: number;
  cardCount: number;
}
