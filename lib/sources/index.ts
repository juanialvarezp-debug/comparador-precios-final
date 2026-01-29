
import { PriceResult } from "./types";
import { dedupeByUrl } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { searchVenex } from "./stores/venex";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelMatch = raw.match(/\d{3,5}/);
  const model = modelMatch ? modelMatch[0] : "";

  // Simplificamos al máximo para saltar bloqueos
  const term = model || raw;

  const tasks = [
    searchPrecialo(term, 30),
    searchMercadoLibre(term, 20),
    searchHardGamers(term, 20),
    searchVenex(term, 20)
  ];

  const resultsArr = await Promise.allSettled(tasks);
  const combined: PriceResult[] = [];

  resultsArr.forEach(res => {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  });

  // Filtro final inclusivo
  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => {
    const t = item.title.toUpperCase();
    return model ? t.includes(model) : true;
  });

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);
  return { results: final.slice(0, limit), usdRate };
}
