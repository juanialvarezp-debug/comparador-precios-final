
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

  // ESTRATEGIA DE VELOCIDAD V18.6
  // Simplificamos los términos para que los buscadores no tarden una eternidad
  const searchTerm = modelNum || raw;

  const providers = [
    { name: "Precialo", fn: searchPrecialo },
    { name: "MercadoLibre", fn: searchMercadoLibre },
    { name: "HardGamers", fn: searchHardGamers },
    { name: "Venex", fn: searchVenex },
    { name: "CompraGamer", fn: searchCompraGamer }
  ];

  // Ejecutamos todo en paralelo con timeout de seguridad
  const resultsArr = await Promise.allSettled(
    providers.map(p => p.fn(searchTerm, 20))
  );

  const combined: PriceResult[] = [];
  const debug: any = {};

  resultsArr.forEach((res, i) => {
    const sourceName = providers[i].name;
    if (res.status === "fulfilled") {
      debug[sourceName] = res.value.length;
      combined.push(...res.value);
    } else {
      debug[sourceName] = "timeout";
    }
  });

  // Auditoría Final (V18.6)
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
