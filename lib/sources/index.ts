
import { PriceResult } from "./types";
import { dedupeByUrl } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { searchVenex } from "./stores/venex";
import { searchCompraGamer } from "./stores/compragamer";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number, debug?: any }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelNum = raw.match(/\d{3,5}/)?.[0] || "";
  const isSuper = raw.includes("SUPER") || raw.includes("1660S");

  let searchTerm = modelNum;
  if (isSuper) searchTerm += " super";
  if (!searchTerm || searchTerm.length < 3) searchTerm = raw;

  const tasks = [
    { name: "Precialo", promise: searchPrecialo(searchTerm, 20) },
    { name: "MercadoLibre", promise: searchMercadoLibre(searchTerm, 20) },
    { name: "HardGamers", promise: searchHardGamers(searchTerm, 20) },
    { name: "Venex", promise: searchVenex(searchTerm, 20) },
    { name: "CompraGamer", promise: searchCompraGamer(searchTerm, 20) }
  ];

  const resultsArr = await Promise.allSettled(tasks.map(t => t.promise));
  const combined: PriceResult[] = [];
  const debug: any = {};

  resultsArr.forEach((res, i) => {
    const sourceName = tasks[i].name;
    if (res.status === "fulfilled") {
      debug[sourceName] = res.value.length;
      combined.push(...res.value);
    }
  });

  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => {
    const t = item.title.toUpperCase();
    if (modelNum && !t.includes(modelNum)) return false;

    // El auditor es clave para no mostrar basura (ej: si buscamos 1660S, no mostrar 1660 común)
    if (isSuper && !t.includes("SUPER") && !t.includes(modelNum + "S")) return false;

    return true;
  });

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate,
    debug
  };
}
