export interface CardSummary {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  imageSmall: string | null;
  setId: string;
  setName: string;
  latestPrice: number | null;
}

export interface CardDetail {
  id: string;
  name: string;
  supertype: string | null;
  subtypes: string[];
  hp: string | null;
  types: string[];
  evolvesFrom: string | null;
  rarity: string | null;
  number: string;
  artist: string | null;
  nationalPokedexNumbers: number[];
  imageSmall: string | null;
  imageLarge: string | null;
  language: string;
  setId: string;
  setName: string;
  setSeries: string;
  latestPrices: PriceSummary[];
}

import type { PriceSummary } from "./price";
