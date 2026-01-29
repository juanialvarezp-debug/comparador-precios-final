export type PriceResult = {
  supplier: string;
  title: string;
  priceArs: number;
  originalPrice: number;
  currency: "ARS" | "USD";
  url: string;
  thumbnail?: string;
};
