
import { PriceResult } from "./types";
import { dedupeByUrl, pnMatchesTitle } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelMatch = raw.match(/\d{3,5}/);
  const model = modelMatch ? modelMatch[0] : "";

  // Ráfaga de búsqueda en 3 dimensiones
  const tasks = [
    searchPrecialo(raw, 40),
    searchMercadoLibre(raw, 20),
    searchHardGamers(model, 30), // Búsqueda de respaldo solo por modelo
    searchHardGamers(raw, 20)
  ];

  const resultsArr = await Promise.allSettled(tasks);
  const combined: PriceResult[] = [];

  resultsArr.forEach(res => {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  });

  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => pnMatchesTitle(partNumber, item.title));

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);
  return { results: final.slice(0, limit), usdRate };
}
