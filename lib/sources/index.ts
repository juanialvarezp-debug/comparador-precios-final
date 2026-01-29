
import { PriceResult } from "./types";
import { dedupeByUrl } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { searchVenex } from "./stores/venex";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number, debug?: any }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelMatch = raw.match(/\d{3,5}/);
  const model = modelMatch ? modelMatch[0] : "";

  // Búsqueda en ráfaga Multi-Tienda
  const tasks = [
    { name: "Precialo", promise: searchPrecialo(model || raw, 30) },
    { name: "MercadoLibre", promise: searchMercadoLibre(model || raw, 20) },
    { name: "HardGamers", promise: searchHardGamers(model || raw, 20) },
    { name: "Venex", promise: searchVenex(model || raw, 20) }
  ];

  const resultsArr = await Promise.allSettled(tasks.map(t => t.promise));
  const combined: PriceResult[] = [];
  const debug: any = {};

  resultsArr.forEach((res, i) => {
    const sourceName = tasks[i].name;
    if (res.status === "fulfilled") {
      debug[sourceName] = res.value.length;
      combined.push(...res.value);
    } else {
      debug[sourceName] = "error";
    }
  });

  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => {
    const t = item.title.toUpperCase();
    // Si no hay modelo, dejamos pasar todo. Si hay, debe estar en el título.
    return model ? t.includes(model) : true;
  });

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate,
    debug
  };
}
