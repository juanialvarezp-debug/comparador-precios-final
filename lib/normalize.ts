import { Offer } from "./types";

export function toArs(offer: Omit<Offer, "priceArs">, bnaUsdSell: number): Offer {
  const priceArs = offer.currency === "ARS" ? offer.price : offer.price * bnaUsdSell;
  return { ...offer, priceArs };
}

export function sortAndTakeTop(offers: Offer[], limit: number): Offer[] {
  return offers
    .filter(o => Number.isFinite(o.priceArs) && o.priceArs > 0)
    .sort((a, b) => a.priceArs - b.priceArs)
    .slice(0, limit);
}
