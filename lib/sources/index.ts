
import { PriceResult } from "./types";
import { dedupeByUrl, pnMatchesTitle } from "./utils";
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

  // ESTRATEGIA DE PRECISIÓN V18.2: 
  // Usamos el término completo para Precialo y ML (para encontrar piezas exactas)
  // Usamos el modelo para HardGamers y Venex (que son más caprichosos con los códigos largos)
  const exactTerm = raw;
  const modelTerm = modelNum || raw;

  const tasks = [
    { name: "Precialo", promise: searchPrecialo(exactTerm, 30) }, // Buscamos EXACTO
    { name: "MercadoLibre", promise: searchMercadoLibre(exactTerm, 20) }, // Buscamos EXACTO
    { name: "HardGamers", promise: searchHardGamers(modelTerm, 20) }, // Backup por modelo
    { name: "Venex", promise: searchVenex(modelTerm, 20) },
    { name: "CompraGamer", promise: searchCompraGamer(modelTerm, 20) }
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

  // Auditoría Final: ¿El resultado coincide semánticamente con lo pedido?
  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => pnMatchesTitle(partNumber, item.title));

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate,
    debug
  };
}
