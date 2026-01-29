export type Currency = "ARS" | "USD";

export type Offer = {
  supplier: string;
  url: string;
  currency: Currency;
  price: number;      // precio en moneda original
  priceArs: number;   // siempre ARS final
};
